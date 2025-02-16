import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { basicRagSearch } from '../agents/ragSearchAgent';
import { BaseMessage } from '@langchain/core/messages';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { LLMConfig } from '../websocket/connectionManager';
import { getHostedModeConfig, getStarknetEcosystemDbConfig } from '../config';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import EventEmitter from 'events';
import { getAgentConfig } from '../config/agentConfigs';
import { VectorStore } from '../db/vectorStore';

const router = express.Router();

// Convert OpenAI message format to LangChain format
function convertToLangChainMessages(messages: any[]): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content);
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unsupported message role: ${msg.role}`);
    }
  });
}

router.post('/chat/completions', async (req, res) => {
  try {
    const {
      model,
      messages,
      temperature = 0.7,
      top_p = 1,
      n = 1,
      stream = false,
    } = req.body;

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: messages array is missing.',
          type: 'invalid_request_error',
        },
      });
    }

    // Get hosted mode config and embeddings
    const hostedModeConfig = getHostedModeConfig();
    const embeddingModelProviders = await getAvailableEmbeddingModelProviders();
    const embeddingModelProvider =
      embeddingModelProviders[hostedModeConfig.DEFAULT_EMBEDDING_PROVIDER];
    const embeddings =
      embeddingModelProvider[hostedModeConfig.DEFAULT_EMBEDDING_MODEL];

    const chatModelProviders = await getAvailableChatModelProviders();
    const chatModelProvider =
      chatModelProviders[hostedModeConfig.DEFAULT_CHAT_PROVIDER];
    const chatModel = chatModelProvider[hostedModeConfig.DEFAULT_CHAT_MODEL];

    const fastChatModelProviders = await getAvailableChatModelProviders();
    const fastChatModelProvider =
      fastChatModelProviders[hostedModeConfig.DEFAULT_FAST_CHAT_PROVIDER];
    const fastChatModel =
      fastChatModelProvider[hostedModeConfig.DEFAULT_FAST_CHAT_MODEL];

    // Convert messages to LangChain format
    const langChainMessages = convertToLangChainMessages(messages);

    // Get the last user message as the query
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== 'user') {
      return res.status(400).json({
        error: {
          message: 'Last message must be from user',
          type: 'invalid_request_error',
        },
      });
    }

    // Call RAG search
    const llmConfig: LLMConfig = {
      defaultLLM: chatModel,
      fastLLM: fastChatModel,
    };

    const dbConfig = getStarknetEcosystemDbConfig();
    const vectorStore = await VectorStore.getInstance(dbConfig, embeddings);
    const config = getAgentConfig('cairoBook', vectorStore);
    let response_text = '';

    // Stream the response
    const handler = basicRagSearch(
      lastUserMessage.content,
      langChainMessages,
      llmConfig,
      embeddings,
      config,
    );

    if (stream) {
      // Set streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Correlation-ID', uuidv4());
    }

    handler.on('data', (data) => {
      const parsed = JSON.parse(data);
      response_text += parsed.data;
      // If the message is a response, send a chunk
      if (parsed.type == 'response' && stream) {
        logger.debug('Parsed:', parsed);
        const chunk = {
          id: uuidv4(),
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'CairoCoder',
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                content: parsed.data,
              },
              finish_reason: null,
            },
          ],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    });

    handler.on('end', () => {
      // Send final chunk with finish_reason
      if (stream) {
        const finalChunk = {
          id: uuidv4(),
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'CairoCoder',
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Build the response object in OpenAI API-compatible format
        const responsePayload = {
          id: 'uuidv4()',
          object: 'chat.completion',
          created: Date.now(),
          model: 'CairoCoder',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: response_text,
              },
              logprobs: null,
              finish_reason: 'stop',
            },
          ],
          service_tier: 'default',
          usage: {
            prompt_tokens: 9,
            completion_tokens: 12,
            total_tokens: 21,
            completion_tokens_details: {
              reasoning_tokens: 0,
              accepted_prediction_tokens: 0,
              rejected_prediction_tokens: 0,
            },
          },
        };

        res.json(responsePayload);
        return;
      }
    });
  } catch (error) {
    logger.error('Error in /v1/chat/completions:', error);
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        type: 'server_error',
      },
    });
  }
});

// Models endpoint to list available models
router.get('/models', async (req, res) => {
  try {
    const hostedModeConfig = getHostedModeConfig();

    // Return a simplified list of models
    const models = [
      {
        id: hostedModeConfig.DEFAULT_CHAT_MODEL,
        object: 'model',
        created: Date.now(),
        owned_by: 'custom',
      },
      {
        id: hostedModeConfig.DEFAULT_FAST_CHAT_MODEL,
        object: 'model',
        created: Date.now(),
        owned_by: 'custom',
      },
      {
        id: hostedModeConfig.DEFAULT_EMBEDDING_MODEL,
        object: 'model',
        created: Date.now(),
        owned_by: 'custom',
      },
    ];

    res.json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    logger.error('Error in /v1/models:', error);
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        type: 'server_error',
      },
    });
  }
});

export default router;
