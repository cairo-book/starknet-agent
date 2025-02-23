import { Embeddings } from '@langchain/core/embeddings';
import { RagInput, StreamHandler, RagSearchConfig } from '../core/types';
import { QueryProcessor } from './queryProcessor';
import { DocumentRetriever } from './documentRetriever';
import { AnswerGenerator } from './answerGenerator';
import EventEmitter from 'events';
import logger from '@starknet-agent/backend/logger';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LLMConfig } from '../config/agentConfigs';

/**
 * Orchestrates the RAG process in a clear, sequential flow.
 */
export class RagPipeline {
  private queryProcessor: QueryProcessor;
  private documentRetriever: DocumentRetriever;
  private answerGenerator: AnswerGenerator;

  constructor(
    private llmConfig: LLMConfig,
    private embeddings: Embeddings,
    private config: RagSearchConfig,
  ) {
    this.queryProcessor = new QueryProcessor(llmConfig.fastLLM, config);
    this.documentRetriever = new DocumentRetriever(embeddings, config);
    this.answerGenerator = new AnswerGenerator(llmConfig.defaultLLM, config);
  }

  execute(input: RagInput): EventEmitter {
    const emitter = new EventEmitter();
    this.runPipeline(input, {
      emitSources: (docs) =>
        emitter.emit('data', JSON.stringify({ type: 'sources', data: docs })),
      emitResponse: (chunk) =>
        emitter.emit(
          'data',
          JSON.stringify({ type: 'response', data: chunk.content }),
        ),
      emitEnd: () => emitter.emit('end'),
      emitError: (error) =>
        emitter.emit('error', JSON.stringify({ data: error })),
    });
    return emitter;
  }

  private async runPipeline(
    input: RagInput,
    handler: StreamHandler,
  ): Promise<void> {
    try {
      logger.info('Starting RAG pipeline', { query: input.query });

      // Step 1: Process the query
      const processedQuery = await this.queryProcessor.process(input);
      logger.debug('Processed query:', processedQuery);

      // Step 2: Retrieve documents
      const retrieved = await this.documentRetriever.retrieve(processedQuery);
      handler.emitSources(retrieved.documents);

      // Step 3: Generate the answer as a stream
      const stream = await this.answerGenerator.generate(input, retrieved);
      for await (const chunk of stream) {
        handler.emitResponse(chunk);
      }
      logger.debug('Stream ended');
      handler.emitEnd();
    } catch (error) {
      logger.error('Pipeline error:', error);
      handler.emitError('An error occurred while processing your request');
    }
  }
}
