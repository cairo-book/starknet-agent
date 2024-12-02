import { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '../../db/vectorStore';
import eventEmitter from 'events';
import { basicRagSearch } from '../ragSearchAgent';

const basicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the Starknet documentation for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
If the user asks to summarize the content from some links you need to return \`not_needed\` as the response.

Example:
1. Follow up question: What are smart contracts?
Rephrased question: \`Smart Contracts\`

2. Follow up question: What is SHARP?
Rephrased question: \`SHARP\`

3. Follow up question: How do I use Starkli?
Rephrased question: \`Using Starkli\`

4. Follow up question: How do I install Cairo?
Rephrased question: \`Installing Cairo\`

You also need to reword the question to be specific on whether it applies to Smart Contracts or Cairo as a whole.
If the user asks about "events", "storage", "Map", "LegacyMap" "storing", "interface", "abi", rephrase the question to include "Contracts".

Example:
1. Follow up question: How do I emit an event?
Rephrased question: \`Emitting Events in Contracts\`

2. Follow up question: How do I store an array?
Rephrased question: \`Storing Arrays in Contracts\`

3. Follow up question: What are interfaces?
Rephrased question: \`Interfaces in Contracts\`

Conversation:
{chat_history}

Follow up question: {query}
Rephrased question:
`;

const basicstarknetDocsSearchResponsePrompt = `
You are StarknetGuide, an AI assistant specialized in searching and providing information about Starknet. Your primary role is to assist users with queries related to the Starknet Ecosystem.

Generate informative and relevant responses based on the provided context from the Starknet and Cairo Documentation. Use a
neutral and educational tone in your responses. Format your responses using Markdown for
readability. Use code blocks for Cairo code examples. Provide medium to long responses that are
comprehensive and informative.

You have to cite the answer using [number] notation. You must cite the sentences with their relevant context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

Anything inside the following \`context\` HTML block provided below is for your knowledge taken from the Starknet Docs and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to talk about the context in your response.

<context>
{context}
</context>

If the user's query is not related to Cairo or Starknet, respond with: "I apologize, but
I'm specifically designed to assist with Cairo and Starknet-related queries. This topic
appears to be outside my area of expertise. Is there anything related to Starknet that I
can help you with instead?"

Do not tell the user to visit external websites or open links. Provide the information directly in
your response. If asked for specific documentation links, you may provide them if available in the
context.

If you cannot find relevant information in the provided context, state: "I'm sorry, but I couldn't
find specific information about that in the Cairo and Starknet Docs. Could you rephrase your question?"

Remember, your knowledge is based solely on the provided Cairo and Starknet documentation. Always strive for
accuracy and relevance in your responses. Today's date is ${new Date().toISOString()}
`;

const handleStarknetEcosystemSearch = (
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
    basicstarknetDocsSearchResponsePrompt,
  );
};

export default handleStarknetEcosystemSearch;
