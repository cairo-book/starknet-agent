import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { initializeVectorStore } from './vectorStore';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import logger from '../utils/logger';
import { createHash } from 'crypto';

const config = {
  repoOwner: 'cairo-book',
  repoName: 'cairo-book',
  mdFileExtension: '.md',
  chunkSize: 4096,
  chunkOverlap: 512,
  bookBaseUrl: 'https://book.cairo-lang.org',
};

export const ingestCairoBook = async () => {
  try {
    const vectorStoreWrapper = await initializeVectorStore();
    await vectorStoreWrapper.connect();
    const pages = await downloadAndExtractBook();
    const chunks = await createChunks(pages);

    const storedChunkHashes =
      await vectorStoreWrapper.getStoredBookPagesHashes();
    const { chunksToUpdate, chunksToRemove } = findChunksToUpdateAndRemove(
      chunks,
      storedChunkHashes,
    );
    logger.info(
      `Found ${chunksToUpdate.length} chunks to update and ${chunksToRemove.length} chunks to remove`,
    );

    if (chunksToRemove.length > 0) {
      await vectorStoreWrapper.removeBookPages(chunksToRemove);
    }
    if (chunksToUpdate.length > 0) {
      await vectorStoreWrapper.addDocuments(
        chunksToUpdate,
        chunksToUpdate.map((chunk) => chunk.metadata.uniqueId),
      );
    }

    logger.info(
      `Updated ${chunksToUpdate.length} chunks and removed ${chunksToRemove.length} chunks.`,
    );
    await vectorStoreWrapper.disconnect();
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

async function createChunks(pages: BookPageDto[]): Promise<Document[]> {
  logger.info('Creating chunks from book pages');
  const textSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });

  const chunks: Document[] = [];

  for (const page of pages) {
    const pageChunks = await textSplitter.createDocuments(
      [page.content],
      [{ name: page.name }],
    );

    pageChunks.forEach((chunk, index) => {
      const hash = calculateHash(chunk.pageContent);
      chunk.metadata = {
        ...chunk.metadata,
        chunkNumber: index,
        contentHash: hash,
        uniqueId: `${page.name}-${index}`,
      };
    });
    chunks.push(...pageChunks);
  }

  return chunks;
}

function calculateHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

function findChunksToUpdateAndRemove(
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

interface BookPageDto {
  name: string;
  content: string;
}
