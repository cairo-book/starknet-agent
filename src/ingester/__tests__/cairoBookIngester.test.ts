import { splitMarkdownIntoSections, createChunks } from '../cairoBookIngester';
import { BookPageDto, findChunksToUpdateAndRemove, isInsideCodeBlock } from '../shared';
import { Document } from '@langchain/core/documents';

describe('splitMarkdownIntoSections', () => {
  it('should split content with multiple headers of different levels', () => {
    const content = `# Title 1
Some content
## Subtitle
More content
### Section
Even more content`;

    const result = splitMarkdownIntoSections(content);

    expect(result).toEqual([
      { title: 'Title 1', content: '# Title 1\nSome content' },
      { title: 'Subtitle', content: '## Subtitle\nMore content' },
      { title: 'Section', content: '### Section\nEven more content' },
    ]);
  });

  it('should handle content with no headers', () => {
    const content = 'Just some plain text without headers.';
    const result = splitMarkdownIntoSections(content);
    expect(result).toEqual([{ title: '', content: 'Just some plain text without headers.' }]);
  });

  it('should handle content with only one header', () => {
    const content = '# Single Header\nWith some content';
    const result = splitMarkdownIntoSections(content);
    expect(result).toEqual([{ title: 'Single Header', content: '# Single Header\nWith some content' }]);
  });

  it('should handle empty content', () => {
    const content = '';
    const result = splitMarkdownIntoSections(content);
    expect(result).toEqual([]);
  });

  it('should handle content with headers but no content', () => {
    const content = '# Header 1\n## Header 2\n### Header 3';
    const result = splitMarkdownIntoSections(content);
    expect(result).toEqual([
      { title: 'Header 1', content: '# Header 1' },
      { title: 'Header 2', content: '## Header 2' },
      { title: 'Header 3', content: '### Header 3' },
    ]);
  });

  it('should not split on headers inside code blocks', () => {
    const content = `# Main Title
Some content
\`\`\`
# This is not a header
code line 1
code line 2
\`\`\`
## Real Subtitle
More content
\`\`\`
# println!("This is a hidden line");
# println!("This is a visible line");
\`\`\`
### Another Section
Final content`;

    const result = splitMarkdownIntoSections(content);

    expect(result).toEqual([
      {
        title: 'Main Title',
        content: `# Main Title
Some content
\`\`\`
# This is not a header
code line 1
code line 2
\`\`\``
      },
      {
        title: 'Real Subtitle',
        content: `## Real Subtitle
More content
\`\`\`
# println!("This is a hidden line");
# println!("This is a visible line");
\`\`\``
      },
      {
        title: 'Another Section',
        content: `### Another Section
Final content`
      }
    ]);
  });
});

describe('createChunks', () => {
  it('should create chunks from multiple pages', async () => {
    const pages: BookPageDto[] = [
      {
        name: 'page1',
        content: '# Title 1\nContent 1\n## Subtitle\nMore content',
      },
      {
        name: 'page2',
        content: '# Title 2\nContent 2',
      },
    ];

    const result = await createChunks(pages);

    expect(result).toHaveLength(3);
    expect(result[0].pageContent).toBe('# Title 1\nContent 1');
    expect(result[0].metadata).toMatchObject({
      name: 'page1',
      title: 'Title 1',
      chunkNumber: 0,
    });
    expect(result[1].pageContent).toBe('## Subtitle\nMore content');
    expect(result[1].metadata).toMatchObject({
      name: 'page1',
      title: 'Subtitle',
      chunkNumber: 1,
    });
    expect(result[2].pageContent).toBe('# Title 2\nContent 2');
    expect(result[2].metadata).toMatchObject({
      name: 'page2',
      title: 'Title 2',
      chunkNumber: 0,
    });
  });

  it('should handle empty pages', async () => {
    const pages: BookPageDto[] = [
      { name: 'empty', content: '' },
    ];

    const result = await createChunks(pages);

    expect(result).toHaveLength(0);
  });
});

describe('findChunksToUpdateAndRemove', () => {
  it('should correctly identify chunks to update and remove', () => {
    const freshChunks: Document<Record<string, any>>[] = [
      { metadata: { uniqueId: '1', contentHash: 'hash1' }, pageContent: 'Some Content 1' },
      { metadata: { uniqueId: '2', contentHash: 'hash2_updated' }, pageContent: 'Some Content 2' },
      { metadata: { uniqueId: '4', contentHash: 'hash4' }, pageContent: 'Some Content 3' },
    ];

    const storedChunkHashes = [
      { uniqueId: '1', contentHash: 'hash1' },
      { uniqueId: '2', contentHash: 'hash2' },
      { uniqueId: '3', contentHash: 'hash3' },
    ];

    const result = findChunksToUpdateAndRemove(freshChunks, storedChunkHashes);

    expect(result.chunksToUpdate).toEqual([
      { metadata: { uniqueId: '2', contentHash: 'hash2_updated' }, pageContent: 'Some Content 2' },
      { metadata: { uniqueId: '4', contentHash: 'hash4' }, pageContent: 'Some Content 3' },
    ]);
    expect(result.chunksToRemove).toEqual(['3']);
  });

  it('should return empty arrays when no updates or removals are needed', () => {
    const freshChunks: Document<Record<string, any>>[] = [
      { metadata: { uniqueId: '1', contentHash: 'hash1' }, pageContent: 'Some Content 1' },
      { metadata: { uniqueId: '2', contentHash: 'hash2' }, pageContent: 'Some Content 2' },
    ];

    const storedChunkHashes = [
      { uniqueId: '1', contentHash: 'hash1' },
      { uniqueId: '2', contentHash: 'hash2' },
    ];

    const result = findChunksToUpdateAndRemove(freshChunks, storedChunkHashes);

    expect(result.chunksToUpdate).toEqual([]);
    expect(result.chunksToRemove).toEqual([]);
  });

  it('should handle empty inputs correctly', () => {
    const result = findChunksToUpdateAndRemove([], []);

    expect(result.chunksToUpdate).toEqual([]);
    expect(result.chunksToRemove).toEqual([]);
  });
});

describe('isInsideCodeBlock', () => {
  const testContent = `
# Header

Some text

\`\`\`
code block
multi-line
\`\`\`

More text

\`\`\`typescript
function example() {
  console.log('Hello');
}
\`\`\`

Final text
`;

  it('should return true for indices inside code blocks', () => {
    expect(isInsideCodeBlock(testContent, testContent.indexOf('code block'))).toBe(true);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('multi-line'))).toBe(true);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('function example'))).toBe(true);
  });

  it('should return false for indices outside code blocks', () => {
    expect(isInsideCodeBlock(testContent, testContent.indexOf('# Header'))).toBe(false);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('Some text'))).toBe(false);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('More text'))).toBe(false);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('Final text'))).toBe(false);
  });

  it('should handle edge cases', () => {
    //@dev: we consider the backticks to be part of the code block
    expect(isInsideCodeBlock(testContent, testContent.indexOf('```'))).toBe(true);
    expect(isInsideCodeBlock(testContent, testContent.indexOf('```') + 1)).toBe(true);
    expect(isInsideCodeBlock(testContent, testContent.lastIndexOf('```') - 1)).toBe(true);
    expect(isInsideCodeBlock(testContent, testContent.lastIndexOf('```'))).toBe(true);
  });
});
