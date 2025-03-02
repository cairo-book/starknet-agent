import * as fs from 'fs/promises';
import * as path from 'path';
import { VectorStore } from '@starknet-agent/agents/index';
import { BaseIngester } from '../BaseIngester';
import { BookConfig, BookPageDto } from '../utils/types';
import logger from '@starknet-agent/agents/utils/logger';
import { AsciiDocIngesterConfig } from './AsciiDocIngester';
import { AsciiDocIngester } from './AsciiDocIngester';

/**
 * Ingester for the OpenZeppelin documentation
 *
 * This ingester processes the OpenZeppelin documentation using the AsciiDoc format,
 * with special handling for the cairo-contracts/1.0.0 path structure.
 */
export class OpenZeppelinDocsIngester extends AsciiDocIngester {
  /**
   * Constructor for the OpenZeppelin Docs ingester
   */
  constructor() {
    // Define the configuration for OpenZeppelin Docs
    const config: BookConfig = {
      repoOwner: 'OpenZeppelin',
      repoName: 'cairo-contracts',
      fileExtension: '.adoc',
      chunkSize: 4096,
      chunkOverlap: 512,
      baseUrl: 'https://docs.openzeppelin.com',
    };

    const asciiDocIngesterConfig: AsciiDocIngesterConfig = {
      bookConfig: config,
      playbookPath: path.join(__dirname, '..', 'oz-playbook.yml'),
      outputDir: path.join(__dirname, '..', 'antora-output'),
      restructuredDir: path.join(__dirname, '..', 'oz-docs-restructured'),
      source: 'openzeppelin_docs',
    };
    super(asciiDocIngesterConfig);
  }

  /**
   * Custom processDocFiles function for OpenZeppelin docs
   * This preserves the special handling for the cairo-contracts/1.0.0 path
   *
   * @param config - Book configuration
   * @param directory - Directory to process
   * @returns Promise<BookPageDto[]> - Array of book pages
   */
  protected async processDocFilesCustom(
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
}
