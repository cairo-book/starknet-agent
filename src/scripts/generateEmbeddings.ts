import { getCairoDbConfig, getStarknetDbConfig } from '../config';
import { loadOpenAIEmbeddingsModels } from '../lib/providers/openai';
import { ingestCairoBook } from '../ingester/cairoBookIngester';
import { ingestStarknetDocs } from '../ingester/starknetDocsIngester';
import { VectorStore } from '../ingester/vectorStore';
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config();

async function ingestCairoBookData() {
  console.log('Starting Cairo Book ingestion process...');
  try {
    const vectorStore = await VectorStore.initialize(getCairoDbConfig(), await loadOpenAIEmbeddingsModels()['Text embedding 3 large']);
    await ingestCairoBook(vectorStore);
    console.log('Cairo Book ingestion completed successfully.');
    await vectorStore.close();
  } catch (error) {
    console.error('Error during Cairo Book ingestion:', error);
    throw error;
  }
}

async function ingestStarknetDocsData() {
  console.log('Starting Starknet Docs ingestion process...');
  try {
    const vectorStore = await VectorStore.initialize(getStarknetDbConfig(), await loadOpenAIEmbeddingsModels()['Text embedding 3 large']);
    await ingestStarknetDocs(vectorStore);
    console.log('Starknet Docs ingestion completed successfully.');
    await vectorStore.close();
  } catch (error) {
    console.error('Error during Starknet Docs ingestion:', error);
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
      'Select the ingestion target (1: Cairo Book, 2: Starknet Docs, 3: Both): ',
      (answer) => {
        rl.close();
        const targets = ['Cairo Book', 'Starknet Docs', 'Both'];
        resolve(targets[parseInt(answer) - 1] || 'Both');
      },
    );
  });
}

async function main() {
  const target = await Promise.race([
    promptForTarget(),
    new Promise<string>((resolve) => setTimeout(() => resolve('Both'), 7000)),
  ]);
  console.log(`Selected target: ${target}`);

  try {
    if (target === 'Cairo Book' || target === 'Both') {
      await ingestCairoBookData();
    }

    if (target === 'Starknet Docs' || target === 'Both') {
      await ingestStarknetDocsData();
    }

    console.log('All specified ingestion processes completed successfully.');
  } catch (error) {
    console.error('An error occurred during the ingestion process:', error);
    process.exit(1);
  }
}

main();
