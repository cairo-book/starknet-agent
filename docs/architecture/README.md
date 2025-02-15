# Starknet Agent's Architecture

Starknet Agent's architecture consists of the following key components:

1. **Agent/Chains**: These components predict Starknet Agent's next actions, understand user queries, and retrieve information based on existing knowledge stored in a database.
2. **LLMs (Large Language Models)**: Utilized by agents and chains for tasks like understanding content, writing responses, and citing sources. Examples include Claude, GPTs, etc.
3. **Embedding Models**: To improve the accuracy of search results, embedding models re-rank the results using similarity search algorithms such as cosine similarity and dot product distance.

For a more detailed explanation of how these components work together, see [WORKING.md](https://github.com/cairo-book/starknet-agent/tree/master/docs/architecture/WORKING.md).
