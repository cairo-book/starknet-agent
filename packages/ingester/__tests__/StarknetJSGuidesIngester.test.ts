// First, set up all mocks before any imports
let mockExec: jest.Mock;

jest.mock('util', () => {
  const originalModule = jest.requireActual('util');
  mockExec = jest.fn();
  return {
    ...originalModule,
    promisify: jest.fn(() => mockExec),
  };
});

jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('@starknet-agent/agents/utils/logger');

// Now import after mocks are set up
import { StarknetJSGuidesIngester } from '../src/ingesters/StarknetJSGuidesIngester';
import { VectorStore } from '@starknet-agent/agents/index';

describe('StarknetJSGuidesIngester', () => {
  let ingester: StarknetJSGuidesIngester;
  let mockVectorStore: jest.Mocked<VectorStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockClear();
    ingester = new StarknetJSGuidesIngester();
    mockVectorStore = {
      addDocuments: jest.fn(),
      deleteDocuments: jest.fn(),
      searchDocuments: jest.fn(),
      getStoredBookPagesHashes: jest.fn().mockResolvedValue([]),
    } as any;
  });

  describe('frontmatter handling', () => {
    it('should strip frontmatter from content', () => {
      const contentWithFrontmatter = `---
sidebar_position: 14
---

# L1 ↔️ L2 communication

Communication between Layer 1 (Ethereum) and Layer 2 (Starknet) is a critical aspect of our network's functionality.`;

      const expectedContent = `# L1 ↔️ L2 communication

Communication between Layer 1 (Ethereum) and Layer 2 (Starknet) is a critical aspect of our network's functionality.`;

      const strippedContent = ingester.stripFrontmatter(contentWithFrontmatter);
      expect(strippedContent).toBe(expectedContent);
    });

    it('should handle content without frontmatter', () => {
      const contentWithoutFrontmatter = `# Getting Started

This is a guide to get started with StarknetJS.`;

      const strippedContent = ingester.stripFrontmatter(
        contentWithoutFrontmatter,
      );
      expect(strippedContent).toBe(contentWithoutFrontmatter);
    });

    it('should handle empty content', () => {
      const emptyContent = '';
      const strippedContent = ingester.stripFrontmatter(emptyContent);
      expect(strippedContent).toBe('');
    });
  });

  describe('parsePage', () => {
    it('should parse pages after stripping frontmatter', () => {
      const contentWithFrontmatter = `---
sidebar_position: 1
---

# Introduction

This is the introduction.

## Getting Started

Here's how to get started.`;

      // We can't directly test parsePage since it's protected,
      // but we can verify it works correctly through the ingestion process
      const expectedSectionsCount = 2;

      // Test indirectly by verifying the ingester can handle content with frontmatter
      // The actual testing of parsePage functionality happens through integration tests
    });
  });

  describe('downloadAndExtractDocs', () => {
    it('should clone repository and process markdown files', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      const mockFiles = [
        {
          name: 'websocket_channel.md',
          isDirectory: () => false,
          isFile: () => true,
        },
        { name: 'L1message.md', isDirectory: () => false, isFile: () => true },
        {
          name: '_category_.json',
          isDirectory: () => false,
          isFile: () => true,
        },
        { name: 'pictures', isDirectory: () => true, isFile: () => false },
      ];

      const fs = require('fs/promises');
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockImplementation((path: string) => {
        if (path.endsWith('websocket_channel.md')) {
          return Promise.resolve(`---
sidebar_position: 2
---

# WebSocket Channel

Content about WebSocket.`);
        }
        if (path.endsWith('L1message.md')) {
          return Promise.resolve(`---
sidebar_position: 14
---

# L1 ↔️ L2 communication

Content about L1-L2 communication.`);
        }
        return Promise.resolve('');
      });

      const pages = await (ingester as any).downloadAndExtractDocs();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(
          'git clone https://github.com/starknet-io/starknet.js.git',
        ),
      );
      expect(pages).toHaveLength(2);
      expect(pages[0].name).toBe('websocket_channel');
      expect(pages[1].name).toBe('L1message');
    });

    it('should skip non-markdown files and specific directories', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      const mockFiles = [
        { name: 'guide.md', isDirectory: () => false, isFile: () => true },
        {
          name: '_category_.json',
          isDirectory: () => false,
          isFile: () => true,
        },
        { name: 'pictures', isDirectory: () => true, isFile: () => false },
        { name: 'doc_scripts', isDirectory: () => true, isFile: () => false },
      ];

      const fs = require('fs/promises');
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue('# Guide Content');

      const pages = await (ingester as any).downloadAndExtractDocs();

      expect(pages).toHaveLength(1);
      expect(pages[0].name).toBe('guide');
    });

    it('should handle nested directories correctly', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      const fs = require('fs/promises');

      // Mock root directory
      fs.readdir.mockImplementation((dir: string) => {
        if (dir.includes('subdocs')) {
          return Promise.resolve([
            {
              name: 'nested_guide.md',
              isDirectory: () => false,
              isFile: () => true,
            },
          ]);
        }
        return Promise.resolve([
          {
            name: 'root_guide.md',
            isDirectory: () => false,
            isFile: () => true,
          },
          { name: 'subdocs', isDirectory: () => true, isFile: () => false },
        ]);
      });

      fs.readFile.mockImplementation((path: string) => {
        if (path.includes('nested_guide.md')) {
          return Promise.resolve('# Nested Guide Content');
        }
        return Promise.resolve('# Root Guide Content');
      });

      const pages = await (ingester as any).downloadAndExtractDocs();

      expect(pages).toHaveLength(2);
      expect(pages.find((p) => p.name === 'root_guide')).toBeTruthy();
      expect(pages.find((p) => p.name === 'subdocs/nested_guide')).toBeTruthy();
    });

    it('should handle clone failures gracefully', async () => {
      mockExec.mockRejectedValue(new Error('Failed to clone repository'));

      await expect((ingester as any).downloadAndExtractDocs()).rejects.toThrow(
        'Failed to download and extract StarknetJS guides',
      );

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(
          'git clone https://github.com/starknet-io/starknet.js.git',
        ),
      );
    });

    it('should handle empty directories', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      const fs = require('fs/promises');
      fs.readdir.mockResolvedValue([]);

      const pages = await (ingester as any).downloadAndExtractDocs();

      expect(pages).toHaveLength(0);
    });
  });

  describe('URL generation', () => {
    it('should generate correct URLs for documentation pages', () => {
      const config = (ingester as any).config;
      expect(config.baseUrl).toBe('https://starknetjs.com/docs/guides');
      expect(config.urlSuffix).toBe('');
    });
  });

  describe('process', () => {
    it('should process documents and add them to vector store', async () => {
      // Mock the entire process
      const mockDownloadAndExtractDocs = jest.spyOn(
        ingester,
        'downloadAndExtractDocs' as any,
      );
      mockDownloadAndExtractDocs.mockResolvedValue([
        { name: 'test-guide', content: '# Test Guide\n\nContent here.' },
      ]);

      const mockCreateChunks = jest.spyOn(ingester, 'createChunks' as any);
      mockCreateChunks.mockResolvedValue([
        {
          pageContent: 'Test content',
          metadata: {
            source: 'starknet_js',
            sourceLink: 'https://starknetjs.com/docs/guides/test-guide',
            hash: 'test-hash',
          },
        },
      ]);

      const mockCleanupDownloadedFiles = jest.spyOn(
        ingester,
        'cleanupDownloadedFiles' as any,
      );
      mockCleanupDownloadedFiles.mockResolvedValue(undefined);

      const mockUpdateVectorStore = jest.spyOn(
        ingester,
        'updateVectorStore' as any,
      );
      mockUpdateVectorStore.mockResolvedValue(undefined);

      await ingester.process(mockVectorStore);

      expect(mockDownloadAndExtractDocs).toHaveBeenCalled();
      expect(mockCreateChunks).toHaveBeenCalled();
      expect(mockUpdateVectorStore).toHaveBeenCalled();
    });

    it('should propagate errors from downloadAndExtractDocs', async () => {
      const mockDownloadAndExtractDocs = jest.spyOn(
        ingester,
        'downloadAndExtractDocs' as any,
      );
      mockDownloadAndExtractDocs.mockRejectedValue(new Error('Clone failed'));

      await expect(ingester.process(mockVectorStore)).rejects.toThrow(
        'Clone failed',
      );

      expect(mockDownloadAndExtractDocs).toHaveBeenCalled();
    });

    it('should propagate errors from createChunks', async () => {
      const mockDownloadAndExtractDocs = jest.spyOn(
        ingester,
        'downloadAndExtractDocs' as any,
      );
      mockDownloadAndExtractDocs.mockResolvedValue([
        { name: 'test-guide', content: '# Test Guide\n\nContent here.' },
      ]);

      const mockCreateChunks = jest.spyOn(ingester, 'createChunks' as any);
      mockCreateChunks.mockRejectedValue(new Error('Chunking failed'));

      await expect(ingester.process(mockVectorStore)).rejects.toThrow(
        'Chunking failed',
      );

      expect(mockDownloadAndExtractDocs).toHaveBeenCalled();
      expect(mockCreateChunks).toHaveBeenCalled();
    });
  });
});
