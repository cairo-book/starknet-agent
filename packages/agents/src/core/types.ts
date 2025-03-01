import { BaseMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '../db/vectorStore';

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
  sources?: DocumentSource | DocumentSource[];
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
  sources?: DocumentSource | DocumentSource[];
}

export type DocumentSource =
  | 'cairo_book'
  | 'starknet_docs'
  | 'starknet_ecosystem'
  | 'starknet_foundry'
  | 'cairo_by_example';

export type BookChunk = {
  name: string;
  title: string;
  chunkNumber: number;
  contentHash: string;
  uniqueId: string;
  sourceLink: string;
  source: DocumentSource;
};

export interface ParsedSection {
  title: string;
  content: string;
  anchor?: string; // Optional custom anchor
}
