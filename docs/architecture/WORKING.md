## How does Starknet Agent work?

Curious about how Starknet Agent works? Don't worry, we'll cover it here. Before we begin, make sure you've read about the architecture of Starknet Agent to ensure you understand what it's made up of. Haven't read it? You can read it [here](https://github.com/cairo-book/starknet-agent/tree/master/docs/architecture/README.md).

We'll understand how Starknet Agent works by taking an example of a scenario where a user asks: "How are transactions proven?". We'll break down the process into steps to make it easier to understand. The steps are as follows:

1. The message is sent via WS to the backend server where it invokes the chain. The chain will depend on your focus mode. For this example, let's assume we use the "starknetDocs" focus mode.
2. The chain is now invoked; first, the message is passed to another chain where it first predicts (using the chat history and the question) where it is reformulated for a more precise input.
3. The reformulated query returned by the first chain is converted into an embedding. We perform a similarity search to find the most relevant sources to answer the query in the appropriate vector store.
5. After all this is done, the sources are passed to the response generator. This chain takes all the chat history, the query, and the sources. It generates a response that is streamed to the UI.

### How are the answers cited?

The LLMs are prompted to do so. We've prompted them so well that they cite the answers themselves, and using some UI magic, we display it to the user.
