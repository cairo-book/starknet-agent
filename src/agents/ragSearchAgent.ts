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
import { BookChunk } from '../types/types';
import { IterableReadableStream } from '@langchain/core/utils/stream';

const noSourceFoundPrompt = `
You are an AI assistant specialized in providing information about Starknet and Cairo. However, in this case, you were unable to find any relevant sources to answer the user's query.

Your response should be concise and honest, acknowledging that you don't have the information to answer the question accurately. Use a polite and helpful tone.

Here's how you should respond:

1. Apologize for not being able to find specific information.
2. Suggest that the user might want to rephrase their question with more specific terms, or provide more context.
3. Present your understanding of the user's query and suggest a new question that might be more relevant.

Example response:

"I apologize, but I couldn't find any specific information to answer your question about dicts accurately. It's possible that I don't have access to the relevant data, or the question might be outside my current knowledge base.
Perhaps you could rephrase your question to something like: "What is the default behavior in Cairo when accessing a key that hasn't been set in a Felt252Dict?"

Remember, it's better to admit when you don't have the information rather than providing potentially incorrect or misleading answers.

<query>
{query}
</query>

Always maintain a helpful and professional tone in your response. Do not invent information or make assumptions beyond what's provided in the context.
`;

const strParser = new StringOutputParser();

export type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

export const handleStream = async (
  stream: IterableReadableStream<StreamEvent>,
  emitter: eventEmitter,
): Promise<void> => {
  logger.info('Starting stream handling');
  try {
    for await (const event of stream) {
      logger.debug('Stream event received:', {
        eventType: event.event,
        name: event.name,
      });

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
        logger.debug('Response chunk received');
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
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
): RunnableSequence => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(searchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      logger.debug('Search retriever input:', { input });
      if (input === 'not_needed') {
        return { query: '', docs: [] };
      }

      const documents = await vectorStore.similaritySearch(input, 5);
      logger.debug('Vector store search results:', {
        documentCount: documents.length,
        firstDoc: documents[0],
      });
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
  if (docs.length === 0) {
    return 'NO_SOURCES_FOUND';
  }
  return docs
    .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
    .join('\n');
};

export const rerankDocs =
  (embeddings: Embeddings) =>
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
        .filter((sim) => sim.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 15)
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
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
  searchResponsePrompt: string,
  noSourceFoundPrompt: string,
) => {
  const basicSearchRetrieverChain = createBasicSearchRetrieverChain(
    llm,
    vectorStore,
    searchRetrieverPrompt,
  );

  const regularPromptTemplate = ChatPromptTemplate.fromMessages([
    ['system', searchResponsePrompt],
    new MessagesPlaceholder('chat_history'),
    ['user', '{query}'],
  ]);

  const noSourcePromptTemplate =
    PromptTemplate.fromTemplate(noSourceFoundPrompt);

  const strParser = new StringOutputParser();

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
          .pipe(rerankDocs(embeddings))
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
        return regularPromptTemplate.format(input);
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
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
  searchResponsePrompt: string,
): eventEmitter => {
  const emitter = new eventEmitter();

  logger.info('Starting RAG search', {
    query,
    historyLength: history.length,
  });

  try {
    logger.debug('Initializing search chain');
    const basicSearchAnsweringChain = createBasicSearchAnsweringChain(
      llm,
      embeddings,
      vectorStore,
      searchRetrieverPrompt,
      searchResponsePrompt,
      noSourceFoundPrompt,
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
