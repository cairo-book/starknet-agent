import { WebSocket } from 'ws';
import { handleMessage } from './messageHandler';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IncomingMessage } from 'http';
import logger from '../utils/logger';
import { getModelConfig } from '../lib/modelProviderService';

export interface LLMConfig {
  defaultLLM: BaseChatModel;
  fastLLM?: BaseChatModel;
}

export const handleConnection = async (
  ws: WebSocket,
  request: IncomingMessage,
) => {
  try {
    const modelConfig = getModelConfig();
    const { defaultLLM, fastLLM, embeddings } = modelConfig;

    if (!defaultLLM || !embeddings) {
      logger.error(
        'Invalid LLM or embeddings model selected, please refresh the page and try again.',
      );
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Invalid LLM or embeddings model selected, please refresh the page and try again.',
          key: 'INVALID_MODEL_SELECTED',
        }),
      );
      ws.close();
      return;
    }

    const llmConfig: LLMConfig = {
      defaultLLM,
      fastLLM,
    };

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
