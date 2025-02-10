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
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';
import { getAgentConfig } from '../../config/agentConfigs';
import { getScarbVersion, getStarknetFoundryVersion } from '../../config';

const handleStarknetFoundrySearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): eventEmitter => {
  const config = getAgentConfig('starknetFoundry', additionalParams.vectorStore);
  return basicRagSearch(
    message,
    history,
    llm,
    embeddings,
    config,
  );
};

export default handleStarknetFoundrySearch;
