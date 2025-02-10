import { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';
import { getAgentConfig } from '../../config/agentConfigs';

const handleStarknetDocsSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): eventEmitter => {
  const config = getAgentConfig('starknetDocs', additionalParams.vectorStore);
  return basicRagSearch(
    message,
    history,
    llm,
    embeddings,
    config,
  );
};

export default handleStarknetDocsSearch;
