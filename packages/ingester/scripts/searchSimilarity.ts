import { getCairoDbConfig } from '../../backend/src/config';
import { VectorStore } from '@starknet-agent/backend/vectorStore';
import { loadOpenAIEmbeddingsModels } from '../../backend/src/lib/providers/openai';
import logger from '@starknet-agent/backend/logger';
import dotenv from 'dotenv';

dotenv.config();

let vectorStore: VectorStore;

async function setupVectorStore() {
  try {
    vectorStore = await VectorStore.getInstance(
      getCairoDbConfig(),
      await loadOpenAIEmbeddingsModels()['Text embedding 3 large'],
    );
    logger.info('VectorStore initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize VectorStore:', error);
    throw error;
  }
}

setupVectorStore();

async function testMongoDBRetrieval() {
  try {
    if (!vectorStore) {
      await setupVectorStore();
    }
    // Show the content of the database
    const documentCount = await vectorStore.collection.countDocuments();
    logger.info(`The database has ${documentCount} documents`);

    const dbContent = await vectorStore.collection.find().limit(10).toArray();
    // console.log(dbContent);
    if (dbContent.length === 0) {
      logger.info('The database is empty.');
    } else {
      dbContent.forEach((doc, index) => {
        logger.info(`Document ${index + 1}:`);
        logger.info(`Name: ${doc.name}`);
        logger.info(`URL: ${doc.sourceLink}`);
        logger.info(`Content of length: ${doc.content?.length}`);
      });
    }

    // Perform a similarity search for "Useful development tools"
    const query = 'Useful development tools';
    const results = await vectorStore.similaritySearch(query);

    // Log the results
    logger.info(`Search results for "${query}":`);
    if (results.length === 0) {
      logger.info('No results found.');
    } else {
      results.forEach((result, index) => {
        logger.info(`Result ${index + 1}:`);
        logger.info(`Content: ${result.pageContent.substring(0, 150)}...`);
        logger.info(`Metadata: ${JSON.stringify(result.metadata)}\n`);
      });
    }
  } catch (error) {
    logger.error('Error during MongoDB retrieval test:', error);
  } finally {
    // Close the connection if vectorStore was initialized
    if (vectorStore) {
      await vectorStore.close();
    }
  }
}

// Run the test
testMongoDBRetrieval();
