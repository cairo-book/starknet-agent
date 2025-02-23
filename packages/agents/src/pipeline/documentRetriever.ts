import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import {
  ProcessedQuery,
  RetrievedDocuments,
  RagSearchConfig,
  BookChunk,
} from '../core/types';
import computeSimilarity from '../utils/computeSimilarity';
import logger from '../utils/logger';
/**
 * Retrieves and refines relevant documents based on a processed query.
 */
export class DocumentRetriever {
  constructor(
    private embeddings: Embeddings,
    private config: RagSearchConfig,
  ) {}

  async retrieve(processedQuery: ProcessedQuery): Promise<RetrievedDocuments> {
    logger.debug('Retrieving documents', { processedQuery });
    const docs = await this.fetchDocuments(processedQuery);
    const refinedDocs = (await this.rerankDocuments(
      processedQuery.transformed,
      docs,
    )) as Document<BookChunk>[];
    const attachedDocs = await this.attachSources(refinedDocs);
    return { documents: attachedDocs, processedQuery };
  }

  private async fetchDocuments(query: ProcessedQuery): Promise<Document[]> {
    const searchQuery = Array.isArray(query.transformed)
      ? query.transformed
      : [query.transformed];
    const searchPromises = searchQuery.map((q) =>
      this.config.vectorStore.similaritySearch(
        q,
        this.config.maxSourceCount || 10,
      ),
    );
    const results = await Promise.all(searchPromises);
    const uniqueDocs = [
      ...new Set(results.flat().map((doc) => doc.pageContent)),
    ].map(
      (content) => results.flat().find((doc) => doc.pageContent === content)!,
    );
    logger.debug('Retrieved documents:', { count: uniqueDocs.length });
    return uniqueDocs;
  }

  private async rerankDocuments(
    query: string | string[],
    docs: Document[],
  ): Promise<Document[]> {
    if (
      docs.length === 0 ||
      (typeof query === 'string' && query === 'Summarize')
    ) {
      return docs;
    }

    const validDocs = docs.filter((doc) => doc.pageContent?.length > 0);
    const queryText = Array.isArray(query) ? query.join(' ') : query;
    const [docEmbeddings, queryEmbedding] = await Promise.all([
      this.embeddings.embedDocuments(validDocs.map((doc) => doc.pageContent)),
      this.embeddings.embedQuery(queryText),
    ]);

    const similarities = docEmbeddings.map((docEmbedding, i) => ({
      index: i,
      similarity: computeSimilarity(queryEmbedding, docEmbedding),
    }));

    return similarities
      .filter(
        (sim) => sim.similarity > (this.config.similarityThreshold || 0.4),
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map((sim) => validDocs[sim.index]);
  }

  private async attachSources(
    docs: Document<BookChunk>[],
  ): Promise<Document[]> {
    return docs.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        title: doc.metadata.title,
        url: doc.metadata.sourceLink,
      },
    }));
  }
}
