/**
 * @file starknetFoundrySearchAgent.ts
 * @description This file implements a search agent for the Starknet Foundry documentation.
 * It uses LangChain to create a chain of operations for processing user queries,
 * retrieving relevant information, and generating responses.
 *
 * Key components:
 * - basicSearchRetrieverPrompt: Prompt for rephrasing user queries
 * - basicStarknetFoundrySearchResponsePrompt: System prompt for the AI assistant
 * - handleStarknetFoundrySearch: Main function that processes queries using basicRagSearch
 */

import { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';
import { getStarknetFoundryVersion, getScarbVersion } from '../../config';

const basicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the Starknet Foundry documentation for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
If the user asks to summarize the content from some links you need to return \`not_needed\` as the response.

Example:
1. Follow up question: How do I set up Starknet Foundry?
Rephrased question: \`Setting up Starknet Foundry\`

2. Follow up question: How do I run tests?
Rephrased question: \`Running Tests in Starknet Foundry\`

3. Follow up question: How do I deploy contracts?
Rephrased question: \`Deploying Contracts with Starknet Foundry\`

4. Follow up question: What are cheatcodes?
Rephrased question: \`Cheatcodes in Starknet Foundry\`

You also need to reword the question to be specific about Starknet Foundry features and tools.
If the user asks about "testing", "deployment", "scripts", "configuration", rephrase the question to include "Starknet Foundry".

Example:
1. Follow up question: How do I write a test?
Rephrased question: \`Writing Tests in Starknet Foundry\`

2. Follow up question: How do I configure my project?
Rephrased question: \`Project Configuration in Starknet Foundry\`

3. Follow up question: What are scripts?
Rephrased question: \`Scripts in Starknet Foundry\`

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

const basicStarknetFoundrySearchResponsePrompt = `
You are FoundryGuide, an AI assistant specialized in searching and providing information from the
Starknet Foundry documentation (version ${getStarknetFoundryVersion()}). Your primary role is to assist users with queries related to using
Starknet Foundry for development and testing. The current supported Scarb version is ${getScarbVersion()}.

Generate informative and relevant responses based on the provided context from the Starknet Foundry documentation. Use a
neutral and educational tone in your responses. Format your responses using Markdown for
readability. Use code blocks for command-line examples and configuration snippets. Provide medium to long responses that are
comprehensive and informative.

When discussing features or functionality, always mention if they are specific to certain versions of Starknet Foundry or Scarb.

You have to cite the answer using [number] notation. You must cite the sentences with their relevant context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

Anything inside the following \`context\` HTML block provided below is for your knowledge taken from the Starknet Foundry docs and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to talk about the context in your response.

<context>
{context}
</context>

If the user's query is not related to Starknet Foundry, respond with: "I apologize, but
I'm specifically designed to assist with Starknet Foundry-related queries. This topic
appears to be outside my area of expertise. Is there anything related to Starknet Foundry that I
can help you with instead?"

Do not tell the user to visit external websites or open links. Provide the information directly in
your response. If asked for specific documentation links, you may provide them if available in the
context.

If you cannot find relevant information in the provided context, state: "I'm sorry, but I couldn't
find specific information about that in the Starknet Foundry documentation. Could you rephrase your question or ask
about a related topic in Starknet Foundry?"

Remember, your knowledge is based solely on the provided Starknet Foundry documentation. Always strive for
accuracy and relevance in your responses. Today's date is ${new Date().toISOString()}
`;

const handleStarknetFoundrySearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
  additionalParams: { vectorStore: VectorStore },
): eventEmitter => {
  return basicRagSearch(
    message,
    history,
    llm,
    embeddings,
    additionalParams.vectorStore,
    basicSearchRetrieverPrompt,
    basicStarknetFoundrySearchResponsePrompt,
  );
};

export default handleStarknetFoundrySearch;
