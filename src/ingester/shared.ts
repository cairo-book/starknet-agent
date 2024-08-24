import { createHash } from 'crypto';
import { Document } from 'langchain/document';
import logger from "../utils/logger";
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BookPageDto {
  name: string;
  content: string;
}

export type BookConfig = {
    repoOwner: string;
    repoName: string;
    fileExtension: string;
    chunkSize: number;
    chunkOverlap: number;
    baseUrl: string;
  };

  /**
 * Interface representing a section of markdown content
 */
export interface MarkdownSection {
    title: string;
    content: string;
  }



export async function processMarkdownFiles(config: BookConfig, directory: string): Promise<BookPageDto[]> {
    try {
      logger.info(`Processing markdown files in ${directory}`);
      const files = await fs.readdir(directory);
      const pages: BookPageDto[] = [];

      for (const file of files) {
        const filePath = path.join(directory, file);
        if (path.extname(file).toLowerCase() === config.fileExtension) {
          const content = await fs.readFile(filePath, 'utf8');
          pages.push({
            name: path.basename(file, config.fileExtension),
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


export function calculateHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}
