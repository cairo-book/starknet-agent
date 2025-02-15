import * as fs from 'fs/promises';
import * as path from 'path';
import downdoc from 'downdoc';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { VectorStore } from '../db/vectorStore';
import { Document } from 'langchain/document';
import logger from '../utils/logger';
import { BookChunk } from '../types/types';
import {
  addSectionWithSizeLimit,
  BookConfig,
  BookPageDto,
  calculateHash,
  createAnchor,
  findChunksToUpdateAndRemove,
  MAX_SECTION_SIZE,
  ParsedSection,
  processDocFiles,
} from './shared';
import { splitMarkdownIntoSections } from './cairoBookIngester';

// Configuration
const STARKNET_DOCS_CONFIG: BookConfig = {
  repoOwner: 'starknet-io',
  repoName: 'starknet-docs',
  fileExtension: '.adoc',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://docs.starknet.io',
};

const DOCS_COMMON_CONFIG: BookConfig = {
  repoOwner: 'starknet-io',
  repoName: 'docs-common-content',
  fileExtension: '.adoc',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://docs.starknet.io',
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
export async function downloadAndExtractStarknetDocs(): Promise<BookPageDto[]> {
  logger.info('Downloading and extracting Starknet Docs');
  // Run Antora to generate the documentation
  logger.info('Running Antora to link documentation');
  const antoraCommand = 'antora playbook.yml';

  try {
    const { execSync } = require('child_process');
    execSync(antoraCommand, { cwd: __dirname, stdio: 'inherit' });
    logger.info('Antora documentation generation completed successfully');
  } catch (error) {
    logger.error('Error running Antora:', error);
    throw error;
  } finally {
    await fs.rm(path.join(__dirname, 'build'), {
      recursive: true,
      force: true,
    });
  }

  const outputDir = path.join(__dirname, 'antora-output');
  const targetDir = path.join(__dirname, 'starknet-docs-restructured');
  await restructureDocumentation(outputDir, targetDir);
  return await processDocFiles(STARKNET_DOCS_CONFIG, targetDir);
}

async function mergeDocsCommonContent(
  docsCommonContentDir: string,
  mergeDir: string,
) {
  console.log('Merging Docs Common Content into Starknet Docs');
  const entries = await fs.readdir(docsCommonContentDir, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sourcePath = path.join(docsCommonContentDir, entry.name);
      const targetPath = path.join(mergeDir, entry.name);
      await fs.cp(sourcePath, targetPath, { recursive: true });
    }
  }
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

async function downloadDocsCommonContent(): Promise<Buffer> {
  const sourceUrl = `https://github.com/${DOCS_COMMON_CONFIG.repoOwner}/${DOCS_COMMON_CONFIG.repoName}/archive/refs/heads/main.zip`;
  logger.info(`Downloading source code from ${sourceUrl}`);
  const zipResponse = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
  });
  return zipResponse.data;
}

async function extractZipContent(
  extractDir: string,
  pathToExtract: string,
  zipData: Buffer,
  latestTag?: string,
): Promise<string> {
  const zipFile = new AdmZip(zipData);
  await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(extractDir, { recursive: true });

  await extractTargetContent(zipFile, pathToExtract, extractDir);

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

export function splitAsciiDocIntoSections(
  content: string,
  split: boolean = false,
): ParsedSection[] {
  // Trim and convert code blocks regardless of mode
  content = content.trim();
  content = convertCodeBlocks(content);

  if (!split) {
    // Single section mode - treat entire content as one section
    const headerRegex = /^(?:\[#([^\]]+)\]\s*\n)?(=+)\s+(.+)$/m;
    const match = headerRegex.exec(content);
    const sections: ParsedSection[] = [];

    if (match) {
      const title = match[3];
      const anchor = match[1]; // Use custom anchor if present
      const markdownContent = downdoc(content);
      if (markdownContent) {
        addSectionWithSizeLimit(
          sections,
          title,
          markdownContent,
          MAX_SECTION_SIZE,
          anchor || createAnchor(title),
        );
      }
    }
    return sections;
  }

  // Split mode - divide content into multiple sections
  const headerRegex = /^(?:\[#([^\]]+)\]\s*\n)?(=+)\s+(.+)$/gm;
  const sections: ParsedSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';
  let lastAnchor: string | undefined;
  let match;

  // Trim the content to remove leading/trailing whitespace
  content = content.trim();

  // Convert AsciiDoc code blocks to Markdown code blocks
  content = convertCodeBlocks(content);

  while ((match = headerRegex.exec(content)) !== null) {
    if (!isInsideCodeBlock(content, match.index)) {
      if (lastIndex < match.index) {
        const sectionContent = content.slice(lastIndex, match.index).trim();
        const markdownContent = downdoc(sectionContent);
        if (markdownContent) {
          addSectionWithSizeLimit(
            sections,
            lastTitle,
            markdownContent,
            MAX_SECTION_SIZE,
            lastAnchor,
          );
        }
      }
      lastAnchor = match[1]; // Capture the custom anchor if present
      lastTitle = match[3];
      lastIndex = match.index + match[0].length;
    }
  }

  // Add the last section
  if (lastIndex < content.length) {
    const sectionContent = content.slice(lastIndex).trim();
    if (sectionContent) {
      const markdownContent = downdoc(sectionContent);
      if (markdownContent) {
        addSectionWithSizeLimit(
          sections,
          lastTitle,
          markdownContent,
          MAX_SECTION_SIZE,
          lastAnchor,
        );
      }
    }
  }

  return sections;
}

export function convertCodeBlocks(content: string): string {
  // Case 1: With language specification
  const languageCodeBlockRegex = /^\[source,(\w+)\]\s*^----$([\s\S]*?)^----$/gm;
  content = content.replace(
    languageCodeBlockRegex,
    (match, language, codeContent) => {
      return convertCodeBlock(codeContent, language);
    },
  );

  // Case 2: No language specification
  const simpleCodeBlockRegex = /^----$([\s\S]*?)^----$/gm;
  content = content.replace(simpleCodeBlockRegex, (match, codeContent) => {
    return convertCodeBlock(codeContent);
  });

  return content;
}

function convertCodeBlock(codeContent: string, language: string = ''): string {
  // Remove only the leading and trailing newline characters
  codeContent = codeContent.replace(/^\n|\n$/g, '');

  return '```' + language + '\n' + codeContent + '\n```';
}

function isInsideCodeBlock(content: string, index: number): boolean {
  const codeBlockRegex = /^(----|\`\`\`)$/gm;
  let isInside = false;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index >= index) {
      break;
    }
    isInside = !isInside;
  }

  return isInside;
}

// Update the createChunks function
export async function createChunks(
  pages: BookPageDto[],
): Promise<Document<BookChunk>[]> {
  logger.info('Creating chunks from book pages based on AsciiDoc sections');
  return pages.flatMap((page) =>
    splitAsciiDocIntoSections(page.content, true).flatMap((section, index) =>
      createChunk(page, section, index),
    ),
  );
}

function createChunk(
  page: BookPageDto,
  section: ParsedSection,
  index: number,
): Document<BookChunk> {
  const hash = calculateHash(section.content);
  const anchor = section.anchor ? section.anchor : createAnchor(section.title);
  //Hardcode the index page to be the root
  const page_name = page.name === 'index' ? '' : page.name;

  return new Document<BookChunk>({
    pageContent: section.content,
    metadata: {
      name: page.name,
      title: section.title,
      chunkNumber: index,
      contentHash: hash,
      uniqueId: `${page.name}-${index}`,
      sourceLink: `${STARKNET_DOCS_CONFIG.baseUrl}/${page_name}#${anchor}`,
    },
  });
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

export async function cleanupDownloadedFiles() {
  const extractDir2 = path.join(__dirname, 'starknet-docs-restructured');
  await fs.rm(extractDir2, { recursive: true, force: true });
  logger.info(`Deleted restructured markdown files from ${extractDir2}`);

  const antoraOutputDir = path.join(__dirname, 'antora-output');
  await fs.rm(antoraOutputDir, { recursive: true, force: true });
  logger.info(`Deleted antora output files from ${antoraOutputDir}`);
}

function handleError(error: unknown) {
  console.error('Error processing Starknet Docs:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
  throw error;
}

// ... (keep the existing exports if needed) ...
