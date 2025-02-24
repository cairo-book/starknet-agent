import { ingestCairoBook } from '../src/cairoBookIngester';
import { ingestStarknetDocs } from '../src/starknetDocsIngester';
import dotenv from 'dotenv';
import { createInterface } from 'readline';
import logger from '@starknet-agent/agents/utils/logger';
import { ingestStarknetEcosystem } from '../src/starknetEcosystemIngester';
import { ingestStarknetFoundry } from '../src/starknetFoundryIngester';
import { ingestCairoByExample } from '../src/cairoByExampleIngester';
import { VectorStore } from '@starknet-agent/agents/index';
import {
  getCairoDbConfig,
  getStarknetDbConfig,
  getStarknetEcosystemDbConfig,
  getStarknetFoundryDbConfig,
  getCairoByExampleDbConfig,
  VectorStoreConfig,
} from '@starknet-agent/agents/config';
import { loadOpenAIEmbeddingsModels } from '@starknet-agent/backend/lib/providers/openai';

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

async function ingestFoundryData() {
  console.log('Starting Starknet Foundry ingestion process...');
  try {
    const store = await setupVectorStore(getStarknetFoundryDbConfig());
    await ingestStarknetFoundry(store);
    console.log('Starknet Foundry ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Starknet Foundry ingestion:', error);
    throw error;
  }
}

async function ingestCairoByExampleData() {
  console.log('Starting Cairo By Example ingestion process...');
  try {
    const store = await setupVectorStore(getCairoByExampleDbConfig());
    await ingestCairoByExample(store);
    console.log('Cairo By Example ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Cairo By Example ingestion:', error);
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
      'Select the ingestion target (1: Cairo Book, 2: Starknet Docs, 3: Starknet Foundry, 4: Cairo By Example, 5: Everything): ',
      (answer) => {
        rl.close();
        const targets = [
          'Cairo Book',
          'Starknet Docs',
          'Starknet Foundry',
          'Cairo By Example',
          'Everything',
        ];
        resolve(targets[parseInt(answer) - 1] || 'Everything');
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

    if (target === 'Starknet Foundry') {
      await ingestFoundryData();
    }

    if (target === 'Cairo By Example') {
      await ingestCairoByExampleData();
    }

    if (target === 'Everything') {
      await ingestEcosystemData();
      await ingestCairoByExampleData();
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
