import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { VectorStore } from './vectorStore';
import { Document } from 'langchain/document';
import logger from '../utils/logger';
import { BookChunk } from '../types/types';
import {
  BookConfig,
  BookPageDto,
  calculateHash,
  findChunksToUpdateAndRemove,
  MarkdownSection,
  processMarkdownFiles,
} from './shared';
import { splitMarkdownIntoSections } from './cairoBookIngester';

// Configuration
const STARKNET_DOCS_CONFIG: BookConfig = {
  repoOwner: 'starknet-io',
  repoName: 'starknet-docs',
  fileExtension: '.adoc',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://docs.starknet.io/',
};

// Main ingestion function
export const ingestStarknetDocs = async (vectorStore: VectorStore) => {
  try {
    const pages = await downloadAndExtractStarknetDocs();
    const chunks = await createChunks(pages);
    await updateVectorStore(vectorStore, chunks);
    await cleanupDownloadedFiles();
  } catch (error) {
    handleError(error);
  }
};

// Helper functions
async function downloadAndExtractStarknetDocs(): Promise<BookPageDto[]> {
  logger.info('Downloading and extracting Starknet Docs');
  const latestTag = await getLatestTag();
  const zipData = await downloadSourceCode(latestTag);
  const extractDir = await extractZipContent(zipData, latestTag);
  const targetDir = path.join(__dirname, 'starknet-docs-restructured');
  const restructuredDir = await restructureDocumentation(extractDir, targetDir);
  return await processMarkdownFiles(STARKNET_DOCS_CONFIG, restructuredDir);
}

async function getLatestTag(): Promise<string> {
  const latestTagUrl = `https://api.github.com/repos/${STARKNET_DOCS_CONFIG.repoOwner}/${STARKNET_DOCS_CONFIG.repoName}/releases/latest`;
  const tagResponse = await axios.get(latestTagUrl);
  const latestTag = tagResponse.data.tag_name;
  if (!latestTag) throw new Error('Latest tag not found.');
  return latestTag;
}

async function downloadSourceCode(latestTag: string): Promise<Buffer> {
  const sourceUrl = `https://github.com/${STARKNET_DOCS_CONFIG.repoOwner}/${STARKNET_DOCS_CONFIG.repoName}/archive/refs/tags/${latestTag}.zip`;
  logger.info(`Downloading source code from ${sourceUrl}`);
  const zipResponse = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
  });
  return zipResponse.data;
}

async function extractZipContent(
  zipData: Buffer,
  latestTag: string,
): Promise<string> {
  const zipFile = new AdmZip(zipData);
  const extractDir = path.join(__dirname, 'starknet-docs');
  await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(extractDir, { recursive: true });

  const targetPath = `starknet-docs-${latestTag.replace('v', '')}/components/Starknet/modules/`;
  await extractTargetContent(zipFile, targetPath, extractDir);

  logger.info('Extracted Starknet modules content successfully.');
  return extractDir;
}

async function extractTargetContent(
  zipFile: AdmZip,
  targetPath: string,
  extractDir: string,
) {
  const entries = zipFile.getEntries();
  for (const entry of entries) {
    if (entry.entryName.startsWith(targetPath)) {
      const relativePath = entry.entryName.slice(targetPath.length);
      const fullPath = path.join(extractDir, relativePath);
      if (entry.isDirectory) {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        const parentDir = path.dirname(fullPath);
        await fs.mkdir(parentDir, { recursive: true });
        await fs.writeFile(fullPath, entry.getData());
      }
    }
  }
}

export async function restructureDocumentation(
  extractDir: string,
  targetDir: string,
): Promise<string> {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  const hasRelevantFiles = await restructureFiles(extractDir, targetDir);

  if (!hasRelevantFiles) {
    // If no relevant files were found, remove the created target directory
    console.log(
      `No relevant files found in ${extractDir}, removing target directory ${targetDir}`,
    );
    await fs.rmdir(targetDir, { recursive: true });
  }

  return targetDir;
}

async function restructureFiles(
  sourceDir: string,
  targetDir: string,
): Promise<boolean> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  let hasRelevantFiles = false;

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    let targetPath = path.join(
      targetDir,
      entry.name.toLowerCase().replace(/_/g, '-'),
    );

    if (entry.isDirectory()) {
      if (entry.name === 'pages') {
        // If the directory is named 'pages', copy its contents directly to the parent
        const subDirHasRelevantFiles = await restructureFiles(
          sourcePath,
          targetDir,
        );
        if (subDirHasRelevantFiles) {
          hasRelevantFiles = true;
        }
      } else {
        const subDirHasRelevantFiles = await restructureFiles(
          sourcePath,
          targetPath,
        );
        if (subDirHasRelevantFiles) {
          hasRelevantFiles = true;
        }
      }
    } else if (
      entry.isFile() &&
      path.extname(entry.name) === STARKNET_DOCS_CONFIG.fileExtension
    ) {
      if (entry.name.toLowerCase() === 'nav.adoc') {
        continue;
      }
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
      hasRelevantFiles = true;
    }
  }

  return hasRelevantFiles;
}

async function createChunks(
  pages: BookPageDto[],
): Promise<Document<BookChunk>[]> {
  logger.info('Creating chunks from book pages based on markdown sections');
  return pages.flatMap((page) =>
    splitMarkdownIntoSections(page.content).map((section, index) =>
      createChunk(page, section, index),
    ),
  );
}

function createChunk(
  page: BookPageDto,
  section: MarkdownSection,
  index: number,
): Document<BookChunk> {
  const hash = calculateHash(section.content);
  return new Document<BookChunk>({
    pageContent: section.content,
    metadata: {
      name: page.name,
      title: section.title,
      chunkNumber: index,
      contentHash: hash,
      uniqueId: `${page.name}-${index}`,
      sourceLink: `${STARKNET_DOCS_CONFIG.baseUrl}/${page.name}.html#${createAnchor(section.title)}`,
    },
  });
}

function createAnchor(title: string | undefined): string {
  return title
    ? title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
    : '';
}

async function updateVectorStore(
  vectorStore: VectorStore,
  chunks: Document<BookChunk>[],
) {
  const storedChunkHashes = await vectorStore.getStoredBookPagesHashes();
  const { chunksToUpdate, chunksToRemove } = findChunksToUpdateAndRemove(
    chunks,
    storedChunkHashes,
  );
  logger.info(
    `Found ${chunksToUpdate.length} chunks to update and ${chunksToRemove.length} chunks to remove`,
  );

  if (chunksToRemove.length > 0) {
    await vectorStore.removeBookPages(chunksToRemove);
  }
  if (chunksToUpdate.length > 0) {
    await vectorStore.addDocuments(
      chunksToUpdate,
      chunksToUpdate.map((chunk) => chunk.metadata.uniqueId),
    );
  }

  logger.info(
    `Updated ${chunksToUpdate.length} chunks and removed ${chunksToRemove.length} chunks.`,
  );
}

async function cleanupDownloadedFiles() {
  const extractDir = path.join(__dirname, 'starknet-docs');
  await fs.rm(extractDir, { recursive: true, force: true });
  logger.info(`Deleted downloaded markdown files from ${extractDir}`);

  const extractDir2 = path.join(__dirname, 'starknet-docs-restructured');
  await fs.rm(extractDir2, { recursive: true, force: true });
  logger.info(`Deleted restructured markdown files from ${extractDir2}`);
}

function handleError(error: unknown) {
  console.error('Error processing Starknet Docs:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
  throw error;
}

// ... (keep the existing exports if needed) ...
