import {
  getCairoDbConfig,
  getStarknetDbConfig,
  getStarknetEcosystemDbConfig,
  VectorStoreConfig,
} from '../config';
import { loadOpenAIEmbeddingsModels } from '../lib/providers/openai';
import { ingestCairoBook } from '../ingester/cairoBookIngester';
import { ingestStarknetDocs } from '../ingester/starknetDocsIngester';
import { VectorStore } from '../db/vectorStore';
import dotenv from 'dotenv';
import { createInterface } from 'readline';
import logger from '../utils/logger';
import { ingestStarknetEcosystem } from '../ingester/starknetEcosystemIngester';

dotenv.config();

let vectorStores: { [key: string]: VectorStore } | {} = {};

async function setupVectorStore(
  dbConfig: VectorStoreConfig,
): Promise<VectorStore> {
  try {
    const embeddingModels = await loadOpenAIEmbeddingsModels();
    const textEmbedding3Large = embeddingModels['Text embedding 3 large'];
    const vectorStore = await VectorStore.getInstance(
      dbConfig,
      textEmbedding3Large,
    );
    logger.info('VectorStore initialized successfully');
    return vectorStore;
  } catch (error) {
    logger.error('Failed to initialize VectorStore:', error);
    throw error;
  }
}

async function ingestCairoBookData() {
  console.log('Starting Cairo Book ingestion process...');
  try {
    const store = await setupVectorStore(getCairoDbConfig());
    await ingestCairoBook(store);
    console.log('Cairo Book ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Cairo Book ingestion:', error);
    throw error;
  }
}

async function ingestStarknetDocsData() {
  console.log('Starting Starknet Docs ingestion process...');
  try {
    const store = await setupVectorStore(getStarknetDbConfig());
    await ingestStarknetDocs(store);
    console.log('Starknet Docs ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Starknet Docs ingestion:', error);
    throw error;
  }
}

async function ingestEcosystemData() {
  console.log('Starting Ecosystem ingestion process...');
  try {
    const store = await setupVectorStore(getStarknetEcosystemDbConfig());
    await ingestStarknetEcosystem(store);
    console.log('Ecosystem ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Ecosystem ingestion:', error);
    throw error;
  }
}

async function promptForTarget(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      'Select the ingestion target (1: Cairo Book, 2: Starknet Docs, 3: Ecosystem): ',
      (answer) => {
        rl.close();
        const targets = [
          'Cairo Book',
          'Starknet Docs',
          'All Starknet Ecosystem',
        ];
        resolve(targets[parseInt(answer) - 1] || 'Both');
      },
    );
  });
}

async function main() {
  const target = await promptForTarget();
  console.log(`Selected target: ${target}`);

  try {
    if (target === 'Cairo Book') {
      await ingestCairoBookData();
    }

    if (target === 'Starknet Docs') {
      await ingestStarknetDocsData();
    }

    if (target === 'All Starknet Ecosystem') {
      await ingestEcosystemData();
    }

    console.log('All specified ingestion processes completed successfully.');
  } catch (error) {
    console.error('An error occurred during the ingestion process:', error);
  } finally {
    if (vectorStores) {
      for (const vectorStore of Object.values(vectorStores)) {
        await vectorStore.close();
      }
      process.exit(1);
    }
  }
}

main();
