import { VectorStore } from '../ingester/vectorStore';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

async function testMongoDBRetrieval() {
  let vectorStore: VectorStore | null = null;
  try {
    // Initialize the vector store
    vectorStore = await VectorStore.initialize({
      mongoUri: process.env.MONGODB_ATLAS_URI || 'mongodb://127.0.0.1:27018/?directConnection=true',
      dbName: 'langchain',
      collectionName: 'store',
      openAIApiKey: process.env.OPENAI_API_KEY || '',
    });

    // Show the content of the database
    const documentCount = await vectorStore.collection.countDocuments();
    logger.info(`The database has ${documentCount} documents`);

    const dbContent = await vectorStore.collection.find().limit(10).toArray();
    if (dbContent.length === 0) {
      logger.info('The database is empty.');
    } else {
      dbContent.forEach((doc, index) => {
        logger.info(`Document ${index + 1}:`);
        logger.info(`Name: ${doc.metadata?.name}`);
        logger.info(`ID: ${doc._id}`);
        logger.info(`Content of length: ${doc.pageContent?.length}`);
        logger.info(`Metadata: ${JSON.stringify(doc.metadata || {})}\n`);
      });
    }

    // Perform a similarity search for "Useful development tools"
    const query = 'Useful development tools';
    const results = await vectorStore.similaritySearch(query, 10);

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
