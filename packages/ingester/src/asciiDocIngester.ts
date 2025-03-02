import * as fs from 'fs/promises';
import * as path from 'path';
import downdoc from 'downdoc';
import {
  BookChunk,
  DocumentSource,
  VectorStore,
} from '@starknet-agent/agents/index';
import { Document } from '@langchain/core/documents';
import {
  addSectionWithSizeLimit,
  BookConfig,
  BookPageDto,
  calculateHash,
  createAnchor,
  findChunksToUpdateAndRemove,
  MAX_SECTION_SIZE,
  ParsedSection,
  processDocFiles,
  updateVectorStore,
} from './shared';
import logger from '@starknet-agent/agents/utils/logger';

/**
 * Common interface for AsciiDoc ingester configuration
 */
export interface AsciiDocIngesterConfig {
  bookConfig: BookConfig;
  playbookPath: string;
  outputDir: string;
  restructuredDir: string;
  source: DocumentSource;
  processDocFilesCustom?: (
    config: BookConfig,
    directory: string,
  ) => Promise<BookPageDto[]>;
}

/**
 * Main ingestion function for AsciiDoc-based documentation
 */
export const ingestAsciiDocDocs = async (
  vectorStore: VectorStore,
  config: AsciiDocIngesterConfig,
) => {
  try {
    const pages = await buildAndExtractDocs(config);
    const chunks = await createChunks(pages, config);
    await updateVectorStore(vectorStore, chunks, config.source);
    await cleanupDownloadedFiles(config);
  } catch (error) {
    handleError(error);
  }
};

/**
 * Build and extract documentation using Antora
 */
export async function buildAndExtractDocs(
  config: AsciiDocIngesterConfig,
): Promise<BookPageDto[]> {
  logger.info(`Building and extracting ${config.source} Docs`);

  // Run Antora to generate the documentation
  logger.info('Running Antora to build documentation');
  const antoraCommand = `antora ${config.playbookPath}`;

  try {
    const { execSync } = require('child_process');
    execSync(antoraCommand, { cwd: __dirname, stdio: 'inherit' });
    logger.info('Antora documentation generation completed successfully');
  } catch (error) {
    logger.error('Error running Antora, but continuing with ingestion:', error);
    // Create empty antora-output directory if it doesn't exist
    await fs.mkdir(config.outputDir, { recursive: true }).catch(() => {});
  } finally {
    await fs
      .rm(path.join(__dirname, 'build'), {
        recursive: true,
        force: true,
      })
      .catch(() => {});
  }

  // Check if the output directory has any content
  try {
    const files = await fs.readdir(config.outputDir);
    if (files.length === 0) {
      logger.warn(
        'No files found in Antora output directory. Returning empty pages array.',
      );
      return [];
    }
  } catch (error) {
    logger.warn(
      'Could not read Antora output directory. Returning empty pages array.',
    );
    return [];
  }

  await restructureDocumentation(config.outputDir, config.restructuredDir);

  // Use custom processDocFiles function if provided, otherwise use the default
  if (config.processDocFilesCustom) {
    return await config.processDocFilesCustom(
      config.bookConfig,
      config.restructuredDir,
    );
  }

  return await processDocFiles(config.bookConfig, config.restructuredDir);
}

/**
 * Restructure the documentation files
 */
export async function restructureDocumentation(
  extractDir: string,
  targetDir: string,
): Promise<string> {
  await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(targetDir, { recursive: true });

  const hasRelevantFiles = await restructureFiles(extractDir, targetDir);

  if (!hasRelevantFiles) {
    // If no relevant files were found, remove the created target directory
    logger.info(
      `No relevant files found in ${extractDir}, removing target directory ${targetDir}`,
    );
    await fs.rmdir(targetDir, { recursive: true });
  }

  return targetDir;
}

/**
 * Restructure files from source to target directory
 */
export async function restructureFiles(
  sourceDir: string,
  targetDir: string,
  fileExtension: string = '.adoc',
): Promise<boolean> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  let hasRelevantFiles = false;

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    let targetPath = path.join(
      targetDir,
      entry.name.toLowerCase().replace(/_/g, '-'),
    );

    if (entry.isDirectory()) {
      if (entry.name === 'pages') {
        // If the directory is named 'pages', copy its contents directly to the parent
        const subDirHasRelevantFiles = await restructureFiles(
          sourcePath,
          targetDir,
          fileExtension,
        );
        if (subDirHasRelevantFiles) {
          hasRelevantFiles = true;
        }
      } else {
        const subDirHasRelevantFiles = await restructureFiles(
          sourcePath,
          targetPath,
          fileExtension,
        );
        if (subDirHasRelevantFiles) {
          hasRelevantFiles = true;
        }
      }
    } else if (entry.isFile() && path.extname(entry.name) === fileExtension) {
      if (entry.name.toLowerCase() === 'nav.adoc') {
        continue;
      }
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
      hasRelevantFiles = true;
    }
  }

  return hasRelevantFiles;
}

/**
 * Split AsciiDoc content into sections
 */
export function splitAsciiDocIntoSections(
  content: string,
  split: boolean = false,
): ParsedSection[] {
  // Trim and convert code blocks regardless of mode
  content = content.trim();
  content = convertCodeBlocks(content);

  if (!split) {
    // Single section mode - treat entire content as one section
    const headerRegex = /^(?:\[#([^\]]+)\]\s*\n)?(=+)\s+(.+)$/m;
    const match = headerRegex.exec(content);
    const sections: ParsedSection[] = [];

    if (match) {
      const title = match[3];
      const anchor = match[1]; // Use custom anchor if present
      const markdownContent = downdoc(content);
      if (markdownContent) {
        addSectionWithSizeLimit(
          sections,
          title,
          markdownContent,
          MAX_SECTION_SIZE,
          anchor || createAnchor(title),
        );
      }
    }
    return sections;
  }

  // Split mode - divide content into multiple sections
  const headerRegex = /^(?:\[#([^\]]+)\]\s*\n)?(=+)\s+(.+)$/gm;
  const sections: ParsedSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';
  let lastAnchor: string | undefined;
  let match;

  // Trim the content to remove leading/trailing whitespace
  content = content.trim();

  // Convert AsciiDoc code blocks to Markdown code blocks
  content = convertCodeBlocks(content);

  while ((match = headerRegex.exec(content)) !== null) {
    if (!isInsideCodeBlock(content, match.index)) {
      if (lastIndex < match.index) {
        const sectionContent = content.slice(lastIndex, match.index).trim();
        const markdownContent = downdoc(sectionContent);
        if (markdownContent) {
          addSectionWithSizeLimit(
            sections,
            lastTitle,
            markdownContent,
            MAX_SECTION_SIZE,
            lastAnchor,
          );
        }
      }
      lastAnchor = match[1]; // Capture the custom anchor if present
      lastTitle = match[3];
      lastIndex = match.index + match[0].length;
    }
  }

  // Add the last section
  if (lastIndex < content.length) {
    const sectionContent = content.slice(lastIndex).trim();
    if (sectionContent) {
      const markdownContent = downdoc(sectionContent);
      if (markdownContent) {
        addSectionWithSizeLimit(
          sections,
          lastTitle,
          markdownContent,
          MAX_SECTION_SIZE,
          lastAnchor,
        );
      }
    }
  }

  return sections;
}

/**
 * Convert AsciiDoc code blocks to Markdown code blocks
 */
export function convertCodeBlocks(content: string): string {
  // Case 1: With language specification
  const languageCodeBlockRegex = /^\[source,(\w+)\]\s*^----$([\s\S]*?)^----$/gm;
  content = content.replace(
    languageCodeBlockRegex,
    (match, language, codeContent) => {
      return convertCodeBlock(codeContent, language);
    },
  );

  // Case 2: No language specification
  const simpleCodeBlockRegex = /^----$([\s\S]*?)^----$/gm;
  content = content.replace(simpleCodeBlockRegex, (match, codeContent) => {
    return convertCodeBlock(codeContent);
  });

  return content;
}

/**
 * Convert a single code block
 */
function convertCodeBlock(codeContent: string, language: string = ''): string {
  // Remove only the leading and trailing newline characters
  codeContent = codeContent.replace(/^\n|\n$/g, '');

  return '```' + language + '\n' + codeContent + '\n```';
}

/**
 * Check if a position is inside a code block
 */
function isInsideCodeBlock(content: string, index: number): boolean {
  const codeBlockRegex = /^(----|\`\`\`)$/gm;
  let isInside = false;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index >= index) {
      break;
    }
    isInside = !isInside;
  }

  return isInside;
}

/**
 * Create chunks from book pages
 */
export async function createChunks(
  pages: BookPageDto[],
  config: AsciiDocIngesterConfig,
): Promise<Document<BookChunk>[]> {
  logger.info('Creating chunks from book pages based on AsciiDoc sections');
  return pages.flatMap((page) =>
    splitAsciiDocIntoSections(page.content, true).flatMap((section, index) =>
      createChunk(page, section, index, config),
    ),
  );
}

/**
 * Create a single chunk from a section
 */
function createChunk(
  page: BookPageDto,
  section: ParsedSection,
  index: number,
  config: AsciiDocIngesterConfig,
): Document<BookChunk> {
  const hash = calculateHash(section.content);
  const anchor = section.anchor ? section.anchor : createAnchor(section.title);
  //Hardcode the index page to be the root
  const page_name = page.name === 'index' ? '' : page.name;

  return new Document<BookChunk>({
    pageContent: section.content,
    metadata: {
      name: page.name,
      title: section.title,
      chunkNumber: index,
      contentHash: hash,
      uniqueId: `${page.name}-${index}`,
      sourceLink: `${config.bookConfig.baseUrl}/${page_name}#${anchor}`,
      source: config.source,
    },
  });
}

/**
 * Clean up downloaded files
 */
export async function cleanupDownloadedFiles(config: AsciiDocIngesterConfig) {
  await fs
    .rm(config.restructuredDir, { recursive: true, force: true })
    .catch(() => {});
  logger.info(
    `Deleted restructured markdown files from ${config.restructuredDir}`,
  );

  await fs
    .rm(config.outputDir, { recursive: true, force: true })
    .catch(() => {});
  logger.info(`Deleted antora output files from ${config.outputDir}`);
}

/**
 * Handle errors
 */
function handleError(error: unknown) {
  console.error('Error processing documentation:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
  throw error;
}
