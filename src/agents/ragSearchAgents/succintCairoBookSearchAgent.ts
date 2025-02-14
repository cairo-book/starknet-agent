import { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';
import { getAgentConfig } from '../../config/agentConfigs';
import { LLMConfig } from '../../websocket/connectionManager';

const handleSuccintCairoBookSearch = (
  message: string,
  history: BaseMessage[],
  llm: LLMConfig,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): eventEmitter => {
  const config = getAgentConfig(
    'succintCairoBook',
    additionalParams.vectorStore,
  );
  return basicRagSearch(message, history, llm, embeddings, config);
};

export default handleSuccintCairoBookSearch;
