/**
 * @file starknetFoundrySearchAgent.ts
 * @description This file implements a search agent for the Starknet Foundry documentation.
 * It uses LangChain to create a chain of operations for processing user queries,
 * retrieving relevant information, and generating responses.
 *
 * Key components:
 * - basicSearchRetrieverPrompt: Prompt for rephrasing user queries
 * - basicStarknetFoundrySearchResponsePrompt: System prompt for the AI assistant
 * - handleStarknetFoundrySearch: Main function that processes queries using basicRagSearch
 */

import { BaseMessage } from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import { EventEmitter } from 'events';
import { RagAgentFactory } from '../ragAgentFactory';
import { LLMConfig } from '../config/agentConfigs';
import { VectorStore } from '../db/vectorStore';

export const handleStarknetFoundrySearch = (
  message: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): EventEmitter => {
  return RagAgentFactory.createAgent(
    'starknetFoundry',
    message,
    history,
    llm,
    embeddings,
    additionalParams.vectorStore,
  );
};

export default handleStarknetFoundrySearch;
