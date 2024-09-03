import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { VectorStore } from '../db/vectorStore';
import { Document } from 'langchain/document';
import logger from '../utils/logger';
import { BookChunk } from '../types/types';
import {
  BookConfig,
  BookPageDto,
  findChunksToUpdateAndRemove,
  isInsideCodeBlock,
  ParsedSection,
  processMarkdownFiles,
  calculateHash,
  createAnchor,
  addSectionWithSizeLimit,
  MAX_SECTION_SIZE,
} from './shared';

const config: BookConfig = {
  repoOwner: 'cairo-book',
  repoName: 'cairo-book',
  fileExtension: '.md',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://book.cairo-lang.org',
};

export const ingestCairoBook = async (vectorStore: VectorStore) => {
  try {
    const pages = await downloadAndExtractCairoBook();
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

async function downloadAndExtractCairoBook(): Promise<BookPageDto[]> {
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
  const pages = await processMarkdownFiles(config, srcDir);

  return pages;
}

/**
 * Creates chunks from book pages based on markdown sections
 * @param pages - Array of BookPageDto objects
 * @returns Promise<Document[]> - Array of Document objects representing chunks
 */
export async function createChunks(
  pages: BookPageDto[],
): Promise<Document<BookChunk>[]> {
  logger.info('Creating chunks from book pages based on markdown sections');
  const chunks: Document[] = [];

  for (const page of pages) {
    const sanitizedContent = sanitizeCodeBlocks(page.content);
    const sections: ParsedSection[] = splitMarkdownIntoSections(sanitizedContent);

    sections.forEach((section: ParsedSection, index: number) => {
      const hash: string = calculateHash(section.content);
      chunks.push(
        new Document<BookChunk>({
          pageContent: section.content,
          metadata: {
            name: page.name,
            title: section.title,
            chunkNumber: index,
            contentHash: hash,
            uniqueId: `${page.name}-${index}`,
            sourceLink: `${config.baseUrl}/${page.name}.html#${createAnchor(section.title)}`,
          },
        }),
      );
    });
  }

  return chunks as Document<BookChunk>[];
}

export function sanitizeCodeBlocks(content: string): string {
  const lines = content.split('\n');
  let isInCodeBlock = false;
  const sanitizedLines = lines.filter((line) => {
    if (line.trim().startsWith('```')) {
      isInCodeBlock = !isInCodeBlock;
      return true;
    }
    if (isInCodeBlock) {
      return !line.trim().startsWith('# ') && line.trim() !== '#';
    }
    return true;
  });
  return sanitizedLines.join('\n');
}

/**
 * Splits markdown content into sections based on headers and imposes a maximum section size
 * The maximum section size is 20000 characters - this is to avoid embedding large sections, which is
 * limited by OpenAI. The limit is 8192 tokens, therefore 20000 characters should be safe at 1token~=4 characters.
 * @param content - The markdown content to split
 * @returns ParsedSection[] - Array of ParsedSection objects
 */
export function splitMarkdownIntoSections(content: string): ParsedSection[] {
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const sections: ParsedSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    if (!isInsideCodeBlock(content, match.index)) {
      if (lastIndex < match.index) {
        const sectionContent = content.slice(lastIndex, match.index).trim();
        addSectionWithSizeLimit(
          sections,
          lastTitle,
          sectionContent,
          MAX_SECTION_SIZE,
        );
      }
      lastTitle = match[2];
      lastIndex = match.index;
    }
  }

  // Add the last section
  if (lastIndex < content.length) {
    const sectionContent = content.slice(lastIndex).trim();
    addSectionWithSizeLimit(
      sections,
      lastTitle,
      sectionContent,
      MAX_SECTION_SIZE,
    );
  }

  return sections;
}
