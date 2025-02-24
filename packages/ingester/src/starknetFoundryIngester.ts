import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { Document } from '@langchain/core/documents';
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
import logger from '@starknet-agent/agents/utils/logger';
import { VectorStore } from '@starknet-agent/agents/index';

const config: BookConfig = {
  repoOwner: 'foundry-rs',
  repoName: 'starknet-foundry',
  fileExtension: '.md',
  chunkSize: 4096,
  chunkOverlap: 512,
  baseUrl: 'https://foundry-rs.github.io/starknet-foundry',
};

export const ingestStarknetFoundry = async (vectorStore: VectorStore) => {
  try {
    const pages = await downloadAndProcessFoundryDocs();
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
  logger.info(`Deleted downloaded files from ${extractDir}`);
}

export async function downloadAndProcessFoundryDocs(): Promise<BookPageDto[]> {
  logger.info('Downloading and processing Starknet Foundry docs');
  const extractDir = path.join(__dirname, 'starknet-foundry');

  // Download and extract the repository
  await downloadAndExtractRepo(extractDir);

  // Update book.toml configuration
  await updateBookConfig(extractDir);

  // Build the mdbook
  await buildMdBook(extractDir);

  // Process the markdown files
  const srcDir = path.join(extractDir, 'docs', 'book', 'markdown');
  const pages = await processDocFiles(config, srcDir);

  return pages;
}

async function downloadAndExtractRepo(extractDir: string): Promise<void> {
  const latestReleaseUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/releases/latest`;
  const response = await axios.get(latestReleaseUrl);
  const latestRelease = response.data;
  const zipUrl = latestRelease.zipball_url;

  logger.info(`Downloading repository from ${zipUrl}`);
  const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  const zipData = zipResponse.data;

  const zipFile = new AdmZip(zipData);
  zipFile.extractAllTo(extractDir, true);

  // Find the extracted directory (it has a prefix like foundry-rs-starknet-foundry-v0.1.0-alpha)
  const files = await fs.readdir(extractDir);
  const repoDir = files.find((file) =>
    file.startsWith(`${config.repoOwner}-${config.repoName}`),
  );

  if (!repoDir) {
    throw new Error('Repository directory not found in the extracted files.');
  }

  // Move all contents from the nested directory to the extract directory
  const nestedDir = path.join(extractDir, repoDir);
  const nestedFiles = await fs.readdir(nestedDir);

  for (const file of nestedFiles) {
    const srcPath = path.join(nestedDir, file);
    const destPath = path.join(extractDir, file);
    await fs.rename(srcPath, destPath);
  }

  // Remove the now-empty nested directory
  await fs.rmdir(nestedDir);

  logger.info('Repository downloaded and extracted successfully.');
}

async function updateBookConfig(extractDir: string): Promise<void> {
  const bookTomlPath = path.join(extractDir, 'docs', 'book.toml');

  try {
    let bookToml = await fs.readFile(bookTomlPath, 'utf8');

    // Add optional = true to [output.linkcheck] if it exists
    if (bookToml.includes('[output.linkcheck]')) {
      bookToml = bookToml.replace(
        '[output.linkcheck]',
        '[output.linkcheck]\noptional = true',
      );
    } else {
      bookToml += '\n[output.linkcheck]\noptional = true\n';
    }

    // Add [output.markdown] if it doesn't exist
    if (!bookToml.includes('[output.markdown]')) {
      bookToml += '\n[output.markdown]\n';
    }

    await fs.writeFile(bookTomlPath, bookToml);
    logger.info('Updated book.toml configuration');
  } catch (error) {
    logger.error('Error updating book.toml:', error);
    throw new Error('Failed to update book.toml configuration');
  }
}

async function buildMdBook(extractDir: string): Promise<void> {
  const docsDir = path.join(extractDir, 'docs');

  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    logger.info('Building mdbook...');
    try {
      await execPromise('mdbook --version');
    } catch (error) {
      logger.error('mdbook is not installed on this system');
      throw new Error(
        'mdbook is not installed. Please install mdbook to continue: https://rust-lang.github.io/mdBook/guide/installation.html',
      );
    }

    await execPromise('mdbook build', { cwd: docsDir });
    logger.info('mdbook build completed successfully');
  } catch (error) {
    logger.error('Error building mdbook:', error);
    throw error;
  }
}
