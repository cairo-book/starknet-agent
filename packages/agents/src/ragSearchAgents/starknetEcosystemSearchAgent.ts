import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { LLMConfig } from '../config/agentConfigs';
import { VectorStore } from '../db/vectorStore';
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
