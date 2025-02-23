import { BaseMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';

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

export interface ProcessedQuery {
  original: string;
  transformed: string | string[]; // Single query or list of search terms
  isContractRelated?: boolean;
  isTestRelated?: boolean;
}

export interface RetrievedDocuments {
  documents: Document[];
  processedQuery: ProcessedQuery;
}

export interface RagInput {
  query: string;
  chatHistory: BaseMessage[];
}

export interface StreamHandler {
  emitSources(docs: Document[]): void;
  emitResponse(chunk: BaseMessage): void;
  emitEnd(): void;
  emitError(error: string): void;
}

export interface RagSearchConfig extends AgentConfig {
  contractTemplate?: string;
  testTemplate?: string;
  maxSourceCount?: number;
  similarityThreshold?: number;
}
