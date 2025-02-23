import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import { EventEmitter } from 'events';
import { RagAgentFactory } from '../ragAgentFactory';
import { LLMConfig } from '../../websocket/connectionManager';

export const handleSuccintCairoBookSearch = (
  message: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): EventEmitter => {
  return RagAgentFactory.createAgent(
    'succintCairoBook',
    message,
    history,
    llm,
    embeddings,
    additionalParams.vectorStore,
  );
};

export default handleSuccintCairoBookSearch;
