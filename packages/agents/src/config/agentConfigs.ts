import { basicContractTemplate } from './templates/contractTemplate';
import {
  cairoBookPrompts,
  cairoCoderPrompts,
  starknetDocsPrompts,
  starknetEcosystemPrompts,
  starknetFoundryPrompts,
  succintCairoBookPrompts,
  cairoByExamplePrompts,
} from './prompts';
import { basicTestTemplate } from './templates/testTemplate';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '../db/vectorStore';
import { RagSearchConfig } from '../core/types';

export interface LLMConfig {
  defaultLLM: BaseChatModel;
  fastLLM?: BaseChatModel;
}

export const parseXMLContent = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
  const matches = [...xml.matchAll(regex)];
  return matches.map((match) => match[1].trim());
};

// Default query classifier that checks for contract-related terms
const defaultQueryClassifier = {
  isNotNeeded: (query: string): boolean => {
    return query.includes('<response>not_needed</response>');
  },

  isTermQuery: (query: string, tag: string): boolean => {
    return query.includes(`<${tag}>`);
  },

  isContractQuery: (query: string, context: string): boolean => {
    const contractTerms = [
      'contract',
      'storage',
      'event',
      'interface',
      'abi',
      'function',
      'map',
      'vec',
    ];

    const lowercaseQuery = query.toLowerCase();
    const lowercaseContext = context.toLowerCase();

    return (
      contractTerms.some((term) => lowercaseQuery.includes(term)) ||
      context.includes('<search_terms>')
    );
  },
};

export type AvailableAgents =
  | 'cairoBook'
  | 'starknetDocs'
  | 'starknetEcosystem'
  | 'starknetFoundry'
  | 'succintCairoBook'
  | 'cairoCoder'
  | 'cairoByExample';

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
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 15,
    similarityThreshold: 0.4,
  },

  starknetDocs: {
    name: 'Starknet Docs',
    prompts: starknetDocsPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 10,
    similarityThreshold: 0.4,
  },

  starknetEcosystem: {
    name: 'Starknet Ecosystem',
    prompts: starknetEcosystemPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 15,
    similarityThreshold: 0.4,
  },

  starknetFoundry: {
    name: 'Starknet Foundry',
    prompts: starknetFoundryPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 10,
    similarityThreshold: 0.4,
  },

  succintCairoBook: {
    name: 'Succint Cairo Book',
    prompts: succintCairoBookPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 5,
    similarityThreshold: 0.5,
  },

  cairoCoder: {
    name: 'Cairo Coder',
    prompts: cairoCoderPrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 15,
    similarityThreshold: 0.4,
  },

  cairoByExample: {
    name: 'Cairo By Example',
    prompts: cairoByExamplePrompts,
    vectorStore,
    contractTemplate: basicContractTemplate,
    testTemplate: basicTestTemplate,
    queryClassifier: defaultQueryClassifier,
    maxSourceCount: 10,
    similarityThreshold: 0.4,
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
