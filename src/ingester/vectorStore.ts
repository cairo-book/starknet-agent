import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { DocumentInterface } from "@langchain/core/documents";
import { OpenAIEmbeddings } from '@langchain/openai';
import logger from '../utils/logger';

/**
 * Configuration for the VectorStore
 */
interface VectorStoreConfig {
  mongoUri: string;
  dbName: string;
  collectionName: string;
  openAIApiKey: string;
}

/**
 * VectorStore class for managing document storage and similarity search
 */
export class VectorStore {
  private client: MongoClient;
  public collection: Collection;
  private vectorSearch: MongoDBAtlasVectorSearch;

  private constructor(
    client: MongoClient,
    collection: Collection,
    vectorSearch: MongoDBAtlasVectorSearch
  ) {
    this.client = client;
    this.collection = collection;
    this.vectorSearch = vectorSearch;
  }

  /**
   * Initialize and connect to the VectorStore
   * @param config - Configuration for the VectorStore
   * @returns Promise<VectorStore>
   */
  static async initialize(config: VectorStoreConfig): Promise<VectorStore> {
    const client = new MongoClient(config.mongoUri);
    await client.connect();
    logger.info('Connected to MongoDB');

    const collection = client.db(config.dbName).collection(config.collectionName);

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openAIApiKey,
      batchSize: 512,
      modelName: "text-embedding-3-large",
      dimensions: 2048,
    });

    const vectorSearch = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: 'default',
      textKey: 'content',
      embeddingKey: 'embedding',
    });

    return new VectorStore(client, collection, vectorSearch);
  }

  /**
   * Perform similarity search
   * @param query - The query string
   * @param k - Number of results to return
   * @returns Promise<Document[]>
   */
  async similaritySearch(query: string, k: number = 5): Promise<DocumentInterface[]> {
    return this.vectorSearch.similaritySearch(query, k);
  }

  /**
   * Add documents to the vector store
   * @param documents - Array of documents to add
   * @param uniqueIds - Optional array of unique IDs for the documents
   * @returns Promise<void>
   */
  async addDocuments(documents: any[], uniqueIds?: string[]): Promise<void> {
    logger.info(`Adding ${documents.length} documents to the vector store`);
    await this.vectorSearch.addDocuments(documents, { ids: uniqueIds });
  }

  /**
   * Find a specific book chunk by name
   * @param name - Name of the book chunk
   * @returns Promise<Document | null>
   */
  async findBookChunk(name: string): Promise<DocumentInterface | null> {
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
      return null;
    } catch (error) {
      logger.error('Error finding book chunk:', error);
      throw error;
    }
  }

  /**
   * Remove book pages by their unique IDs
   * @param uniqueIds - Array of unique IDs to remove
   * @returns Promise<void>
   */
  async removeBookPages(uniqueIds: string[]): Promise<void> {
    logger.info('Removing book pages with unique IDs', uniqueIds);
    await this.collection.deleteMany({
      uniqueId: { $in: uniqueIds },
    });
  }

  /**
   * Get hashes of stored book pages
   * @returns Promise<Array<{uniqueId: string, contentHash: string}>>
   */
  async getStoredBookPagesHashes(): Promise<Array<{uniqueId: string, contentHash: string}>> {
    const documents = await this.collection
      .find({}, { projection: { uniqueId: 1, contentHash: 1 } })
      .toArray();

    return documents.map((doc) => ({
      uniqueId: doc.uniqueId,
      contentHash: doc.contentHash,
    }));
  }

  /**
   * Close the connection to the database
   * @returns Promise<void>
   */
  async close(): Promise<void> {
    logger.info('Disconnecting from MongoDB');
    await this.client.close();
  }
}
