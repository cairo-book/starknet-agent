import eventEmitter from 'events';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '../../../agents/src/db/vectorStore';
import { BaseMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import { LLMConfig } from '@starknet-agent/agents/config';

export interface HandlerOptions {
  vectorStore?: VectorStore;
}

export type SearchHandler = (
  content: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  options: HandlerOptions,
) => eventEmitter;
