import { WebSocket } from 'ws';
import { handleMessage } from './messageHandler';
import {
  getAvailableEmbeddingModelProviders,
  getAvailableChatModelProviders,
} from '../lib/providers';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import type { IncomingMessage } from 'http';
import logger from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { getHostedModeConfig } from '../config';

export interface LLMConfig {
  defaultLLM: BaseChatModel;
  fastLLM?: BaseChatModel;
}

export const handleConnection = async (
  ws: WebSocket,
  request: IncomingMessage,
) => {
  try {
    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    const hostedModeConfig = getHostedModeConfig();

    // Default LLM setup
    const chatModelProvider =
      chatModelProviders[hostedModeConfig.DEFAULT_CHAT_PROVIDER];
    const chatModel =
      chatModelProviders[hostedModeConfig.DEFAULT_CHAT_PROVIDER][
        hostedModeConfig.DEFAULT_CHAT_MODEL
      ];

    // Fast LLM setup
    const fastChatModelProvider =
      chatModelProviders[hostedModeConfig.DEFAULT_FAST_CHAT_PROVIDER];
    const fastChatModel =
      chatModelProviders[hostedModeConfig.DEFAULT_FAST_CHAT_PROVIDER][
        hostedModeConfig.DEFAULT_FAST_CHAT_MODEL
      ];

      // Embedding model setup
      const embeddingModelProvider =
        embeddingModelProviders[hostedModeConfig.DEFAULT_EMBEDDING_PROVIDER];
      const embeddingModel = embeddingModelProvider[
        hostedModeConfig.DEFAULT_EMBEDDING_MODEL
      ];

      let defaultLLM: BaseChatModel | undefined;
      let fastLLM: BaseChatModel | undefined;
      let embeddings: Embeddings | undefined;

    // Initialize default LLM
      defaultLLM = chatModel
      fastLLM = fastChatModel
      embeddings = embeddingModel

      if (!defaultLLM || !embeddings) {
      logger.error('Invalid LLM or embeddings model selected, please refresh the page and try again.');
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Invalid LLM or embeddings model selected, please refresh the page and try again.',
          key: 'INVALID_MODEL_SELECTED',
        }),
      );
      ws.close();
    }

    const llmConfig: LLMConfig = {
      defaultLLM,
      fastLLM,
    };

    console.log(llmConfig);
    console.log(chatModelProviders)

    ws.on(
      'message',
      async (message) =>
        await handleMessage(message.toString(), ws, llmConfig, embeddings),
    );

    ws.on('close', () => logger.debug('Connection closed'));
  } catch (err) {
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Internal server error.',
        key: 'INTERNAL_SERVER_ERROR',
      }),
    );
    ws.close();
    logger.error(err);
  }
};
