# 🚀 Starknet Agent - An AI-powered search engine for the Starknet Ecosystem 🔎 <!-- omit in toc -->

<!-- ![preview](.assets/perplexica-screenshot.png) -->

## Table of Contents <!-- omit in toc -->

- [Credits](#credits)
- [Overview](#overview)
- [Preview](#preview)
- [Features](#features)
- [Installation](#installation)
  - [Getting Started with Docker (Recommended)](#getting-started-with-docker-recommended)
- [Architecture](#architecture)
- [Upcoming Features](#upcoming-features)
- [Contribution](#contribution)

## Credits

This project was originally forked from [Perplexica](https://github.com/ItzCrazyKns/Perplexica), an open-source AI search engine. We've adapted and expanded upon their work to create a specialized tool for the Starknet ecosystem. We're grateful for their initial contribution which provided a base foundation for Starknet Agent.

## Overview

Starknet Agent is an open-source AI-powered searching tool specifically designed for the Starknet Ecosystem. It uses advanced machine learning algorithms to search and understand the Starknet documentation and the Cairo Book, providing clear and accurate answers to your queries about Starknet and Cairo.

## Preview

<!-- ![video-preview](.assets/perplexica-preview.gif) -->

## Features

- **RAG-based Search**: Uses Retrieval-Augmented Generation to provide accurate, source-cited answers to your questions.
- **Multiple Focus Modes**: Special modes to better answer specific types of questions:
  - **Starknet Ecosystem**: Searches the entire Starknet Ecosystem, including all resources below.
  - **Cairo Book**: Searches the [Cairo Book](https://book.cairo-lang.org) for answers.
  - **Starknet Docs**: Searches the [Starknet documentation](https://docs.starknet.io) for answers.
  - **Starknet Foundry**: Searches the [Starknet Foundry documentation](https://foundry-rs.github.io/starknet-foundry/) for answers.
  - **Cairo By Example**: Searches the Cairo By Example resource for answers.
- **Source Citations**: All answers include citations to the source material, allowing you to verify the information.
- **Real-time Streaming**: Responses are streamed in real-time as they're generated.
- **Chat History**: Your conversation history is preserved for context in follow-up questions.

## Installation

There are mainly 2 ways of installing Starknet Agent - With Docker, Without Docker. Using Docker is highly recommended.

### Getting Started with Docker (Recommended)

1. Ensure Docker is installed and running on your system.
2. Clone the Starknet Agent repository:

   ```bash
   git clone https://github.com/cairo-book/starknet-agent.git
   ```

3. After cloning, navigate to the directory containing the project files.

4. Setup your databases on [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-vector-search).

   - Create a new cluster.
   - Create a new database for each of the focus modes you intend to use. A single database for the ecosystem-wide mode is enough, e.g.: `starknet-ecosystem`.
   - Create a new collection inside each database that will store the embeddings. e.g. `all-chunks` for the `starknet-ecosystem` database.
   - Create a vectorSearch index named **default** on the collection (tab `Atlas Search`). Example index configuration:
     ```json
     {
       "fields": [
         {
           "numDimensions": 2048,
           "path": "embedding",
           "similarity": "cosine",
           "type": "vector"
         }
       ]
     }
     ```

5. Inside the packages/backend package, copy the `sample.config.toml` file to a `config.toml`. For development setups, you need only fill in the following fields:

   - `OPENAI`: Your OpenAI API key. **You only need to fill this if you wish to use OpenAI's models**.
   - `ANTHROPIC`: Your Anthropic API key. **You only need to fill this if you wish to use Anthropic models**.

     **Note**: You can change these after starting Starknet Agent from the settings dialog.

   - `SIMILARITY_MEASURE`: The similarity measure to use (This is filled by default; you can leave it as is if you are unsure about it.)
   - Databases:
     - `ECOSYSTEM_DB`: This is the database for the entire Starknet Ecosystem, that aggregates all the other databases. You will need to fill this with your own database URL. example:
     ```toml
         [ECOSYSTEM_DB]
         MONGODB_URI = "mongodb+srv://mongo:..."
         DB_NAME = "starknet-ecosystem"
         COLLECTION_NAME = "all-chunks"
     ```
     - Other databases are for focused modes (in a single resource). You only need to fill these ones if you want to use the associated focused mode. You will need to create databases for each of the focused modes.
   - Models: The `[HOSTED_MODE]` table defines the underlying LLM model used. We recommend using:

   ```toml
      [HOSTED_MODE]
      DEFAULT_CHAT_PROVIDER = "anthropic"
      DEFAULT_CHAT_MODEL = "Claude 3.5 Sonnet"
      DEFAULT_EMBEDDING_PROVIDER = "openai"
      DEFAULT_EMBEDDING_MODEL = "Text embedding 3 large"
   ```

6. Generate the embeddings for the databases. You can do this by running the `generateEmbeddings.ts` script with bun. If you followed the example above, you will need to run the script with option `4 (Everything)` for the `starknet-ecosystem` database.

   ```bash
   bun run packages/ingester/scripts/generateEmbeddings.ts
   ```

7. Run the development server with turbo.

   ```bash
   turbo dev
   ```

8. Wait a few minutes for the setup to complete. You can access Starknet Agent at http://localhost:3000 in your web browser.

**Note**: After the containers are built, you can start Starknet Agent directly from Docker without having to open a terminal.

## Architecture

Starknet Agent uses a modern architecture based on Retrieval-Augmented Generation (RAG):

1. **Backend Service**: Express-based server handling WebSocket connections and API endpoints.
2. **RAG Pipeline**: Processes queries, retrieves relevant documents, and generates responses.
3. **Vector Databases**: MongoDB Atlas with vector search capabilities for similarity search.
4. **UI**: Next.js-based frontend with real-time streaming capabilities.

For more detailed information about the architecture, please see the [architecture documentation](docs/architecture/README.md).

## Upcoming Features

- [ ] Support for local LLMs using Ollama (Llama3, Mixtral, etc.)
- [ ] Expanding coverage of Starknet-related resources
- [ ] Adding an Autonomous Agent Mode for more precise answers
- [ ] Enhanced UI with more customization options

## Contribution

For more information on contributing to Starknet Agent, please read the [CONTRIBUTING.md](CONTRIBUTING.md) file to learn more about the project and how you can contribute to it.
