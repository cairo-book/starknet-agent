import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ProcessedQuery, RagInput, RagSearchConfig } from '../core/types';
import formatChatHistoryAsString from '../utils/formatHistory';
import { parseXMLContent } from '../config/agentConfigs';
import logger from '../utils/logger';
/**
 * Transforms a raw user query into an actionable form (e.g., rephrased query or search terms).
 */
export class QueryProcessor {
  constructor(
    private fastLLM: BaseChatModel | undefined,
    private config: RagSearchConfig,
  ) {}

  async process(input: RagInput): Promise<ProcessedQuery> {
    const context = formatChatHistoryAsString(input.chatHistory);
    const prompt = await PromptTemplate.fromTemplate(
      this.config.prompts.searchRetrieverPrompt,
    ).format({
      query: input.query,
      chat_history: context,
    });

    if (!this.fastLLM) {
      return this.fallbackProcess(input.query, context);
    }

    const cleanedPrompt = cleanConversation(prompt);
    logger.debug(cleanedPrompt);
    const response = await this.fastLLM
      .invoke(cleanedPrompt)
      .then((res) => new StringOutputParser().parse(res.content as string));
    logger.debug('Processed query response:', { response });

    return this.parseResponse(response, input.query, context);
  }

  private fallbackProcess(query: string, context: string): ProcessedQuery {
    return {
      original: query,
      transformed: query,
      isContractRelated:
        query.toLowerCase().includes('contract') ||
        context.includes('<search_terms>'),
      isTestRelated: this.isTestRelated(query),
    };
  }

  private parseResponse(
    response: string,
    original: string,
    context: string,
  ): ProcessedQuery {
    const terms = parseXMLContent(response, 'term');
    if (terms.length > 0) {
      return {
        original,
        transformed: terms,
        isContractRelated: terms.some((t) =>
          t.toLowerCase().includes('contract'),
        ),
        isTestRelated: this.isTestRelated(terms.join(' ')),
      };
    }

    const answers = parseXMLContent(response, 'response');
    const transformed = answers[0] || response;
    return {
      original,
      transformed,
      isContractRelated:
        transformed.toLowerCase().includes('contract') ||
        context.includes('<search_terms>'),
      isTestRelated: this.isTestRelated(transformed),
    };
  }

  private isTestRelated(query: string): boolean {
    const testTerms = ['test', 'tests', 'testing', 'starknet foundry'];
    return testTerms.some((term) => query.toLowerCase().includes(term));
  }
}

// Helper function to clean conversation
const cleanConversation = (text: string): string => {
  // Split at "Conversation:" to keep header
  const [header, conversation] = text.split('Conversation:\n');

  // Get all messages by splitting on message type indicators
  const messages = conversation.split(/\n(?=system:|human:)/);

  // Filter to keep only human messages
  const humanMessages = messages.filter((msg) =>
    msg.trim().startsWith('human:'),
  );

  // Combine back together
  const cleanedConversation =
    header + '\nConversation:\n' + humanMessages.join('\n');

  // Remove the custom instructions from the conversation
  return cleanedConversation.replace(
    /<custom_instructions>.*?<\/custom_instructions>/,
    '',
  );
};
