import { AIMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/messages';
import { getCairoDbConfig, getStarknetEcosystemDbConfig } from '../../config';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { LLMConfig } from '../../websocket/connectionManager';
import { VectorStore } from '../../db/vectorStore';
import { getAgentConfig } from '../../config/agentConfigs';
import { basicRagSearch } from '../../agents/ragSearchAgent';
import { Request, Response } from 'express';

interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
    name?: string;
    function_call?: {
      name: string;
      arguments: string;
    };
  }>;
  functions?: Array<{
    name: string;
    description?: string;
    parameters: Record<string, any>;
  }>;
  function_call?: string | { name: string };
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters: Record<string, any>;
    };
  }>;
  tool_choice?: string | { type: string; function: { name: string } };
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  response_format?: { type: 'text' | 'json_object' };
}

export const chatEndpoint = async (req, res) => {
  try {
    const {
      model,
      messages,
      temperature = 0.7,
      top_p = 1,
      n = 1,
      stream = false,
      response_format,
    } = req.body as ChatCompletionRequest;

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: messages array is missing.',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'invalid_messages',
        },
      });
    }

    const chatModel = req.app.locals.defaultLLM;
    const fastChatModel = req.app.locals.fastLLM;
    const embeddings = req.app.locals.embeddings;

    if (!chatModel || !fastChatModel || !embeddings) {
      return res.status(500).json({
        error: {
          message: 'Internal Server Error',
        },
      });
    }

    // Convert messages to LangChain format
    const langChainMessages = convertToLangChainMessages(messages);

    // Get the last user message as the query
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== 'user') {
      return res.status(400).json({
        error: {
          message: 'Last message must be from user',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'invalid_last_message',
        },
      });
    }

    // Call RAG search
    const llmConfig: LLMConfig = {
      defaultLLM: chatModel,
      fastLLM: fastChatModel,
    };

    //TODO: this should likely not be done here
    const dbConfig = getCairoDbConfig();
    const vectorStore = await VectorStore.getInstance(dbConfig, embeddings);
    const config = getAgentConfig('cairoCoder', vectorStore);
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
    }

    handler.on('data', (data) => {
      const parsed = JSON.parse(data);

      if (parsed.type === 'response') {
        response_text += parsed.data;

        // If streaming and we have content to send
        if (stream && parsed.data) {
          const chunk = {
            id: uuidv4(),
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: model,
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
      }
    });

    handler.on('end', () => {
      if (stream) {
        // Send final chunk with finish_reason
        const finalChunk = {
          id: uuidv4(),
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: model,
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
          id: uuidv4(),
          object: 'chat.completion',
          created: Date.now(),
          model: model,
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
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };

        res.json(responsePayload);
        return;
      }
    });
  } catch (error) {
    logger.error('Error in /v1/chat/completions:', error);

    // Map common errors to OpenAI error format
    if (error instanceof Error) {
      const errorResponse: any = {
        error: {
          message: error.message,
          type: 'server_error',
          code: 'internal_error',
        },
      };

      // Map specific error types
      if (error.message.includes('rate limit')) {
        errorResponse.error.type = 'rate_limit_error';
        errorResponse.error.code = 'rate_limit_exceeded';
        return res.status(429).json(errorResponse);
      }

      if (error.message.includes('invalid')) {
        errorResponse.error.type = 'invalid_request_error';
        return res.status(400).json(errorResponse);
      }

      return res.status(500).json(errorResponse);
    }

    // Generic error
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        type: 'server_error',
        code: 'internal_error',
      },
    });
  }
};

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
