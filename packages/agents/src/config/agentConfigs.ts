import { basicContractTemplate } from './templates/contractTemplate';
import {
  cairoBookPrompts,
  cairoCoderPrompts,
  starknetDocsPrompts,
  starknetEcosystemPrompts,
  starknetFoundryPrompts,
  docChatModePrompts,
  cairoByExamplePrompts,
  scarbDocsPrompts,
  starknetJSPrompts,
} from './prompts';
import { basicTestTemplate } from './templates/testTemplate';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '../db/vectorStore';
import { DocumentSource, RagSearchConfig } from '../core/types';

export interface LLMConfig {
  defaultLLM: BaseChatModel;
  fastLLM?: BaseChatModel;
}

export const parseXMLContent = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
  const matches = [...xml.matchAll(regex)];
  return matches.map((match) => match[1].trim());
};

export type AvailableAgents =
  | 'cairoBook'
  | 'starknetDocs'
  | 'starknetEcosystem'
  | 'starknetFoundry'
  | 'docChatMode'
  | 'cairoCoder'
  | 'cairoByExample'
  | 'openZeppelinDocs'
  | 'scarbDocs'
  | 'starknetJS';

// We'll make this a factory function instead of a static object
export const createAgentConfigs = (
  vectorStore: VectorStore,
): Record<AvailableAgents, RagSearchConfig> => ({
  cairoBook: {
    name: 'Cairo Book',
    prompts: cairoBookPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.CAIRO_BOOK],
  },

  starknetDocs: {
    name: 'Starknet Docs',
    prompts: starknetDocsPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.STARKNET_DOCS],
  },

  starknetEcosystem: {
    name: 'Starknet Ecosystem',
    prompts: starknetEcosystemPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 15,
    similarityThreshold: 0.35,
    sources: Object.values(DocumentSource),
  },

  starknetFoundry: {
    name: 'Starknet Foundry',
    prompts: starknetFoundryPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.STARKNET_FOUNDRY],
  },

  docChatMode: {
    name: 'Doc Chat Mode',
    prompts: docChatModePrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 5,
    similarityThreshold: 0.5,
    sources: [DocumentSource.CAIRO_BOOK],
  },

  cairoCoder: {
    name: 'Cairo Coder',
    prompts: cairoCoderPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 15,
    similarityThreshold: 0.35,
    sources: [
      DocumentSource.CAIRO_BOOK,
      DocumentSource.CAIRO_BY_EXAMPLE,
      DocumentSource.STARKNET_FOUNDRY,
    ],
  },

  cairoByExample: {
    name: 'Cairo By Example',
    prompts: cairoByExamplePrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.CAIRO_BY_EXAMPLE],
  },

  openZeppelinDocs: {
    name: 'OpenZeppelin Docs',
    //TODO: make special prompts for openzeppelin docs
    prompts: cairoBookPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.OPENZEPPELIN_DOCS],
  },
  scarbDocs: {
    name: 'Scarb Docs',
    prompts: scarbDocsPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.SCARB_DOCS],
  },
  starknetJS: {
    name: 'Starknet.js',
    prompts: starknetJSPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    maxSourceCount: 10,
    similarityThreshold: 0.35,
    sources: [DocumentSource.STARKNET_JS],
  },
});

// Update the helper function to take vectorStore as parameter
export const getAgentConfig = (
  name: AvailableAgents,
  vectorStore: VectorStore,
): RagSearchConfig => {
  const configs = createAgentConfigs(vectorStore);
  const config = configs[name];
  if (!config) {
    throw new Error(`No configuration found for agent: ${name}`);
  }
  return config;
};
