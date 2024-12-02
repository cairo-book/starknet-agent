import { VectorStore } from '../db/vectorStore';
import {
  createChunks as createCairoBookChunks,
  downloadAndExtractCairoBook,
  cleanupDownloadedFiles as cleanupCairoBookFiles,
} from './cairoBookIngester';
import { updateVectorStore } from './shared';
import {
  cleanupDownloadedFiles as cleanupSNDocsFiles,
  downloadAndExtractStarknetDocs,
  createChunks as createSNDocsChunks,
} from './starknetDocsIngester';
import {
  downloadAndExtractFoundryDocs,
  createChunks as createFoundryChunks,
  cleanupDownloadedFiles as cleanupFoundryFiles,
} from './starknetFoundryIngester';

// Main ingestion function
export const ingestStarknetEcosystem = async (vectorStore: VectorStore) => {
  try {
    const snDocsPages = await downloadAndExtractStarknetDocs();
    const snDocsChunks = await createSNDocsChunks(snDocsPages);
    const cairoBookPages = await downloadAndExtractCairoBook();
    const cairoBookChunks = await createCairoBookChunks(cairoBookPages);
    const starknetFoundryPages = await downloadAndExtractFoundryDocs();
    const starknetFoundryChunks =
      await createFoundryChunks(starknetFoundryPages);
    const chunks = [
      ...snDocsChunks,
      ...cairoBookChunks,
      ...starknetFoundryChunks,
    ];
    await updateVectorStore(vectorStore, chunks);
    await cleanupSNDocsFiles();
    await cleanupCairoBookFiles();
    await cleanupFoundryFiles();
  } catch (error) {
    console.error('Error processing Starknet Ecosystem:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
};
