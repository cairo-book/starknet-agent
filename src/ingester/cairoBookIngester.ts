import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { VectorStore } from './vectorStore';
import { Document } from 'langchain/document';
import logger from '../utils/logger';
import { createHash } from 'crypto';
import { CairoBookChunk } from '../types/cairoBook';

const config = {
  repoOwner: 'cairo-book',
  repoName: 'cairo-book',
  mdFileExtension: '.md',
  chunkSize: 4096,
  chunkOverlap: 512,
  bookBaseUrl: 'https://book.cairo-lang.org',
};

export const ingestCairoBook = async (vectorStore: VectorStore) => {
  try {
    const pages = await downloadAndExtractBook();
    const chunks = await createChunks(pages);

    const storedChunkHashes = await vectorStore.getStoredBookPagesHashes();
    const { chunksToUpdate, chunksToRemove } = findChunksToUpdateAndRemove(
      chunks,
      storedChunkHashes,
    );
    logger.info(
      `Found ${chunksToUpdate.length} chunks to update and ${chunksToRemove.length} chunks to remove`,
    );

    //TODO(remove) Randomly select 15 chunks to log
    const sampleSize = Math.min(15, chunks.length);
    const randomChunks = chunks
      .sort(() => 0.5 - Math.random())
      .slice(0, sampleSize);

    randomChunks.forEach((chunk, index) => {
      console.log(chunk);
    });

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

    // Delete the downloaded markdown files
    const extractDir = path.join(__dirname, 'cairo-book');
    await fs.rm(extractDir, { recursive: true, force: true });
    logger.info(`Deleted downloaded markdown files from ${extractDir}`);
  } catch (error) {
    console.error('Error processing Cairo Book:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
};

async function downloadAndExtractBook(): Promise<BookPageDto[]> {
  logger.info('Downloading and extracting Cairo Book');
  const latestReleaseUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/releases/latest`;
  const response = await axios.get(latestReleaseUrl);
  const latestRelease = response.data;

  const zipAsset = latestRelease.assets.find(
    (asset: any) => asset.name === 'markdown-output.zip',
  );

  if (!zipAsset) {
    throw new Error('ZIP asset not found in the latest release.');
  }

  const zipUrl = zipAsset.browser_download_url;
  logger.info(`Downloading ZIP file from ${zipUrl}`);
  const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  const zipData = zipResponse.data;

  const zipFile = new AdmZip(zipData);
  const extractDir = path.join(__dirname, 'cairo-book');
  zipFile.extractAllTo(extractDir, true);

  logger.info('ZIP file downloaded and extracted successfully.');

  const srcDir = path.join(extractDir, 'book/markdown');
  const pages = await processMarkdownFiles(srcDir);

  return pages;
}

async function processMarkdownFiles(directory: string): Promise<BookPageDto[]> {
  try {
    logger.info(`Processing markdown files in ${directory}`);
    const files = await fs.readdir(directory);
    const pages: BookPageDto[] = [];

    for (const file of files) {
      const filePath = path.join(directory, file);
      if (path.extname(file).toLowerCase() === config.mdFileExtension) {
        const content = await fs.readFile(filePath, 'utf8');
        pages.push({
          name: path.basename(file, config.mdFileExtension),
          content,
        });
      }
    }

    return pages;
  } catch (err) {
    console.error('Error reading directory:', (err as Error).message);
    throw new Error(`Failed to read directory: ${(err as Error).message}`);
  }
}

/**
 * Interface representing a section of markdown content
 */
interface MarkdownSection {
  title: string;
  content: string;
}


/**
 * Creates chunks from book pages based on markdown sections
 * @param pages - Array of BookPageDto objects
 * @returns Promise<Document[]> - Array of Document objects representing chunks
 */
export async function createChunks(pages: BookPageDto[]): Promise<Document<CairoBookChunk>[]> {
  logger.info('Creating chunks from book pages based on markdown sections');
  const chunks: Document[] = [];

  for (const page of pages) {
    const sections: MarkdownSection[] = splitMarkdownIntoSections(page.content);

    sections.forEach((section: MarkdownSection, index: number) => {
      const hash: string = calculateHash(section.content);
      chunks.push(
        new Document<CairoBookChunk>({
          pageContent: section.content,
          metadata: {
            name: page.name,
            title: section.title,
            chunkNumber: index,
            contentHash: hash,
            uniqueId: `${page.name}-${index}`,
          },
        }),
      );
    });
  }

  return chunks as Document<CairoBookChunk>[];
}

/**
 * Splits markdown content into sections based on headers
 * @param content - The markdown content to split
 * @returns MarkdownSection[] - Array of MarkdownSection objects
 */
export function splitMarkdownIntoSections(content: string): MarkdownSection[] {
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const sections: MarkdownSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    if (!isInsideCodeBlock(content, match.index)) {
      if (lastIndex < match.index) {
        sections.push({
          title: lastTitle,
          content: content.slice(lastIndex, match.index).trim(),
        });
      }
      lastTitle = match[2];
      lastIndex = match.index;
    }
  }

  // Add the last section
  if (lastIndex < content.length) {
    sections.push({
      title: lastTitle,
      content: content.slice(lastIndex).trim(),
    });
  }

  return sections;
}

export function isInsideCodeBlock(content: string, index: number): boolean {
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (index >= match.index && index < match.index + match[0].length) {
      return true;
    }
  }
  return false;
}

function calculateHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}
export function findChunksToUpdateAndRemove(
  freshChunks: Document<Record<string, any>>[],
  storedChunkHashes: { uniqueId: string; contentHash: string }[],
): {
  chunksToUpdate: Document<Record<string, any>>[];
  chunksToRemove: string[];
} {
  const storedHashesMap = new Map(
    storedChunkHashes.map((chunk) => [chunk.uniqueId, chunk.contentHash]),
  );
  const freshChunksMap = new Map(
    freshChunks.map((chunk) => [
      chunk.metadata.uniqueId,
      chunk.metadata.contentHash,
    ]),
  );

  const chunksToUpdate = freshChunks.filter((chunk) => {
    const storedHash = storedHashesMap.get(chunk.metadata.uniqueId);
    return storedHash !== chunk.metadata.contentHash;
  });

  const chunksToRemove = storedChunkHashes
    .filter((stored) => !freshChunksMap.has(stored.uniqueId))
    .map((stored) => stored.uniqueId);

  return { chunksToUpdate, chunksToRemove };
}

export interface BookPageDto {
  name: string;
  content: string;
}
