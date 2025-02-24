import { AnswerGenerator } from '../src/pipeline/answerGenerator';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  RagInput,
  ProcessedQuery,
  RetrievedDocuments,
  RagSearchConfig,
} from '../src/core/types';
import { Document } from '@langchain/core/documents';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { BaseMessage, BaseMessageChunk } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';

// Mock the formatChatHistoryAsString utility
jest.mock('../src/utils/formatHistory', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => 'mocked chat history'),
}));

// Mock the logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('AnswerGenerator', () => {
  let answerGenerator: AnswerGenerator;
  let mockLLM: MockProxy<BaseChatModel>;
  let mockConfig: RagSearchConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLLM = mockDeep<BaseChatModel>();

    // Create a basic config for testing
    mockConfig = {
      name: 'Test Agent',
      prompts: {
        searchRetrieverPrompt: 'test retriever prompt',
        searchResponsePrompt: 'test response prompt',
        noSourceFoundPrompt: 'Sorry, no relevant information was found.',
      },
      vectorStore: mockDeep(),
      contractTemplate:
        '<contract_template>Example template</contract_template>',
      testTemplate: '<test_template>Example test template</test_template>',
    };

    // Mock the LLM stream method to return simulated stream
    mockLLM.stream.mockImplementation(
      (
        input: BaseLanguageModelInput,
      ): Promise<IterableReadableStream<BaseMessageChunk>> => {
        return Promise.resolve({
          [Symbol.asyncIterator]: async function* () {
            yield {
              content: 'This is a test response about Cairo.',
              type: 'ai',
              name: 'AI',
              additional_kwargs: {},
            };
          },
        } as unknown as IterableReadableStream<BaseMessageChunk>);
      },
    );

    // Create the AnswerGenerator instance
    answerGenerator = new AnswerGenerator(mockLLM, mockConfig);
  });

  describe('generate', () => {
    it('should generate an answer stream using retrieved documents', async () => {
      // Arrange
      const input: RagInput = {
        query: 'How do I write a Cairo contract?',
        chatHistory: [],
      };

      const processedQuery: ProcessedQuery = {
        original: input.query,
        transformed: 'cairo contract',
        isContractRelated: true,
      };

      const documents = [
        new Document({
          pageContent: 'Cairo is a programming language for Starknet.',
          metadata: {
            title: 'Cairo Programming',
            sourceLink: 'https://example.com/cairo',
          },
        }),
      ];

      const retrievedDocs: RetrievedDocuments = {
        documents,
        processedQuery,
      };

      // Act
      const result = await answerGenerator.generate(input, retrievedDocs);

      // Assert
      expect(mockLLM.stream).toHaveBeenCalled();

      // Collect the stream results
      const messages: any[] = [];
      for await (const message of result) {
        messages.push(message);
      }

      // Check that we got the expected message
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('This is a test response about Cairo.');
    });

    it('should include contract template when query is contract-related', async () => {
      // Arrange
      const input: RagInput = {
        query: 'How do I write a Cairo contract?',
        chatHistory: [],
      };

      const processedQuery: ProcessedQuery = {
        original: input.query,
        transformed: 'cairo contract',
        isContractRelated: true,
      };

      const documents = [
        new Document({
          pageContent: 'Cairo is a programming language for Starknet.',
          metadata: {
            title: 'Cairo Programming',
            sourceLink: 'https://example.com/cairo',
          },
        }),
      ];

      const retrievedDocs: RetrievedDocuments = {
        documents,
        processedQuery,
      };

      // Create a spy on the LLM stream method to capture the actual prompt
      let capturedPrompt: string | null = null;
      mockLLM.stream.mockImplementation((prompt) => {
        capturedPrompt = prompt as string;
        return Promise.resolve({
          [Symbol.asyncIterator]: async function* () {
            yield {
              content: 'This is a test response about Cairo contracts.',
              type: 'ai',
              name: 'AI',
              additional_kwargs: {},
            };
          },
        } as unknown as IterableReadableStream<BaseMessageChunk>);
      });

      // Act
      await answerGenerator.generate(input, retrievedDocs);

      // Assert
      expect(capturedPrompt).toContain(
        '<contract_template>Example template</contract_template>',
      );
    });

    it('should include test template when query is test-related', async () => {
      // Arrange
      const input: RagInput = {
        query: 'How do I test a Cairo contract?',
        chatHistory: [],
      };

      const processedQuery: ProcessedQuery = {
        original: input.query,
        transformed: 'cairo test',
        isContractRelated: true,
        isTestRelated: true,
      };

      const documents = [
        new Document({
          pageContent: 'Testing Cairo contracts is important.',
          metadata: {
            title: 'Cairo Testing',
            sourceLink: 'https://example.com/cairo-testing',
          },
        }),
      ];

      const retrievedDocs: RetrievedDocuments = {
        documents,
        processedQuery,
      };

      // Create a spy on the LLM stream method to capture the actual prompt
      let capturedPrompt: string | null = null;
      mockLLM.stream.mockImplementation((prompt) => {
        capturedPrompt = prompt as string;
        return Promise.resolve({
          [Symbol.asyncIterator]: async function* () {
            yield {
              content: 'This is a test response about testing Cairo contracts.',
              type: 'ai',
              name: 'AI',
              additional_kwargs: {},
            };
          },
        } as unknown as IterableReadableStream<BaseMessageChunk>);
      });

      // Act
      await answerGenerator.generate(input, retrievedDocs);

      // Assert
      expect(capturedPrompt).toContain(
        '<test_template>Example test template</test_template>',
      );
    });

    it('should use noSourceFoundPrompt when no documents are retrieved', async () => {
      // Arrange
      const input: RagInput = {
        query: 'How do I write a Cairo contract?',
        chatHistory: [],
      };

      const processedQuery: ProcessedQuery = {
        original: input.query,
        transformed: 'cairo contract',
        isContractRelated: true,
      };

      const retrievedDocs: RetrievedDocuments = {
        documents: [], // Empty document list
        processedQuery,
      };

      // Create a spy on the LLM stream method to capture the actual prompt
      let capturedPrompt: string | null = null;
      mockLLM.stream.mockImplementation((prompt) => {
        capturedPrompt = prompt as string;
        return Promise.resolve({
          [Symbol.asyncIterator]: async function* () {
            yield {
              content: 'I cannot find any relevant information.',
              type: 'ai',
              name: 'AI',
              additional_kwargs: {},
            };
          },
        } as unknown as IterableReadableStream<BaseMessageChunk>);
      });

      // Act
      await answerGenerator.generate(input, retrievedDocs);

      // Assert
      expect(capturedPrompt).toContain(
        'Sorry, no relevant information was found.',
      );
    });
  });
});
