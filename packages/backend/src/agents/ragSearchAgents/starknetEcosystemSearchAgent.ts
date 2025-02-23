import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import { LLMConfig } from '../../websocket/connectionManager';
import { EventEmitter } from 'events';
import { RagAgentFactory } from '../ragAgentFactory';

export const handleStarknetEcosystemSearch = (
  message: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): EventEmitter => {
  return RagAgentFactory.createAgent(
    'starknetEcosystem',
    message,
    history,
    llm,
    embeddings,
    additionalParams.vectorStore,
  );
};

export default handleStarknetEcosystemSearch;
