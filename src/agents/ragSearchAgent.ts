import { BaseMessage } from '@langchain/core/messages';
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
  ChatMessagePromptTemplate,
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
import { VectorStore } from '../db/vectorStore';
import { BookChunk } from '../types/types';
import { IterableReadableStream } from '@langchain/core/utils/stream';

const basicContractTemplate =
`
use core::starknet::ContractAddress;

// Define the contract interface
#[starknet::interface]
pub trait IRegistry<TContractState> {
    fn register_data(ref self: TContractState, data: felt252);
    fn update_data(ref self: TContractState, index: u64, new_data: felt252);
    fn get_data(self: @TContractState, index: u64) -> felt252;
    fn get_all_data(self: @TContractState) -> Array<felt252>;
    fn get_user_data(self: @TContractState, user: ContractAddress) -> felt252;
}

// Define the contract module
#[starknet::contract]
mod Registry {
    // Always use full paths for core library imports.
    use core::starknet::ContractAddress;
    // Required for interactions with 'map' and the 'entry' method. Don't forget 'StoragePathEntry'!!
    use core::starknet::storage::{Map, StoragePathEntry};
    // Required for interactions with 'vec'
    use core::starknet::storage::{Vec, VecTrait, MutableVecTrait};
    // Required for all storage operations
    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::starknet::get_caller_address;

    // Define storage variables
    #[storage]
    struct Storage {
        data_vector: Vec<felt252>, // A vector to store data
        user_data_map: Map<ContractAddress, felt252>, // A mapping to store user-specific data
        foo: usize, // A simple storage variable
    }

    // events derive 'Drop, starknet::Event' and the '#[event]' attribute
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DataRegistered: DataRegistered,
        DataUpdated: DataUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct DataRegistered {
        user: ContractAddress,
        data: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct DataUpdated {
        user: ContractAddress,
        index: u64,
        new_data: felt252,
    }

    // Implement the contract interface
    // all these functions are public
    #[abi(embed_v0)]
    impl RegistryImpl of super::IRegistry<ContractState> {
        // Register data and emit an event
        fn register_data(ref self: ContractState, data: felt252) {
            let caller = get_caller_address();
            self.data_vector.append().write(data);
            self.user_data_map.entry(caller).write(data);
            self.emit(Event::DataRegistered(DataRegistered { user: caller, data }));
        }

        // Update data at a specific index and emit an event
        fn update_data(ref self: ContractState, index: u64, new_data: felt252) {
            let caller = get_caller_address();
            self.data_vector.at(index).write(new_data);
            self.user_data_map.entry(caller).write(new_data);
            self.emit(Event::DataUpdated(DataUpdated { user: caller, index, new_data }));
        }

        // Retrieve data at a specific index
        fn get_data(self: @ContractState, index: u64) -> felt252 {
            self.data_vector.at(index).read()
        }

        // Retrieve all data stored in the vector
        fn get_all_data(self: @ContractState) -> Array<felt252> {
            let mut all_data = array![];
            for i in 0..self.data_vector.len() {
                all_data.append(self.data_vector.at(i).read());
            };
            // for loops have an ending `;`
            all_data
        }

        // Retrieve data for a specific user
        fn get_user_data(self: @ContractState, user: ContractAddress) -> felt252 {
            self.user_data_map.entry(user).read()
        }
    }

    // this function is private
    fn foo(self: @ContractState)->usize{
        self.foo.read()
    }
}
`;

const noSourceFoundPrompt = `
You are an AI assistant specialized in providing information about Starknet and Cairo. However, in this case, you were unable to find any relevant sources to answer the user's query.

Your response should be concise and honest, acknowledging that you don't have the information to answer the question accurately. Use a polite and helpful tone.

Here's how you should respond:

1. Apologize for not being able to find specific information.
2. Suggest that the user might want to rephrase their question with more specific terms, or provide more context.
3. Present your understanding of the user's query and suggest a new question that might be more relevant.

Example response:

"I apologize, but I couldn't find any specific information to answer your question about dicts accurately. It's possible that I don't have access to the relevant data, or the question might be outside my current knowledge base.
Perhaps you could rephrase your question to something like: "What is the default behavior in Cairo when accessing a key that hasn't been set in a Felt252Dict?"

Remember, it's better to admit when you don't have the information rather than providing potentially incorrect or misleading answers.

<query>
{query}
</query>

Always maintain a helpful and professional tone in your response. Do not invent information or make assumptions beyond what's provided in the context.
`;

const strParser = new StringOutputParser();

export type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

export const handleStream = async (
  stream: IterableReadableStream<StreamEvent>,
  emitter: eventEmitter,
): Promise<void> => {
  logger.info('Starting stream handling');
  try {
    for await (const event of stream) {
      if (
        event.event === 'on_chain_end' &&
        event.name === 'FinalSourceRetriever'
      ) {
        logger.info('Sources retrieved:', {
          sourceCount: event.data.output.length,
        });
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'sources',
            data: event.data.output,
          }),
        );
      }

      if (
        event.event === 'on_chain_stream' &&
        event.name === 'FinalResponseGenerator'
      ) {
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'response',
            data: event.data.chunk,
          }),
        );
      }

      if (
        event.event === 'on_chain_end' &&
        event.name === 'FinalResponseGenerator'
      ) {
        logger.info('Stream completed successfully');
        emitter.emit('end');
      }
    }
  } catch (error) {
    logger.error('Error in handleStream:', error);
    throw error;
  }
};

export const createBasicSearchRetrieverChain = (
  llm: BaseChatModel,
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
): RunnableSequence => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(searchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      logger.debug('Search retriever input:', { input });

      // Extract content from XML tags
      const parseXMLContent = (xml: string, tag: string): string[] => {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
        const matches = [...xml.matchAll(regex)];
        return matches.map(match => match[1].trim());
      };

      // Handle not_needed case
      if (input.includes('<response>not_needed</response>')) {
        return { query: '', docs: [] };
      }

      // Handle search_terms format
      if (input.includes('<search_terms>')) {
        try {
          const searchTerms = parseXMLContent(input, 'term');
          logger.debug('Parsed search terms:', { searchTerms });

          if (searchTerms.length === 0) {
            logger.error('No search terms found in XML:', { input });
            return { query: '', docs: [] };
          }

          // Perform search for each term and combine results
          const searchPromises = searchTerms.map(term =>
            vectorStore.similaritySearch(term, 5)
          );

          const searchResults = await Promise.all(searchPromises);

          // Flatten and deduplicate results based on content
          const seenContent = new Set<string>();
          const uniqueDocs = searchResults.flat().filter(doc => {
            if (seenContent.has(doc.pageContent)) {
              return false;
            }
            seenContent.add(doc.pageContent);
            return true;
          });

          logger.debug('Combined search results:', {
            docs: uniqueDocs.map(doc => doc.metadata.title)
          });

          return {
            query: searchTerms.join(' + '),
            docs: uniqueDocs.slice(0, 15) // Limit to top 15 most relevant docs
          };
        } catch (error) {
          logger.error('Error processing search terms:', error);
          return { query: '', docs: [] };
        }
      }

      // Handle regular queries (wrapped in <response> tags)
      const regularResponses = parseXMLContent(input, 'response');
      if (regularResponses.length > 0) {
        const query = regularResponses[0];
        const documents = await vectorStore.similaritySearch(query, 10);
        logger.debug('Vector store search results:', {
          documentCount: documents.length,
          firstDoc: documents[0],
        });
        return { query, docs: documents };
      }

      // Fallback for unexpected format
      logger.warn('Unexpected response format:', { input });
      return { query: '', docs: [] };
    }),
  ]);
};

export const attachSources = async (
  docs: Document<BookChunk>[],
): Promise<Document[]> => {
  return docs.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: {
      ...doc.metadata,
      title: doc.metadata.title,
      url: doc.metadata.sourceLink,
    },
  }));
};

export const processDocs = async (docs: Document[]): Promise<string> => {
  if (docs.length === 0) {
    return 'NO_SOURCES_FOUND';
  }
  return docs
    .map((_, index) => `${index + 1}. ${docs[index].pageContent}`)
    .join('\n');
};

export const rerankDocs =
  (embeddings: Embeddings) =>
  async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }): Promise<Document[]> => {
    logger.debug('Reranking docs input:', {
      query,
      docsLength: docs.length,
      firstDoc: docs[0],
    });

    if (docs.length === 0 || query === 'Summarize') {
      logger.info('Skipping reranking - empty docs or summarize query');
      return docs;
    }

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );
    logger.debug('Filtered documents with content:', {
      originalCount: docs.length,
      filteredCount: docsWithContent.length,
    });

    try {
      const [docEmbeddings, queryEmbedding] = await Promise.all([
        embeddings.embedDocuments(
          docsWithContent.map((doc) => doc.pageContent),
        ),
        embeddings.embedQuery(query),
      ]);
      logger.debug('Embeddings generated successfully');

      const similarity = docEmbeddings.map((docEmbedding, i) => ({
        index: i,
        similarity: computeSimilarity(queryEmbedding, docEmbedding),
      }));

      const rerankedDocs = similarity
        .filter((sim) => sim.similarity > 0.4)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map((sim) => docsWithContent[sim.index]);

      logger.info('Reranking completed', {
        inputDocs: docsWithContent.length,
        filteredDocs: rerankedDocs.length,
      });

      return rerankedDocs;
    } catch (error) {
      logger.error('Error in rerankDocs:', error);
      throw error;
    }
  };

export const createBasicSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
  searchResponsePrompt: string,
  noSourceFoundPrompt: string,
) => {
  const basicSearchRetrieverChain = createBasicSearchRetrieverChain(
    llm,
    vectorStore,
    searchRetrieverPrompt,
  );

  const regularPromptTemplate = ChatPromptTemplate.fromMessages([
    ['system', searchResponsePrompt],
    new MessagesPlaceholder('chat_history'),
    ['user', '{query}'],
  ]);

  const noSourcePromptTemplate = PromptTemplate.fromTemplate(noSourceFoundPrompt);

  const strParser = new StringOutputParser();

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicSearchRetrieverChain
          .pipe(rerankDocs(embeddings))
          .pipe(attachSources)
          .withConfig({
            runName: 'FinalSourceRetriever',
          })
          .pipe(processDocs),
      ]),
    }),
    RunnableLambda.from(async (input) => {
      if (input.context === 'NO_SOURCES_FOUND') {
        return noSourcePromptTemplate.format({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        });
      } else {
        let context = input.context;

        // Check if this is a contract-related query by looking for XML search terms
        const isContractQuery = input.query.toLowerCase().includes('contract') ||
                              context.includes('<search_terms>');

        // Only inject the template for contract-related queries
        if (isContractQuery) {
          logger.debug('Contract-related query detected, injecting template');
          context += basicContractTemplate;
        }

        logger.debug('Input context:', {
          isContractQuery,
          contextLength: context.length,
          query: input.query
        });

        return regularPromptTemplate.format({
          ...input,
          context
        });
      }
    }),
    llm,
    strParser,
  ]).withConfig({
    runName: 'FinalResponseGenerator',
  });
};

export const basicRagSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  vectorStore: VectorStore,
  searchRetrieverPrompt: string,
  searchResponsePrompt: string,
): eventEmitter => {
  const emitter = new eventEmitter();

  logger.info('Starting RAG search', {
    query,
    historyLength: history.length,
  });

  try {
    logger.debug('Initializing search chain');
    const basicSearchAnsweringChain = createBasicSearchAnsweringChain(
      llm,
      embeddings,
      vectorStore,
      searchRetrieverPrompt,
      searchResponsePrompt,
      noSourceFoundPrompt,
    );

    logger.debug('Starting stream');
    const stream = basicSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: 'v1',
      },
    );

    handleStream(stream, emitter).catch((error) => {
      logger.error('Stream handling failed:', error);
      emitter.emit(
        'error',
        JSON.stringify({
          data: 'An error occurred while processing the stream',
        }),
      );
    });
  } catch (err) {
    logger.error('Error in basicRagSearch:', {
      error: err,
      query,
      historyLength: history.length,
    });
    emitter.emit(
      'error',
      JSON.stringify({ data: 'An error has occurred please try again later' }),
    );
  }

  return emitter;
};
