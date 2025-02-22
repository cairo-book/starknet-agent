import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';

const configFileName = 'config.toml';

export interface VectorStoreConfig {
  MONGODB_URI: string;
  DB_NAME: string;
  COLLECTION_NAME: string;
}

interface Config {
  GENERAL: {
    PORT: number;
    SIMILARITY_MEASURE: string;
  };
  CAIRO_DB: VectorStoreConfig;
  STARKNET_DB: VectorStoreConfig;
  ECOSYSTEM_DB: VectorStoreConfig;
  STARKNET_FOUNDRY_DB: VectorStoreConfig;
  API_KEYS: {
    OPENAI: string;
    GROQ: string;
    ANTHROPIC: string;
    DEEPSEEK: string;
    GEMINI: string;
  };
  API_ENDPOINTS: {
    OLLAMA: string;
  };
  HOSTED_MODE?: {
    DEFAULT_CHAT_PROVIDER: string;
    DEFAULT_CHAT_MODEL: string;
    DEFAULT_FAST_CHAT_PROVIDER: string;
    DEFAULT_FAST_CHAT_MODEL: string;
    DEFAULT_EMBEDDING_PROVIDER: string;
    DEFAULT_EMBEDDING_MODEL: string;
  };
  VERSIONS: {
    STARKNET_FOUNDRY: string;
    SCARB: string;
  };
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const loadConfig = () =>
  toml.parse(
    fs.readFileSync(path.join(__dirname, `../${configFileName}`), 'utf-8'),
  ) as any as Config;

export const isHostedMode = () => loadConfig().HOSTED_MODE !== undefined;

export const getHostedModeConfig = () => loadConfig().HOSTED_MODE;

export const getPort = () => loadConfig().GENERAL.PORT;

export const getSimilarityMeasure = () =>
  loadConfig().GENERAL.SIMILARITY_MEASURE;

export const getOpenaiApiKey = () => loadConfig().API_KEYS.OPENAI;

export const getGroqApiKey = () => loadConfig().API_KEYS.GROQ;

export const getAnthropicApiKey = () => loadConfig().API_KEYS.ANTHROPIC;

export const getDeepseekApiKey = () => loadConfig().API_KEYS.DEEPSEEK;

export const getGeminiApiKey = () => loadConfig().API_KEYS.GEMINI;

export const getOllamaApiEndpoint = () => loadConfig().API_ENDPOINTS.OLLAMA;

export const getCairoDbConfig = () => loadConfig().CAIRO_DB;

export const getStarknetFoundryDbConfig = () =>
  loadConfig().STARKNET_FOUNDRY_DB;

export const getStarknetDbConfig = () => loadConfig().STARKNET_DB;

export const getStarknetEcosystemDbConfig = () => loadConfig().ECOSYSTEM_DB;

export const updateConfig = (config: RecursivePartial<Config>) => {
  const currentConfig = loadConfig();

  for (const key in currentConfig) {
    if (!config[key]) config[key] = {};

    if (typeof currentConfig[key] === 'object' && currentConfig[key] !== null) {
      for (const nestedKey in currentConfig[key]) {
        if (
          !config[key][nestedKey] &&
          currentConfig[key][nestedKey] &&
          config[key][nestedKey] !== ''
        ) {
          config[key][nestedKey] = currentConfig[key][nestedKey];
        }
      }
    } else if (currentConfig[key] && config[key] !== '') {
      config[key] = currentConfig[key];
    }
  }

  fs.writeFileSync(
    path.join(__dirname, `../${configFileName}`),
    toml.stringify(config),
  );
};

export const getStarknetFoundryVersion = () =>
  loadConfig().VERSIONS.STARKNET_FOUNDRY;
export const getScarbVersion = () => loadConfig().VERSIONS.SCARB;
