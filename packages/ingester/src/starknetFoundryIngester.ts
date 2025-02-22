import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { VectorStore } from '@starknet-agent/backend/vectorStore';
import { Document } from 'langchain/document';
import logger from '@starknet-agent/backend/logger';
import { BookChunk } from '@starknet-agent/backend/types';
import {
  BookConfig,
  BookPageDto,
  isInsideCodeBlock,
  ParsedSection,
  processDocFiles,
  calculateHash,
  createAnchor,
  addSectionWithSizeLimit,
  MAX_SECTION_SIZE,
  updateVectorStore,
} from './shared';
import { createChunks } from './cairoBookIngester';

const config: BookConfig = {
  repoOwner: 'cairo-book',
  repoName: 'starknet-foundry',
  fileExtension: '.md',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://foundry-rs.github.io/starknet-foundry',
};

export const ingestStarknetFoundry = async (vectorStore: VectorStore) => {
  try {
    const pages = await downloadAndExtractFoundryDocs();
    const chunks = await createChunks(pages);
    await updateVectorStore(vectorStore, chunks);
    await cleanupDownloadedFiles();
  } catch (error) {
    console.error('Error processing Starknet Foundry docs:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
};

export async function cleanupDownloadedFiles() {
  const extractDir = path.join(__dirname, 'starknet-foundry');
  await fs.rm(extractDir, { recursive: true, force: true });
  logger.info(`Deleted downloaded markdown files from ${extractDir}`);
}

export async function downloadAndExtractFoundryDocs(): Promise<BookPageDto[]> {
  logger.info('Downloading and extracting Starknet Foundry docs');
  const latestReleaseUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/releases/latest`;
  const response = await axios.get(latestReleaseUrl);
  const latestRelease = response.data;
  const zipAsset = latestRelease.assets.find(
    (asset: any) => asset.name === 'markdown-output.zip',
  );

  if (!zipAsset) {
    throw new Error('ZIP asset not found in the latest release.');
  }

  const zipUrl = zipAsset.browser_download_url;
  logger.info(`Downloading ZIP file from ${zipUrl}`);
  const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  const zipData = zipResponse.data;

  const zipFile = new AdmZip(zipData);
  const extractDir = path.join(__dirname, 'starknet-foundry');
  zipFile.extractAllTo(extractDir, true);

  logger.info('ZIP file downloaded and extracted successfully.');

  const srcDir = path.join(extractDir, 'markdown-output');

  const pages = await processDocFiles(config, srcDir);

  return pages;
}
