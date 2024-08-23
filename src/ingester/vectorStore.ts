import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { getAvailableEmbeddingModelProviders } from '../lib/providers';
import logger from '../utils/logger';
import { OpenAIEmbeddings } from '@langchain/openai';

const DEFAULT_MONGODB_ATLAS_URI =
  'mongodb://127.0.0.1:27018/?directConnection=true';

const uri = process.env.MONGODB_ATLAS_URI || DEFAULT_MONGODB_ATLAS_URI;

const client = new MongoClient(uri);
const dbName = "langchain";
const collectionName = "store";
export const collection = client.db(dbName).collection(collectionName);

class VectorStoreWrapper {
  client: MongoClient;
  collection: Collection;
  vectorStore: MongoDBAtlasVectorSearch;

  constructor(
    client: MongoClient,
    collection: Collection,
    vectorStore: MongoDBAtlasVectorSearch,
  ) {
    this.client = client;
    this.collection = collection;
    this.vectorStore = vectorStore;
  }

  async connect() {
    logger.info('Connecting to MongoDB from ' + uri);
    await this.client.connect();
  }

  async disconnect() {
    logger.info('Disconnecting from MongoDB');
    await this.client.close();
  }

  async addDocuments(documents: any[], uniqueIds?: string[]) {
    logger.info(
      'Adding: ' + documents.length + ' documents to the vector store',
    );
    logger.info('Documents: ', documents);
    return this.vectorStore.addDocuments(documents, { ids: uniqueIds });
  }

  async findBookChunk(name: string) {
    try {
      const match = await this.collection.findOne({
        _id: name as unknown as ObjectId,
      });
      if (match) {
        return {
          metadata: { _id: name, contentHash: match.contentHash },
          pageContent: match.text,
        };
      }
    } catch (error) {
      logger.error('Error finding book chunk:', error);
      throw error;
    }
  }

  async removeBookPages(uniqueIds: string[]) {
    logger.info('Removing book pages with unique IDs ', uniqueIds);
    await this.collection.deleteMany({
      uniqueId: { $in: uniqueIds },
    });
  }

  async getStoredBookPagesHashes() {
    const documents = await this.collection
      .find({}, { projection: { uniqueId: 1, contentHash: 1 } })
      .toArray();

    return documents.map((doc) => ({
      uniqueId: doc.uniqueId,
      contentHash: doc.contentHash,
    }));
  }
}

const initializeVectorStore = async (): Promise<VectorStoreWrapper> => {
  try {
    // //TODO: make these dynamic
    // const embeddingModelProvider =
    //   process.env.EMBEDDING_MODEL_PROVIDER || 'openai';
    // const embeddingModel = process.env.EMBEDDING_MODEL || 'BGE Small';

    // const embeddingProviders = await getAvailableEmbeddingModelProviders();
    // logger.info('Available providers:', Object.keys(embeddingProviders));
    // logger.info(
    //   'Available models for requested provider:',
    //   embeddingProviders[embeddingModelProvider]
    //     ? Object.keys(embeddingProviders[embeddingModelProvider])
    //     : 'None',
    // );

    // if (
    //   !embeddingProviders[embeddingModelProvider] ||
    //   !embeddingProviders[embeddingModelProvider][embeddingModel]
    // ) {
    //   throw new Error(
    //     `Invalid embedding model provider or model: ${embeddingModelProvider}/${embeddingModel}`,
    //   );
    // }

    // const embeddings =
    //   embeddingProviders[embeddingModelProvider][embeddingModel];

    // logger.info('Using embeddings: ', embeddings);

    const vectorStore = new MongoDBAtlasVectorSearch(  new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        batchSize: 512,
        modelName: "text-embedding-3-large",
        dimensions: 2048,
      }), {
      collection,
      indexName: 'default',
      textKey: 'content',
      embeddingKey: 'embedding',
    });

    return new VectorStoreWrapper(client, collection, vectorStore);
  } catch (error) {
    logger.error('Error initializing vector store:', error);
    throw error;
  }
};

export { initializeVectorStore };
