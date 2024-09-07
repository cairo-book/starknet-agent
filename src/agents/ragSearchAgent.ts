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

const strParser = new StringOutputParser();

export type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

export const handleStream = async (
  stream: IterableReadableStream<StreamEvent>,
  emitter: eventEmitter,
): Promise<void> => {
  for await (const event of stream) {
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalSourceRetriever'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'sources', data: event.data.output }),
      );
    }
    if (
      event.event === 'on_chain_stream' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'response', data: event.data.chunk }),
      );
    }
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit('end');
    }
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
      if (input === 'not_needed') {
        return { query: '', docs: [] };
      }

      const documents = await vectorStore.similaritySearch(input, 5);
      vectorStore.close();

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
    if (docs.length === 0 || query === 'Summarize') {
      return docs;
    }

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );

    const [docEmbeddings, queryEmbedding] = await Promise.all([
      embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
      embeddings.embedQuery(query),
    ]);

    const similarity = docEmbeddings.map((docEmbedding, i) => ({
      index: i,
      similarity: computeSimilarity(queryEmbedding, docEmbedding),
    }));

    return similarity
      .filter((sim) => sim.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 15)
      .map((sim) => docsWithContent[sim.index]);
  };

export const createBasicSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
  searchResponsePrompt: string,
) => {
  const basicSearchRetrieverChain = createBasicSearchRetrieverChain(
    llm,
    vectorStore,
    searchRetrieverPrompt,
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
          .pipe(rerankDocs(embeddings))
          .pipe(attachSources)
          .withConfig({
            runName: 'FinalSourceRetriever',
          })
          .pipe(processDocs),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ['system', searchResponsePrompt],
      new MessagesPlaceholder('chat_history'),
      ['user', '{query}'],
    ]),
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

  try {
    const basicSearchAnsweringChain = createBasicSearchAnsweringChain(
      llm,
      embeddings,
      vectorStore,
      searchRetrieverPrompt,
      searchResponsePrompt,
    );

    const stream = basicSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: 'v1',
      },
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      'error',
      JSON.stringify({ data: 'An error has occurred please try again later' }),
    );
    logger.error(`Error in Search: ${err}`);
  }

  return emitter;
};
