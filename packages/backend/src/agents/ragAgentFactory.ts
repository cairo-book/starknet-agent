import { BaseMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import { LLMConfig } from '../websocket/connectionManager';
import { AvailableAgents, getAgentConfig } from '../config/agentConfigs';
import EventEmitter from 'events';
import { VectorStore } from '../db/vectorStore';
import { RagPipeline } from './pipeline/ragPipeline';

export class RagAgentFactory {
  static createAgent(
    name: AvailableAgents,
    message: string,
    history: BaseMessage[],
    llm: LLMConfig,
    embeddings: Embeddings,
    vectorStore: VectorStore,
  ): EventEmitter {
    const config = getAgentConfig(name, vectorStore);
    const pipeline = new RagPipeline(llm, embeddings, config);
    return pipeline.execute({ query: message, chatHistory: history });
  }
}
