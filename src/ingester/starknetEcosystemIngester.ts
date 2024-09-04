import { VectorStore } from "../db/vectorStore";
import { createChunks as createCairoBookChunks, downloadAndExtractCairoBook, cleanupDownloadedFiles as cleanupCairoBookFiles } from "./cairoBookIngester";
import { updateVectorStore } from "./shared";
import { cleanupDownloadedFiles as cleanupSNDocsFiles, downloadAndExtractStarknetDocs, createChunks as createSNDocsChunks } from "./starknetDocsIngester";

// Main ingestion function
export const ingestStarknetEcosystem = async (vectorStore: VectorStore) => {
    try {
      const snDocsPages = await downloadAndExtractStarknetDocs();
      const snDocsChunks = await createSNDocsChunks(snDocsPages);
      const cairoBookPages = await downloadAndExtractCairoBook();
      const cairoBookChunks = await createCairoBookChunks(cairoBookPages);
      const chunks = [...snDocsChunks, ...cairoBookChunks];
      await updateVectorStore(vectorStore, chunks);
      await cleanupSNDocsFiles();
      await cleanupCairoBookFiles();
    } catch (error) {
        console.error('Error processing Starknet Ecosystem:', error);
        if (error instanceof Error) {
          console.error('Stack trace:', error.stack);
        }
        throw error;
    }
  };
