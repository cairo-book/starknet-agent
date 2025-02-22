import express, { Router } from 'express';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import {
  getGroqApiKey,
  getOllamaApiEndpoint,
  getAnthropicApiKey,
  getOpenaiApiKey,
  getDeepseekApiKey,
  updateConfig,
  isHostedMode,
  getGeminiApiKey,
} from '../config';

const router: Router = express.Router();

router.get('/', async (_, res) => {
  if (isHostedMode()) {
    return res
      .status(403)
      .json({ error: 'This route is disabled in hosted mode' });
  }
  const config = {};

  const [chatModelProviders, embeddingModelProviders] = await Promise.all([
    getAvailableChatModelProviders(),
    getAvailableEmbeddingModelProviders(),
  ]);

  config['chatModelProviders'] = {};
  config['embeddingModelProviders'] = {};

  for (const provider in chatModelProviders) {
    config['chatModelProviders'][provider] = Object.keys(
      chatModelProviders[provider],
    );
  }

  for (const provider in embeddingModelProviders) {
    config['embeddingModelProviders'][provider] = Object.keys(
      embeddingModelProviders[provider],
    );
  }

  config['openaiApiKey'] = getOpenaiApiKey();
  config['ollamaApiUrl'] = getOllamaApiEndpoint();
  config['anthropicApiKey'] = getAnthropicApiKey();
  config['groqApiKey'] = getGroqApiKey();
  config['deepseekApiKey'] = getDeepseekApiKey();
  config['geminiApiKey'] = getGeminiApiKey();

  res.status(200).json(config);
});

router.post('/', async (req, res) => {
  if (isHostedMode()) {
    return res
      .status(403)
      .json({ error: 'This route is disabled in hosted mode' });
  }
  const config = req.body;

  const updatedConfig = {
    API_KEYS: {
      OPENAI: config.openaiApiKey,
      GROQ: config.groqApiKey,
      ANTHROPIC: config.anthropicApiKey,
      DEEPSEEK: config.deepseekApiKey,
      GEMINI: config.geminiApiKey,
    },
    API_ENDPOINTS: {
      OLLAMA: config.ollamaApiUrl,
    },
  };

  updateConfig(updatedConfig);

  res.status(200).json({ message: 'Config updated' });
});

export default router;
