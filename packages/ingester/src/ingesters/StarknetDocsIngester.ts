import * as path from 'path';
import { BookConfig, BookPageDto, ParsedSection } from '../utils/types';
import { AsciiDocIngester, AsciiDocIngesterConfig } from './AsciiDocIngester';
import { processDocFiles } from '../utils/fileUtils';

/**
 * Ingester for the Starknet documentation
 *
 * This ingester uses Antora to build the Starknet documentation from AsciiDoc sources,
 * processes the generated HTML files, and creates chunks for the vector store.
 */
export class StarknetDocsIngester extends AsciiDocIngester {
  /**
   * Constructor for the Starknet Docs ingester
   */
  constructor() {
    // Define the configuration for the Starknet Docs
    const config: BookConfig = {
      repoOwner: 'starknet-io',
      repoName: 'starknet-docs',
      fileExtension: '.adoc',
      chunkSize: 4096,
      chunkOverlap: 512,
      baseUrl: 'https://docs.starknet.io',
    };

    const asciiDocIngesterConfig: AsciiDocIngesterConfig = {
      bookConfig: config,
      playbookPath: path.join(__dirname, '..', 'playbook.yml'),
      outputDir: path.join(__dirname, '..', 'antora-output'),
      restructuredDir: path.join(__dirname, '..', 'starknet-docs-restructured'),
      source: 'starknet_docs',
    };

    super(asciiDocIngesterConfig);
  }

  protected async processDocFilesCustom(
    config: BookConfig,
    directory: string,
  ): Promise<BookPageDto[]> {
    return await processDocFiles(config, directory);
  }
}
