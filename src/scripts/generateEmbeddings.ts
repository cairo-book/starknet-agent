import { ingestCairoBook } from '../ingester/cairoBookIngester';
import { VectorStore } from '../ingester/vectorStore';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting Cairo Book ingestion process...');
  try {
    const vectorStore = await VectorStore.initialize({
      mongoUri: process.env.MONGODB_ATLAS_URI || 'mongodb://127.0.0.1:27018/?directConnection=true',
      dbName: 'langchain',
      collectionName: 'store',
      openAIApiKey: process.env.OPENAI_API_KEY || '',
    });

    await ingestCairoBook(vectorStore);
    console.log('Cairo Book ingestion completed successfully.');

    await vectorStore.close();
  } catch (error) {
    console.error('Error during Cairo Book ingestion:', error);
    process.exit(1);
  }
}

main();
