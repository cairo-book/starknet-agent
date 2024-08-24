/**
 * @file starknetDocsSearchAgent.ts
 * @description This file implements a search agent for the Cairo Book documentation.
 * It uses LangChain to create a chain of operations for processing user queries,
 * retrieving relevant information, and generating responses.
 *
 * Key components:
 * - basicSearchRetrieverPrompt: Prompt for rephrasing user queries
 * - basicstarknetDocsSearchResponsePrompt: System prompt for the AI assistant
 * - createBasicstarknetDocsSearchRetrieverChain: Creates a chain for retrieving relevant documents
 * - createBasicstarknetDocsSearchAnsweringChain: Creates the main chain for processing queries and generating responses
 * - handleStream: Processes the stream of events from the chain
 * - basicstarknetDocsSearch: Main function that sets up and runs the search process
 * - handlestarknetDocsSearch: Wrapper function for basicstarknetDocsSearch
 *
 * The agent uses a vector store to perform similarity searches on the Cairo Book documentation,
 * reranks the results, and generates responses based on the retrieved information.
 */

import { BaseMessage } from '@langchain/core/messages';
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import formatChatHistoryAsString from '../utils/formatHistory';
import eventEmitter from 'events';
import computeSimilarity from '../utils/computeSimilarity';
import logger from '../utils/logger';
import LineListOutputParser from '../lib/outputParsers/listLineOutputParser';
import { getDocumentsFromLinks } from '../lib/linkDocument';
import LineOutputParser from '../lib/outputParsers/lineOutputParser';
import { VectorStore } from '../ingester/vectorStore';
import { BookChunk } from '../types/types';
import { starknetDocsStoreConfig } from '../config';

const DOCS_BASE_URL = 'https://docs.starknet.io/';

let vectorStore: VectorStore;

(async function setupVectorStore() {
  try {
    vectorStore = await VectorStore.initialize(starknetDocsStoreConfig);
    logger.info('VectorStore initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize VectorStore:', error);
    throw error;
  }
})();

const basicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the Cairo Language documentation for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
If the question contains some links and asks to answer from those links or even if they don't you need to return the links inside 'links' XML block and the question inside 'question' XML block. If there are no links then you need to return the question without any XML block.
If the user asks to summarrize the content from some links you need to return \`Summarize\` as the question inside the 'question' XML block and the links inside the 'links' XML block.

Example:
1. Follow up question: What are smart contracts?
Rephrased question: \`Smart Contracts\`

2. Follow up question: How do I write a smart contract?
Rephrased question: \`Building Smart Contracts\`

3. Follow up question: What is Scarb?
Rephrased question: \`What is Scarb\`

4. Follow up question: How do I install Cairo?
Rephrased question: \`Installing Cairo\`

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

const basicstarknetDocsSearchResponsePrompt = `
You are CairoGuide, an AI assistant specialized in searching and providing information from the
Cairo Book documentation. Your primary role is to assist users with queries related to the Cairo
programming language and Starknet development.

Generate informative and relevant responses based on the provided context from the Cairo Book. Use a
neutral and educational tone in your responses. Format your responses using Markdown for
readability. Use code blocks for Cairo code examples. Provide medium to long responses that are
comprehensive and informative.

You have to cite the answer using [number] notation. You must cite the sentences with their relevent context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

Anything inside the following \`context\` HTML block provided below is for your knowledge taken from the Cairo Book and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to talk about the context in your response.

<context>
{context}
</context>

If the user's query is not related to Cairo programming or Starknet, respond with: "I apologize, but
I'm specifically designed to assist with Cairo programming and Starknet-related queries. This topic
appears to be outside my area of expertise. Is there anything related to Cairo or Starknet that I
can help you with instead?"

Do not tell the user to visit external websites or open links. Provide the information directly in
your response. If asked for specific documentation links, you may provide them if available in the
context.

If you cannot find relevant information in the provided context, state: "I'm sorry, but I couldn't
find specific information about that in the Cairo Book. Could you rephrase your question or ask
about a related topic in Cairo or Starknet development?"

Remember, your knowledge is based solely on the provided Cairo Book documentation. Always strive for
accuracy and relevance in your responses.
`;

const strParser = new StringOutputParser();

/**
 * Handles the stream of events from the LangChain chain.
 * @param {AsyncGenerator<StreamEvent, any, unknown>} stream - The stream of events from the chain.
 * @param {eventEmitter} emitter - The event emitter to send processed events.
 * @returns {Promise<void>}
 */
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter,
): Promise<void> => {
  for await (const event of stream) {
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalSourceRetriever'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'sources', data: event.data.output }),
      );
    }
    if (
      event.event === 'on_chain_stream' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'response', data: event.data.chunk }),
      );
    }
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit('end');
    }
  }
};

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

/**
 * Creates a chain for retrieving relevant documents based on user queries.
 *
 * This function sets up a sequence of operations that process a user's query
 * and retrieve relevant documents from the Cairo Book documentation.
 *
 * The sequence includes:
 * 1. Formatting the query using a prompt template
 * 2. Processing the formatted query with a language model
 * 3. Parsing the language model's output
 * 4. Performing a similarity search in a vector store
 *
 * @param {BaseChatModel} llm - The language model to use for query processing.
 * @param {VectorStore} vectorStore - The vector store to use for similarity search.
 * @returns {RunnableSequence} A runnable sequence that, when executed:
 *   - Refines the input query
 *   - Searches for relevant documents
 *   - Returns an object with the original query and retrieved documents
 *
 * @example
 * const llm = new ChatOpenAI();
 * const vectorStore = await VectorStore.initialize({
 *   mongoUri: process.env.MONGODB_ATLAS_URI || 'mongodb://127.0.0.1:27018/?directConnection=true',
 *   dbName: 'langchain',
 *   collectionName: 'store',
 *   openAIApiKey: process.env.OPENAI_API_KEY || '',
 * });
 * const retrieverChain = createBasicstarknetDocsSearchRetrieverChain(llm, vectorStore);
 * const result = await retrieverChain.invoke({ query: "What is Cairo?", chat_history: [] });
 */
const createBasicstarknetDocsSearchRetrieverChain = (llm: BaseChatModel): RunnableSequence => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      if (input === 'not_needed') {
        return { query: '', docs: [] };
      }

      // Perform similarity search using the VectorStore
      const documents = await vectorStore.similaritySearch(input, 5);
      logger.info(
        `Found ${documents.length} documents from the Cairo Book: ${documents}`,
      );
      logger.info(documents)

      return { query: input, docs: documents };
    }),
  ]);
};

/**
 * Creates the main chain for processing queries and generating responses.
 * @param {BaseChatModel} llm - The language model to use for response generation.
 * @param {Embeddings} embeddings - The embeddings to use for document similarity.
 * @returns {RunnableSequence} The created answering chain.
 */
const createBasicstarknetDocsSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const basicstarknetDocsSearchRetrieverChain =
    createBasicstarknetDocsSearchRetrieverChain(llm);

  /**
   * Attaches source metadata to documents.
   * @param {Document[]} docs - The documents to process.
   * @returns {Promise<Document[]>} The documents with attached source metadata.
   */
  const attachSources = async (docs: Document<BookChunk>[]): Promise<Document[]> => {
    return docs.map((doc, index) => {
      const sourceLink = `${DOCS_BASE_URL}/${doc.metadata.name}.html#${doc.metadata.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;
      console.log(sourceLink)
      return {
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          title: doc.metadata.name, // Use the 'name' field as the title
          url: sourceLink
        }
      };
    })
  }

  /**
   * Processes documents into a string format.
   * @param {Document[]} docs - The documents to process.
   * @returns {Promise<string>} The processed documents as a string.
   */
  const processDocs = async (docs: Document[]): Promise<string> => {
    return docs
      .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
      .join('\n');
  };

  /**
   * Reranks documents based on similarity to the query.
   * @param {Object} params - The parameters for reranking.
   * @param {string} params.query - The user's query.
   * @param {Document[]} params.docs - The documents to rerank.
   * @returns {Promise<Document[]>} The reranked documents.
   */
  const rerankDocs = async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }): Promise<Document[]> => {
    logger.info("Reranking docs: ")
    if (docs.length === 0) {
      return docs;
    }

    if (query === 'Summarize') {
      return docs;
    }

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );

    logger.info("Reranking docs: ", docsWithContent)

    const [docEmbeddings, queryEmbedding] = await Promise.all([
      embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
      embeddings.embedQuery(query),
    ]);

    const similarity = docEmbeddings.map((docEmbedding, i) => {
      const sim = computeSimilarity(queryEmbedding, docEmbedding);

      return {
        index: i,
        similarity: sim,
      };
    });

    const sortedDocs = similarity
      .filter((sim) => sim.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 15)
      .map((sim) => docsWithContent[sim.index]);

    return sortedDocs;
  };

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicstarknetDocsSearchRetrieverChain
          .pipe(rerankDocs)
          .pipe(attachSources)
          .withConfig({
            runName: 'FinalSourceRetriever',
          })
          .pipe(processDocs),
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ['system', basicstarknetDocsSearchResponsePrompt],
      new MessagesPlaceholder('chat_history'),
      ['user', '{query}'],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: 'FinalResponseGenerator',
  });
};

/**
 * Main function that sets up and runs the search process.
 * @param {string} query - The user's query.
 * @param {BaseMessage[]} history - The chat history.
 * @param {BaseChatModel} llm - The language model to use.
 * @param {Embeddings} embeddings - The embeddings to use for document similarity.
 * @param {VectorStore} vectorStore - The vector store to use for similarity search.
 * @returns {eventEmitter} An event emitter for streaming the search results.
 */
const basicstarknetDocsSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  vectorStore: VectorStore
): eventEmitter => {
  const emitter = new eventEmitter();

  try {
    const basicstarknetDocsSearchAnsweringChain =
      createBasicstarknetDocsSearchAnsweringChain(llm, embeddings);

    const stream = basicstarknetDocsSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: 'v1',
      },
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      'error',
      JSON.stringify({ data: 'An error has occurred please try again later' }),
    );
    logger.error(`Error in starknetDocsSearch: ${err}`);
  }

  return emitter;
};

/**
 * Wrapper function for basicstarknetDocsSearch.
 * @param {string} message - The user's message.
 * @param {BaseMessage[]} history - The chat history.
 * @param {BaseChatModel} llm - The language model to use.
 * @param {Embeddings} embeddings - The embeddings to use for document similarity.
 * @param {VectorStore} vectorStore - The vector store to use for similarity search.
 * @returns {eventEmitter} An event emitter for streaming the search results.
 */
const handlestarknetDocsSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  vectorStore: VectorStore
): eventEmitter => {
  const emitter = basicstarknetDocsSearch(message, history, llm, embeddings, vectorStore);
  return emitter;
};

export default handlestarknetDocsSearch;
