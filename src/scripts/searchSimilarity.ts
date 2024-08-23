import { initializeVectorStore } from '../ingester/vectorStore';
import logger from '../utils/logger';

async function testMongoDBRetrieval() {
  try {
    // Initialize the vector store
    const vectorStoreWrapper = await initializeVectorStore();

    // Connect to MongoDB
    await vectorStoreWrapper.connect();

    // Show the content of the database
    // Show how much docs the database has
    logger.info('The database has ' + await vectorStoreWrapper.collection.countDocuments() + ' documents');
    const dbContent = await vectorStoreWrapper.collection
      .find({})
      .limit(10)
      .toArray();
    if (dbContent.length === 0) {
      logger.info('The database is empty.');
    } else {
      dbContent.forEach((doc, index) => {
        logger.info(`Document ${index + 1}:`);
        logger.info(`Name: ${doc.metadata?.name}`);
        logger.info(`ID: ${doc._id}`);
        logger.info(`Content of length: ${doc.content?.length}`);
        logger.info(`Metadata: ${JSON.stringify(doc.metadata || {})}\n`);
      });
    }

    // Perform a similarity search for "Cairo programming language"
    const query = 'Useful development tools';
    const results = await vectorStoreWrapper.vectorStore.maxMarginalRelevanceSearch(
      query,
      {k: 10, fetchK: 10, lambda: 0.5},
    );

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

    // Disconnect from MongoDB
    await vectorStoreWrapper.disconnect();
  } catch (error) {
    logger.error('Error during MongoDB retrieval test:', error);
  }
}

// Run the test
testMongoDBRetrieval();
