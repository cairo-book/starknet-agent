import * as path from 'path';
import { DocumentSource, VectorStore } from '@starknet-agent/agents/index';
import { BookConfig } from './shared';
import { AsciiDocIngesterConfig, ingestAsciiDocDocs } from './asciiDocIngester';

// Configuration
const STARKNET_DOCS_CONFIG: BookConfig = {
  repoOwner: 'starknet-io',
  repoName: 'starknet-docs',
  fileExtension: '.adoc',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://docs.starknet.io',
};

// Main ingestion function
export const ingestStarknetDocs = async (
  vectorStore: VectorStore,
  source: DocumentSource = 'starknet_docs',
) => {
  const config: AsciiDocIngesterConfig = {
    bookConfig: STARKNET_DOCS_CONFIG,
    playbookPath: 'playbook.yml',
    outputDir: path.join(__dirname, 'antora-output'),
    restructuredDir: path.join(__dirname, 'starknet-docs-restructured'),
    source,
  };

  await ingestAsciiDocDocs(vectorStore, config);
};
