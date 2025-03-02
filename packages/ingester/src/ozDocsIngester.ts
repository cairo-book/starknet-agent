import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BookChunk,
  DocumentSource,
  VectorStore,
} from '@starknet-agent/agents/index';
import { Document } from '@langchain/core/documents';
import { BookConfig, BookPageDto, processDocFiles } from './shared';
import logger from '@starknet-agent/agents/utils/logger';
import { AsciiDocIngesterConfig, ingestAsciiDocDocs } from './asciiDocIngester';

// Configuration
const OZ_DOCS_CONFIG: BookConfig = {
  repoOwner: 'OpenZeppelin',
  repoName: 'cairo-contracts',
  fileExtension: '.adoc',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://docs.openzeppelin.com',
};

// Main ingestion function
export const ingestOpenZeppelinDocs = async (
  vectorStore: VectorStore,
  source: DocumentSource = 'openzeppelin_docs',
) => {
  const config: AsciiDocIngesterConfig = {
    bookConfig: OZ_DOCS_CONFIG,
    playbookPath: 'oz-playbook.yml',
    outputDir: path.join(__dirname, 'antora-output'),
    restructuredDir: path.join(__dirname, 'oz-docs-restructured'),
    source,
    processDocFilesCustom: processOzDocFiles,
  };

  await ingestAsciiDocDocs(vectorStore, config);
};

// Custom processDocFiles function for OpenZeppelin docs
// This preserves the special handling for the cairo-contracts/1.0.0 path
export async function processOzDocFiles(
  config: BookConfig,
  directory: string,
): Promise<BookPageDto[]> {
  try {
    logger.info(`Processing OpenZeppelin doc files in ${directory}`);
    const pages: BookPageDto[] = [];

    async function processDirectory(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively process subdirectories
          await processDirectory(fullPath);
        } else if (
          entry.isFile() &&
          path.extname(entry.name).toLowerCase() === config.fileExtension
        ) {
          // Process AsciiDoc files
          const content = await fs.readFile(fullPath, 'utf8');

          // Inject cairo-contracts/1.0.0 in the fullPath to reflect online website directory structure
          // This is the special handling for OpenZeppelin docs
          const adaptedFullPageName = path.join(
            dir,
            'contracts-cairo',
            '1.0.0',
            entry.name,
          );

          pages.push({
            name: path
              .relative(directory, adaptedFullPageName)
              .replace(config.fileExtension, ''),
            content,
          });
        }
      }
    }

    await processDirectory(directory);
    return pages;
  } catch (err) {
    console.error('Error processing directory:', (err as Error).message);
    throw new Error(`Failed to process directory: ${(err as Error).message}`);
  }
}
