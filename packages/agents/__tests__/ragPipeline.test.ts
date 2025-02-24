import { RagPipeline } from '../src/pipeline/ragPipeline';
import { QueryProcessor } from '../src/pipeline/queryProcessor';
import { DocumentRetriever } from '../src/pipeline/documentRetriever';
import { AnswerGenerator } from '../src/pipeline/answerGenerator';
import { Embeddings } from '@langchain/core/embeddings';
import {
  RagInput,
  RagSearchConfig,
  RetrievedDocuments,
} from '../src/core/types';
import { Document } from '@langchain/core/documents';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import EventEmitter from 'events';

// Mock the dependencies at the module level
jest.mock('../src/pipeline/queryProcessor');
jest.mock('../src/pipeline/documentRetriever');
jest.mock('../src/pipeline/answerGenerator');

describe('RagPipeline', () => {
  let ragPipeline: RagPipeline;
  let mockLLMConfig: {
    defaultLLM: MockProxy<BaseChatModel>;
    fastLLM: MockProxy<BaseChatModel>;
  };
  let mockEmbeddings: MockProxy<Embeddings>;
  let mockConfig: RagSearchConfig;
  let mockQueryProcessor: MockProxy<QueryProcessor>;
  let mockDocumentRetriever: MockProxy<DocumentRetriever>;
  let mockAnswerGenerator: MockProxy<AnswerGenerator>;

  // Mock the logger to avoid console output during tests
  jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  }));

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLLMConfig = {
      defaultLLM: mockDeep<BaseChatModel>(),
      fastLLM: mockDeep<BaseChatModel>(),
    };
    mockEmbeddings = mockDeep<Embeddings>();

    // Define a basic config for testing
    mockConfig = {
      name: 'Test Agent',
      prompts: {
        searchRetrieverPrompt: 'test retriever prompt',
        searchResponsePrompt: 'test response prompt',
      },
      vectorStore: mockDeep(),
      maxSourceCount: 5,
      similarityThreshold: 0.5,
    };

    // Create properly typed mocks for the dependencies
    mockQueryProcessor = mockDeep<QueryProcessor>();
    mockDocumentRetriever = mockDeep<DocumentRetriever>();
    mockAnswerGenerator = mockDeep<AnswerGenerator>();

    // Mock the constructor implementations to return the deep mocks
    jest.mocked(QueryProcessor).mockImplementation(() => mockQueryProcessor);
    jest
      .mocked(DocumentRetriever)
      .mockImplementation(() => mockDocumentRetriever);
    jest.mocked(AnswerGenerator).mockImplementation(() => mockAnswerGenerator);

    // Instantiate the RagPipeline with mocks
    ragPipeline = new RagPipeline(mockLLMConfig, mockEmbeddings, mockConfig);
  });

  describe('execute', () => {
    it('should process query, retrieve documents, and generate answers in the happy path', async () => {
      // Arrange
      const input: RagInput = {
        query: 'How do I write a Cairo contract?',
        chatHistory: [],
      };

      const processedQuery = {
        original: input.query,
        transformed: 'Processed: How do I write a Cairo contract?',
        isContractRelated: true,
      };

      const mockDocuments: Document[] = [
        new Document({
          pageContent: 'Cairo contracts are written in the Cairo language.',
          metadata: {
            title: 'Cairo Programming',
            sourceLink: 'https://example.com/cairo',
          },
        }),
      ];

      const retrievedDocs: RetrievedDocuments = {
        documents: mockDocuments,
        processedQuery,
      };

      // Create a mock response stream
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield new AIMessage('This is a test answer about Cairo contracts.');
        },
      } as IterableReadableStream<BaseMessage>;

      // Setup mock behavior
      mockQueryProcessor.process.mockResolvedValue(processedQuery);
      mockDocumentRetriever.retrieve.mockResolvedValue(retrievedDocs);
      mockAnswerGenerator.generate.mockResolvedValue(mockStream);

      // Act - Capture the emitted data
      const dataPromise = new Promise<string[]>((resolve) => {
        const receivedData: string[] = [];
        const emitter = ragPipeline.execute(input);

        emitter.on('data', (chunk) => {
          receivedData.push(chunk);
          if (receivedData.length >= 2) {
            resolve(receivedData);
          }
        });

        // Timeout to prevent hanging
        setTimeout(() => resolve(receivedData), 1000);
      });

      // Assert
      const receivedData = await dataPromise;

      // Verify the mocks were called correctly
      expect(mockQueryProcessor.process).toHaveBeenCalledWith(input);
      expect(mockDocumentRetriever.retrieve).toHaveBeenCalledWith(
        processedQuery,
      );
      expect(mockAnswerGenerator.generate).toHaveBeenCalledWith(
        input,
        retrievedDocs,
      );

      // Verify the emitted data
      expect(receivedData.length).toBeGreaterThanOrEqual(1);
      const parsedData = receivedData.map((data) => JSON.parse(data));

      expect(parsedData.some((item) => item.type === 'sources')).toBe(true);
      expect(parsedData.some((item) => item.type === 'response')).toBe(true);
    });
  });
});
