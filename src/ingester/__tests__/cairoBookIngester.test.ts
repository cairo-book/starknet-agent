import { splitMarkdownIntoSections, createChunks, BookPageDto } from '../cairoBookIngester';

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
