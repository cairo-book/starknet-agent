// Import individual prompt files
import {
  CAIRO_BOOK_RETRIEVER_PROMPT,
  CAIRO_BOOK_RESPONSE_PROMPT,
  CAIRO_BOOK_NO_SOURCE_PROMPT,
} from './cairoBookPrompts';

import {
  STARKNET_DOCS_RETRIEVER_PROMPT,
  STARKNET_DOCS_RESPONSE_PROMPT,
  STARKNET_DOCS_NO_SOURCE_PROMPT,
} from './starknetDocsPrompts';

import {
  STARKNET_ECOSYSTEM_RETRIEVER_PROMPT,
  STARKNET_ECOSYSTEM_RESPONSE_PROMPT,
  STARKNET_ECOSYSTEM_NO_SOURCE_PROMPT,
} from './starknetEcosystemPrompts';

import {
  STARKNET_FOUNDRY_RETRIEVER_PROMPT,
  STARKNET_FOUNDRY_RESPONSE_PROMPT,
  STARKNET_FOUNDRY_NO_SOURCE_PROMPT,
} from './starknetFoundryPrompts';

import {
  SUCCINT_CAIRO_BOOK_RETRIEVER_PROMPT,
  SUCCINT_CAIRO_BOOK_RESPONSE_PROMPT,
  SUCCINT_CAIRO_BOOK_NO_SOURCE_PROMPT,
} from './succintCairoBookPrompts';
import {
  CAIROCODER_NO_SOURCE_PROMPT,
  CAIROCODER_RESPONSE_PROMPT,
  CAIROCODER_RETRIEVER_PROMPT,
} from './cairoCoderPrompts';
import { AgentPrompts } from '../../core/types';
import { getScarbVersion } from '../../config';
import { getStarknetFoundryVersion } from '../../config';

export const cairoBookPrompts: AgentPrompts = {
  searchRetrieverPrompt: CAIRO_BOOK_RETRIEVER_PROMPT,
  searchResponsePrompt: CAIRO_BOOK_RESPONSE_PROMPT,
  noSourceFoundPrompt: CAIRO_BOOK_NO_SOURCE_PROMPT,
};

export const starknetDocsPrompts: AgentPrompts = {
  searchRetrieverPrompt: STARKNET_DOCS_RETRIEVER_PROMPT,
  searchResponsePrompt: STARKNET_DOCS_RESPONSE_PROMPT,
  noSourceFoundPrompt: STARKNET_DOCS_NO_SOURCE_PROMPT,
};

export const starknetEcosystemPrompts: AgentPrompts = {
  searchRetrieverPrompt: STARKNET_ECOSYSTEM_RETRIEVER_PROMPT,
  searchResponsePrompt: STARKNET_ECOSYSTEM_RESPONSE_PROMPT,
  noSourceFoundPrompt: STARKNET_ECOSYSTEM_NO_SOURCE_PROMPT,
};

export const starknetFoundryPrompts: AgentPrompts = {
  searchRetrieverPrompt: STARKNET_FOUNDRY_RETRIEVER_PROMPT,
  searchResponsePrompt: STARKNET_FOUNDRY_RESPONSE_PROMPT,
  noSourceFoundPrompt: STARKNET_FOUNDRY_NO_SOURCE_PROMPT,
};

export const succintCairoBookPrompts: AgentPrompts = {
  searchRetrieverPrompt: SUCCINT_CAIRO_BOOK_RETRIEVER_PROMPT,
  searchResponsePrompt: SUCCINT_CAIRO_BOOK_RESPONSE_PROMPT,
  noSourceFoundPrompt: SUCCINT_CAIRO_BOOK_NO_SOURCE_PROMPT,
};

export const cairoCoderPrompts: AgentPrompts = {
  searchRetrieverPrompt: CAIROCODER_RETRIEVER_PROMPT,
  searchResponsePrompt: CAIROCODER_RESPONSE_PROMPT,
  noSourceFoundPrompt: CAIROCODER_NO_SOURCE_PROMPT,
};

// Helper function to inject dynamic values into prompts
export const injectPromptVariables = (prompt: string): string => {
  return prompt
    .replace('${getStarknetFoundryVersion()}', getStarknetFoundryVersion())
    .replace('${getScarbVersion()}', getScarbVersion())
    .replace('${new Date().toISOString()}', new Date().toISOString());
};
