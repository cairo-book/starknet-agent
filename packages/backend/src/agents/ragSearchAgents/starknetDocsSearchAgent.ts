import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import { EventEmitter } from 'events';
import { LLMConfig } from '../../websocket/connectionManager';
import { RagAgentFactory } from '../ragAgentFactory';

export const handleStarknetDocsSearch = (
  message: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): EventEmitter => {
  return RagAgentFactory.createAgent(
    'starknetDocs',
    message,
    history,
    llm,
    embeddings,
    additionalParams.vectorStore,
  );
};

export default handleStarknetDocsSearch;
