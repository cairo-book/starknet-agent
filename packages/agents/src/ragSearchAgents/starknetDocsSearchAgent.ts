import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { EventEmitter } from 'events';
import { RagAgentFactory } from '../ragAgentFactory';
import { LLMConfig } from '../config/agentConfigs';
import { VectorStore } from '../db/vectorStore';

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
