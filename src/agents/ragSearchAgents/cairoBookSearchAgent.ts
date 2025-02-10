/**
 * @file cairoBookSearchAgent.ts
 * @description This file implements a search agent for the Cairo Book documentation.
 * It uses LangChain to create a chain of operations for processing user queries,
 * retrieving relevant information, and generating responses.
 *
 * Key components:
 * - basicSearchRetrieverPrompt: Prompt for rephrasing user queries
 * - basicCairoBookSearchResponsePrompt: System prompt for the AI assistant
 * - createBasicCairoBookSearchRetrieverChain: Creates a chain for retrieving relevant documents
 * - createBasicCairoBookSearchAnsweringChain: Creates the main chain for processing queries and generating responses
 * - handleStream: Processes the stream of events from the chain
 * - basicCairoBookSearch: Main function that sets up and runs the search process
 * - handleCairoBookSearch: Wrapper function for basicCairoBookSearch
 *
 * The agent uses a vector store to perform similarity searches on the Cairo Book documentation,
 * reranks the results, and generates responses based on the retrieved information.
 */

import { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';
import { getAgentConfig } from '../../config/agentConfigs';

const handleCairoBookSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): eventEmitter => {
  const config = getAgentConfig('cairoBook', additionalParams.vectorStore);
  return basicRagSearch(
    message,
    history,
    llm,
    embeddings,
    config,
  );
};

export default handleCairoBookSearch;
