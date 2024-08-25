import eventEmitter from 'events';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '../db/vectorStore';
import { BaseMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';

export interface HandlerOptions {
  vectorStore?: VectorStore;
}

export type SearchHandler = (
  content: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  options: HandlerOptions,
) => eventEmitter;

export type BookChunk = {
  name: string;
  title: string;
  chunkNumber: number;
  contentHash: string;
  uniqueId: string;
  sourceLink: string;
};
