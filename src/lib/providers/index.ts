import { loadGroqChatModels } from './groq';
import { loadOllamaChatModels, loadOllamaEmbeddingsModels } from './ollama';
import { loadOpenAIChatModels, loadOpenAIEmbeddingsModels } from './openai';
import { loadAnthropicChatModels } from './anthropic';
import { loadDeepseekChatModels } from './deepseek';
import { loadTransformersEmbeddingsModels } from './transformers';
import { getHostedModeConfig, isHostedMode } from '../../config';

const chatModelProviders = {
  openai: loadOpenAIChatModels,
  groq: loadGroqChatModels,
  ollama: loadOllamaChatModels,
  anthropic: loadAnthropicChatModels,
  deepseek: loadDeepseekChatModels,
};

const embeddingModelProviders = {
  openai: loadOpenAIEmbeddingsModels,
  local: loadTransformersEmbeddingsModels,
  ollama: loadOllamaEmbeddingsModels,
};

export const getAvailableChatModelProviders = async () => {
  const models = {};

  for (const provider in chatModelProviders) {
    const providerModels = await chatModelProviders[provider]();
    if (Object.keys(providerModels).length > 0) {
      models[provider] = providerModels;
    }
  }

  if (isHostedMode()) {
    const hostedModeConfig = getHostedModeConfig();
    const hosted_model =
      models[hostedModeConfig.DEFAULT_CHAT_PROVIDER][
        hostedModeConfig.DEFAULT_CHAT_MODEL
      ];
    return {
      [hostedModeConfig.DEFAULT_CHAT_PROVIDER]: {
        [hostedModeConfig.DEFAULT_CHAT_MODEL]: hosted_model,
      },
    };
  }

  models['custom_openai'] = {};

  return models;
};

export const getAvailableEmbeddingModelProviders = async () => {
  const models = {};

  for (const provider in embeddingModelProviders) {
    const providerModels = await embeddingModelProviders[provider]();
    if (Object.keys(providerModels).length > 0) {
      models[provider] = providerModels;
    }
  }

  if (isHostedMode()) {
    const hostedModeConfig = getHostedModeConfig();
    const hosted_model =
      models[hostedModeConfig.DEFAULT_EMBEDDING_PROVIDER][
        hostedModeConfig.DEFAULT_EMBEDDING_MODEL
      ];
    return {
      [hostedModeConfig.DEFAULT_EMBEDDING_PROVIDER]: {
        [hostedModeConfig.DEFAULT_EMBEDDING_MODEL]: hosted_model,
      },
    };
  }

  return models;
};
