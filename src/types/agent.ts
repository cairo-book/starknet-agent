import { VectorStore } from '../db/vectorStore';
import { Document } from '@langchain/core/documents';

export interface AgentPrompts {
  searchRetrieverPrompt: string;
  searchResponsePrompt: string;
  noSourceFoundPrompt?: string;
}

export interface QueryClassifier {
  isNotNeeded: (query: string) => boolean;
  isContractQuery: (query: string, context: string) => boolean;
  isTermQuery: (query: string, tag: string) => boolean;
}

export interface AgentConfig {
  name: string;
  prompts: AgentPrompts;
  vectorStore: VectorStore;
  queryClassifier?: QueryClassifier;
  preprocessDocs?: (docs: Document[]) => Promise<Document[]>;
}

export interface RagSearchConfig extends AgentConfig {
  contractTemplate?: string;
  testTemplate?: string;
  maxSourceCount?: number;
  similarityThreshold?: number;
}
