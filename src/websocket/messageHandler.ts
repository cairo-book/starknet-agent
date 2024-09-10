import { EventEmitter, WebSocket } from 'ws';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import logger from '../utils/logger';
import db from '../db';
import { chats, messages } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
  getCairoDbConfig,
  getStarknetDbConfig,
  getStarknetEcosystemDbConfig,
  VectorStoreConfig,
} from '../config';
import { VectorStore } from '../db/vectorStore';
import handleCairoBookSearch from '../agents/ragSearchAgents/cairoBookSearchAgent';
import { HandlerOptions, SearchHandler } from '../types/types';
import handleStarknetDocsSearch from '../agents/ragSearchAgents/starknetDocsSearchAgent';
import handleStarknetEcosystemSearch from '../agents/ragSearchAgents/starknetEcosystemSearchAgent';

type Message = {
  messageId: string;
  chatId: string;
  content: string;
};

type WSMessage = {
  message: Message;
  copilot: boolean;
  type: string;
  focusMode: string;
  history: Array<[string, string]>;
};

const searchHandlers: Record<string, SearchHandler> = {
  cairoBookSearch: handleCairoBookSearch,
  starknetDocsSearch: handleStarknetDocsSearch,
  starknetEcosystemSearch: handleStarknetEcosystemSearch,
};

const searchDatabases: Record<string, () => VectorStoreConfig> = {
  cairoBookSearch: getCairoDbConfig,
  starknetDocsSearch: getStarknetDbConfig,
  starknetEcosystemSearch: getStarknetEcosystemDbConfig,
};

const handleEmitterEvents = (
  emitter: EventEmitter,
  ws: WebSocket,
  messageId: string,
  chatId: string,
) => {
  let recievedMessage = '';
  let sources = [];

  emitter.on('data', (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'response') {
      ws.send(
        JSON.stringify({
          type: 'message',
          data: parsedData.data,
          messageId: messageId,
        }),
      );
      recievedMessage += parsedData.data;
    } else if (parsedData.type === 'sources') {
      ws.send(
        JSON.stringify({
          type: 'sources',
          data: parsedData.data,
          messageId: messageId,
        }),
      );
      sources = parsedData.data;
    }
  });
  emitter.on('end', () => {
    ws.send(JSON.stringify({ type: 'messageEnd', messageId: messageId }));

    db.insert(messages)
      .values({
        content: recievedMessage,
        chatId: chatId,
        messageId: messageId,
        role: 'assistant',
        metadata: JSON.stringify({
          createdAt: new Date(),
          ...(sources && sources.length > 0 && { sources }),
        }),
      })
      .execute();
  });
  emitter.on('error', (data) => {
    const parsedData = JSON.parse(data);
    ws.send(
      JSON.stringify({
        type: 'error',
        data: parsedData.data,
        key: 'CHAIN_ERROR',
      }),
    );
  });
};

export const handleMessage = async (
  message: string,
  ws: WebSocket,
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  try {
    const parsedWSMessage = JSON.parse(message) as WSMessage;
    const parsedMessage = parsedWSMessage.message;

    const id = crypto.randomBytes(7).toString('hex');

    if (!parsedMessage.content)
      return ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Invalid message format',
          key: 'INVALID_FORMAT',
        }),
      );

    const history: BaseMessage[] = parsedWSMessage.history.map((msg) => {
      if (msg[0] === 'human') {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });

    if (parsedWSMessage.type === 'message') {
      const handler = searchHandlers[parsedWSMessage.focusMode];
      const dbConfigGetter = searchDatabases[parsedWSMessage.focusMode];

      if (handler) {
        let handlerOptions: HandlerOptions = {};

        if (dbConfigGetter) {
          const dbConfig = dbConfigGetter();
          try {
            const vectorStore = await VectorStore.initialize(
              dbConfig,
              embeddings,
            );
            logger.info('VectorStore initialized successfully');
            handlerOptions.vectorStore = vectorStore;
          } catch (error) {
            logger.error('Failed to initialize VectorStore:', error);
            ws.send(
              JSON.stringify({
                type: 'error',
                data: 'Failed to initialize VectorStore',
                key: 'VECTOR_STORE_ERROR',
              }),
            );
            return; // Stop execution if there's an error
          }
        }

        const emitter = handler(
          parsedMessage.content,
          history,
          llm,
          embeddings,
          handlerOptions,
        );

        handleEmitterEvents(emitter, ws, id, parsedMessage.chatId);

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, parsedMessage.chatId),
        });

        if (!chat) {
          await db
            .insert(chats)
            .values({
              id: parsedMessage.chatId,
              title: parsedMessage.content,
              createdAt: new Date().toString(),
              focusMode: parsedWSMessage.focusMode,
            })
            .execute();
        }

        await db
          .insert(messages)
          .values({
            content: parsedMessage.content,
            chatId: parsedMessage.chatId,
            messageId: id,
            role: 'user',
            metadata: JSON.stringify({
              createdAt: new Date(),
            }),
          })
          .execute();
      } else {
        ws.send(
          JSON.stringify({
            type: 'error',
            data: 'Invalid focus mode',
            key: 'INVALID_FOCUS_MODE',
          }),
        );
      }
    }
  } catch (err) {
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Invalid message format',
        key: 'INVALID_FORMAT',
      }),
    );
    logger.error(`Failed to handle message: ${err}`);
  }
};
