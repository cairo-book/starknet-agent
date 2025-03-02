import { ingestCairoBook } from '../src/cairoBookIngester';
import { ingestStarknetDocs } from '../src/starknetDocsIngester';
import dotenv from 'dotenv';
import { createInterface } from 'readline';
import logger from '@starknet-agent/agents/utils/logger';
import { ingestStarknetFoundry } from '../src/starknetFoundryIngester';
import { ingestCairoByExample } from '../src/cairoByExampleIngester';
import { ingestOpenZeppelinDocs } from '../src/ozDocsIngester';
import { VectorStore } from '@starknet-agent/agents/index';
import {
  getVectorDbConfig,
  VectorStoreConfig,
} from '@starknet-agent/agents/config';
import { loadOpenAIEmbeddingsModels } from '@starknet-agent/backend/lib/providers/openai';
import { DocumentSource } from '@starknet-agent/agents/core/types';

dotenv.config();

let vectorStore: VectorStore | null = null;

async function setupVectorStore(): Promise<VectorStore> {
  if (vectorStore) {
    return vectorStore;
  }

  try {
    const dbConfig = getVectorDbConfig();
    const embeddingModels = await loadOpenAIEmbeddingsModels();
    const textEmbedding3Large = embeddingModels['Text embedding 3 large'];
    vectorStore = await VectorStore.getInstance(dbConfig, textEmbedding3Large);
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
    const store = await setupVectorStore();
    await ingestCairoBook(store, 'cairo_book');
    console.log('Cairo Book ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Cairo Book ingestion:', error);
    throw error;
  }
}

async function ingestStarknetDocsData() {
  console.log('Starting Starknet Docs ingestion process...');
  try {
    const store = await setupVectorStore();
    await ingestStarknetDocs(store, 'starknet_docs');
    console.log('Starknet Docs ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Starknet Docs ingestion:', error);
    throw error;
  }
}

async function ingestFoundryData() {
  console.log('Starting Starknet Foundry ingestion process...');
  try {
    const store = await setupVectorStore();
    await ingestStarknetFoundry(store, 'starknet_foundry');
    console.log('Starknet Foundry ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Starknet Foundry ingestion:', error);
    throw error;
  }
}

async function ingestCairoByExampleData() {
  console.log('Starting Cairo By Example ingestion process...');
  try {
    const store = await setupVectorStore();
    await ingestCairoByExample(store, 'cairo_by_example');
    console.log('Cairo By Example ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Cairo By Example ingestion:', error);
    throw error;
  }
}

async function ingestOpenZeppelinDocsData() {
  console.log('Starting OpenZeppelin Docs ingestion process...');
  try {
    const store = await setupVectorStore();
    await ingestOpenZeppelinDocs(store, 'openzeppelin_docs');
    console.log('OpenZeppelin Docs ingestion completed successfully.');
  } catch (error) {
    console.error('Error during OpenZeppelin Docs ingestion:', error);
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
      'Select the ingestion target (1: Cairo Book, 2: Starknet Docs, 3: Starknet Foundry, 4: Cairo By Example, 5: OpenZeppelin Docs, 6: Everything): ',
      (answer) => {
        rl.close();
        const targets = [
          'Cairo Book',
          'Starknet Docs',
          'Starknet Foundry',
          'Cairo By Example',
          'OpenZeppelin Docs',
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

    if (target === 'OpenZeppelin Docs') {
      await ingestOpenZeppelinDocsData();
    }

    if (target === 'Everything') {
      await ingestCairoBookData();
      await ingestStarknetDocsData();
      await ingestFoundryData();
      await ingestCairoByExampleData();
      await ingestOpenZeppelinDocsData();
    }

    console.log('All specified ingestion processes completed successfully.');
  } catch (error) {
    console.error('An error occurred during the ingestion process:', error);
  } finally {
    if (vectorStore) {
      await vectorStore.close();
      process.exit(0);
    }
  }
}

main();
