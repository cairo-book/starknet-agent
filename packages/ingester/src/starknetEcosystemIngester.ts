import { VectorStore } from '@starknet-agent/backend/vectorStore';
import {
  createChunks as createMdBookChunks,
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
  cleanupDownloadedFiles as cleanupFoundryFiles,
} from './starknetFoundryIngester';

// Main ingestion function
export const ingestStarknetEcosystem = async (vectorStore: VectorStore) => {
  try {
    const snDocsPages = await downloadAndExtractStarknetDocs();
    const snDocsChunks = await createSNDocsChunks(snDocsPages);
    const cairoBookPages = await downloadAndExtractCairoBook();
    const cairoBookChunks = await createMdBookChunks(cairoBookPages);
    const starknetFoundryPages = await downloadAndExtractFoundryDocs();
    const starknetFoundryChunks =
      await createMdBookChunks(starknetFoundryPages);
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
