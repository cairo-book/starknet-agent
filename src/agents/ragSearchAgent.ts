import { BaseMessage } from '@langchain/core/messages';
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import formatChatHistoryAsString from '../utils/formatHistory';
import eventEmitter from 'events';
import computeSimilarity from '../utils/computeSimilarity';
import logger from '../utils/logger';
import { VectorStore } from '../db/vectorStore';
import { RagSearchConfig } from '../types/agent';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { injectPromptVariables } from '../config/prompts';
import { BookChunk } from '../types/types';
import { parseXMLContent } from '../config/agentConfigs';


export type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
}

const strParser = new StringOutputParser();

// Helper function to check if query is contract-related
const isContractQuery = (query: string, context: string, config: RagSearchConfig): boolean => {
  // First check XML search terms
  const hasContractTerms = query.toLowerCase().includes('contract') ||
                          context.includes('<search_terms>');

  // Then use the configured classifier if available
  if (config.queryClassifier) {
    return hasContractTerms || config.queryClassifier.isContractQuery(query, context);
  }

  return hasContractTerms;
};

export const handleStream = async (
  stream: IterableReadableStream<StreamEvent>,
  emitter: eventEmitter,
): Promise<void> => {
  logger.info('Starting stream handling');
  try {
    for await (const event of stream) {
      if (
        event.event === 'on_chain_end' &&
        event.name === 'FinalSourceRetriever'
      ) {
        logger.info('Sources retrieved:', {
          sourceCount: event.data.output.length,
        });
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'sources',
            data: event.data.output,
          }),
        );
      }

      if (
        event.event === 'on_chain_stream' &&
        event.name === 'FinalResponseGenerator'
      ) {
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'response',
            data: event.data.chunk,
          }),
        );
      }

      if (
        event.event === 'on_chain_end' &&
        event.name === 'FinalResponseGenerator'
      ) {
        logger.info('Stream completed successfully');
        emitter.emit('end');
      }
    }
  } catch (error) {
    logger.error('Error in handleStream:', error);
    throw error;
  }
};

export const createBasicSearchRetrieverChain = (
  llm: BaseChatModel,
  config: RagSearchConfig,
): RunnableSequence => {
  const retrieverPrompt = injectPromptVariables(config.prompts.searchRetrieverPrompt);

  return RunnableSequence.from([
    PromptTemplate.fromTemplate(retrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      logger.debug('Search retriever input:', { input });

      // Handle not_needed case
      if (config.queryClassifier?.isNotNeeded(input)) {
        return { query: '', docs: [] };
      }

      // Handle search_terms format
      if (config.queryClassifier?.isTermQuery(input, 'search_terms')) {
        try {
          const searchTerms = parseXMLContent(input, 'term');
          logger.debug('Parsed search terms:', { searchTerms });

          if (searchTerms.length === 0) {
            logger.error('No search terms found in XML:', { input });
            return { query: '', docs: [] };
          }

          // Perform search for each term and combine results
          const searchPromises = searchTerms.map(term =>
            config.vectorStore.similaritySearch(term, 5)
          );

          const searchResults = await Promise.all(searchPromises);

          // Flatten and deduplicate results based on content
          const seenContent = new Set<string>();
          const uniqueDocs = searchResults.flat().filter(doc => {
            if (seenContent.has(doc.pageContent)) {
              return false;
            }
            seenContent.add(doc.pageContent);
            return true;
          });

          logger.debug('Combined search results:', {
            docs: uniqueDocs.map(doc => doc.metadata.title)
          });

          return {
            query: searchTerms.join(' + '),
            docs: uniqueDocs.slice(0, config.maxSourceCount || 15)
          };
        } catch (error) {
          logger.error('Error processing search terms:', error);
          return { query: '', docs: [] };
        }
      }

      // Handle regular queries (wrapped in <response> tags)
      const regularResponses = parseXMLContent(input, 'response');
      if (regularResponses.length > 0) {
        const query = regularResponses[0];
        const documents = await config.vectorStore.similaritySearch(
          query,
          config.maxSourceCount || 10
        );
        logger.debug('Vector store search results:', {
          documentCount: documents.length,
          firstDoc: documents[0]?.metadata?.title,
        });
        return { query, docs: documents };
      }

      logger.warn("Unexpected response format:", { input });
      // Fallback: treat input as direct query
      const documents = await config.vectorStore.similaritySearch(
        input,
        config.maxSourceCount || 10
      );
      return { query: input, docs: documents };
    }),
  ]);
};

export const attachSources = async (
  docs: Document<BookChunk>[],
): Promise<Document[]> => {
  return docs.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: {
      ...doc.metadata,
      title: doc.metadata.title,
      url: doc.metadata.sourceLink,
    },
  }));
};

export const processDocs = async (docs: Document[]): Promise<string> => {
  if (!docs.length) return 'NO_SOURCES_FOUND';

  return docs
    .map(
      (doc, i) =>
        `[${i + 1}] ${doc.pageContent}\nSource: ${
          doc.metadata.title || 'Unknown'
        }\n`,
    )
    .join('\n');
};

export const rerankDocs =
  (embeddings: Embeddings, similarityThreshold: number = 0.4) =>
  async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }): Promise<Document[]> => {
    logger.debug('Reranking docs input:', {
      query,
      docsLength: docs.length,
      firstDoc: docs[0],
    });

    if (docs.length === 0 || query === 'Summarize') {
      logger.info('Skipping reranking - empty docs or summarize query');
      return docs;
    }

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );
    logger.debug('Filtered documents with content:', {
      originalCount: docs.length,
      filteredCount: docsWithContent.length,
    });

    try {
      const [docEmbeddings, queryEmbedding] = await Promise.all([
        embeddings.embedDocuments(
          docsWithContent.map((doc) => doc.pageContent),
        ),
        embeddings.embedQuery(query),
      ]);
      logger.debug('Embeddings generated successfully');

      const similarity = docEmbeddings.map((docEmbedding, i) => ({
        index: i,
        similarity: computeSimilarity(queryEmbedding, docEmbedding),
      }));

      const rerankedDocs = similarity
        .filter((sim) => sim.similarity > similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map((sim) => docsWithContent[sim.index]);

      logger.info('Reranking completed', {
        inputDocs: docsWithContent.length,
        filteredDocs: rerankedDocs.length,
      });

      return rerankedDocs;
    } catch (error) {
      logger.error('Error in rerankDocs:', error);
      throw error;
    }
  };

export const createBasicSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  config: RagSearchConfig,
  basicSearchRetrieverChain: RunnableSequence,
) => {
  const regularPromptTemplate = ChatPromptTemplate.fromMessages([
    ['system', injectPromptVariables(config.prompts.searchResponsePrompt)],
    new MessagesPlaceholder('chat_history'),
    ['user', '{query}'],
  ]);

  const noSourcePromptTemplate = PromptTemplate.fromTemplate(
    config.prompts.noSourceFoundPrompt || 'No relevant information found.',
  );

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicSearchRetrieverChain
          .pipe(rerankDocs(embeddings, config.similarityThreshold))
          .pipe(attachSources)
          .withConfig({
            runName: 'FinalSourceRetriever',
          })
          .pipe(processDocs),
      ]),
    }),
    RunnableLambda.from(async (input) => {
      if (input.context === 'NO_SOURCES_FOUND') {
        return noSourcePromptTemplate.format({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        });
      } else {
        let context = input.context;

        // Check if this is a contract-related query by looking for XML search terms
        const isContractQuery_ = isContractQuery(input.query, context, config);

        // Only inject the template for contract-related queries
        if (isContractQuery_ && config.contractTemplate) {
          logger.debug('Contract-related query detected, injecting template');
          context += config.contractTemplate;
        }

        logger.debug('Input context:', {
          isContractQuery_,
          contextLength: context.length,
          query: input.query
        });

        return regularPromptTemplate.format({
          ...input,
          context
        });
      }
    }),
    llm,
    strParser,
  ]).withConfig({
    runName: 'FinalResponseGenerator',
  });
};

export const basicRagSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  config: RagSearchConfig,
): eventEmitter => {
  const emitter = new eventEmitter();

  logger.info('Starting RAG search', {
    query,
    historyLength: history.length,
  });

  try {
    logger.debug('Initializing search chain');
    const basicSearchRetrieverChain = createBasicSearchRetrieverChain(
      llm,
      config,
    );
    const basicSearchAnsweringChain = createBasicSearchAnsweringChain(
      llm,
      embeddings,
      config,
      basicSearchRetrieverChain,
    );

    logger.debug('Starting stream');
    const stream = basicSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: 'v1',
      },
    );

    handleStream(stream, emitter).catch((error) => {
      logger.error('Stream handling failed:', error);
      emitter.emit(
        'error',
        JSON.stringify({
          data: 'An error occurred while processing the stream',
        }),
      );
    });
  } catch (err) {
    logger.error('Error in basicRagSearch:', {
      error: err,
      query,
      historyLength: history.length,
    });
    emitter.emit(
      'error',
      JSON.stringify({ data: 'An error has occurred please try again later' }),
    );
  }

  return emitter;
};
