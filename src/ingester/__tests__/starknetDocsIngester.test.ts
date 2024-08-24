import * as fs from 'fs/promises';
import * as path from 'path';
import { restructureDocumentation } from '../starknetDocsIngester';
import { Dirent } from 'fs';

jest.mock('fs/promises');
jest.mock('path');

describe('restructureDocumentation', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...paths) => paths.join('/'));
    mockPath.extname.mockImplementation((file) => {
      const parts = file.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });
    mockPath.dirname.mockImplementation((p) =>
      p.split('/').slice(0, -1).join('/'),
    );
  });

  it('should restructure documentation correctly', async () => {
    const sourceDir = '/source';
    const targetDir = '/target';

    // Mock file system structure
    mockFs.readdir.mockImplementation((path) => {
      const structure: { [key: string]: string[] } = {
        '/source': ['ROOT_FILE.adoc', 'NESTED_DIR'],
        '/source/NESTED_DIR': ['NESTED_FILE.adoc', 'DEEP_NESTED_DIR'],
        '/source/NESTED_DIR/DEEP_NESTED_DIR': ['DEEP_NESTED_FILE.adoc'],
      };
      return Promise.resolve(
        structure[path as string].map(
          (entry) =>
            ({
              name: entry,
              isDirectory: () => !entry.endsWith('.adoc'),
              isFile: () => entry.endsWith('.adoc'),
            }) as Dirent,
        ),
      );
    });

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check if directories were created
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target/nested-dir', {
      recursive: true,
    });
    expect(mockFs.mkdir).toHaveBeenCalledWith(
      '/target/nested-dir/deep-nested-dir',
      { recursive: true },
    );

    // Check if files were copied
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/ROOT_FILE.adoc',
      '/target/root-file.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/NESTED_DIR/NESTED_FILE.adoc',
      '/target/nested-dir/nested-file.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/NESTED_DIR/DEEP_NESTED_DIR/DEEP_NESTED_FILE.adoc',
      '/target/nested-dir/deep-nested-dir/deep-nested-file.adoc',
    );
  });

  it('should not copy empty directories', async () => {
    const sourceDir = '/empty_source';
    const targetDir = '/empty_target';

    mockFs.readdir.mockResolvedValue([]);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rmdir.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check that the target directory is created
    expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
    expect(mockFs.mkdir).toHaveBeenCalledWith('/empty_target', {
      recursive: true,
    });

    // Check that the empty target directory is removed
    expect(mockFs.rmdir).toHaveBeenCalledTimes(1);
    expect(mockFs.rmdir).toHaveBeenCalledWith('/empty_target', {
      recursive: true,
    });

    // No files should be copied
    expect(mockFs.copyFile).not.toHaveBeenCalled();
  });

  it('should not create directories for folders without .adoc files or subdirectories', async () => {
    const sourceDir = '/source';
    const targetDir = '/target';

    mockFs.readdir.mockImplementation((path) => {
      const structure: { [key: string]: string[] } = {
        '/source': ['VALID_DIR', 'EMPTY_DIR', 'NON_ADOC_DIR'],
        '/source/VALID_DIR': ['file.adoc'],
        '/source/EMPTY_DIR': [],
        '/source/NON_ADOC_DIR': ['file.txt', 'image.png'],
      };
      return Promise.resolve(
        structure[path as string].map(
          (entry) =>
            ({
              name: entry,
              isDirectory: () => !entry.includes('.'),
              isFile: () => entry.includes('.'),
            }) as Dirent,
        ),
      );
    });

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check if only the necessary directories were created
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target/valid-dir', {
      recursive: true,
    });
    expect(mockFs.mkdir).not.toHaveBeenCalledWith('/target/empty-dir', {
      recursive: true,
    });
    expect(mockFs.mkdir).not.toHaveBeenCalledWith('/target/non-adoc-dir', {
      recursive: true,
    });

    // Check if only the .adoc file was copied
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/VALID_DIR/file.adoc',
      '/target/valid-dir/file.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
  });

  it('should ignore non-.adoc files when restructuring documentation', async () => {
    const sourceDir = '/source_with_other_files';
    const targetDir = '/target';

    mockFs.readdir.mockResolvedValue([
      {
        name: 'file.adoc',
        isDirectory: () => false,
        isFile: () => true,
      } as Dirent,
      {
        name: 'file.txt',
        isDirectory: () => false,
        isFile: () => true,
      } as Dirent,
      {
        name: 'file.md',
        isDirectory: () => false,
        isFile: () => true,
      } as Dirent,
    ]);

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    expect(path.extname).toHaveBeenCalledWith('file.adoc');
    expect(path.extname).toHaveBeenCalledWith('file.txt');
    expect(path.extname).toHaveBeenCalledWith('file.md');

    expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source_with_other_files/file.adoc',
      '/target/file.adoc',
    );
  });

  it('should skip nav.adoc files', async () => {
    const sourceDir = '/source';
    const targetDir = '/target';

    // Mock file system structure
    mockFs.readdir.mockImplementation((path) => {
      const structure: { [key: string]: string[] } = {
        '/source': [
          'regular.adoc',
          'NAV.adoc',
          'another_file.adoc',
          'NESTED_DIR',
        ],
        '/source/NESTED_DIR': ['nested_regular.adoc', 'nav.adoc'],
      };
      return Promise.resolve(
        structure[path as string].map(
          (entry) =>
            ({
              name: entry,
              isDirectory: () => !entry.endsWith('.adoc'),
              isFile: () => entry.endsWith('.adoc'),
            }) as Dirent,
        ),
      );
    });

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check if directories were created
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target/nested-dir', {
      recursive: true,
    });

    // Check if correct files were copied and nav.adoc files were skipped
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/regular.adoc',
      '/target/regular.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/another_file.adoc',
      '/target/another-file.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/NESTED_DIR/nested_regular.adoc',
      '/target/nested-dir/nested-regular.adoc',
    );

    // Check that nav.adoc files were not copied
    expect(mockFs.copyFile).not.toHaveBeenCalledWith(
      expect.stringContaining('NAV.adoc'),
      expect.any(String),
    );
    expect(mockFs.copyFile).not.toHaveBeenCalledWith(
      expect.stringContaining('nav.adoc'),
      expect.any(String),
    );

    // Check total number of copyFile calls
    expect(mockFs.copyFile).toHaveBeenCalledTimes(3);
  });

  it('should handle empty directories', async () => {
    const sourceDir = '/empty_source';
    const targetDir = '/empty_target';

    mockFs.readdir.mockResolvedValue([]);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rmdir.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check that the target directory is created
    expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
    expect(mockFs.mkdir).toHaveBeenCalledWith('/empty_target', {
      recursive: true,
    });

    // Check that the empty target directory is removed
    expect(mockFs.rmdir).toHaveBeenCalledTimes(1);
    expect(mockFs.rmdir).toHaveBeenCalledWith('/empty_target', {
      recursive: true,
    });

    // No files should be copied
    expect(mockFs.copyFile).not.toHaveBeenCalled();
  });

  it('should copy contents of "pages" directory directly to parent', async () => {
    const sourceDir = '/source';
    const targetDir = '/target';

    // Mock file system structure
    mockFs.readdir.mockImplementation((path) => {
      const structure: { [key: string]: string[] } = {
        '/source': ['NORMAL_DIR', 'DIR_WITH_PAGES'],
        '/source/NORMAL_DIR': ['normal_file.adoc'],
        '/source/DIR_WITH_PAGES': ['pages'],
        '/source/DIR_WITH_PAGES/pages': [
          'content.adoc',
          'another_content.adoc',
        ],
      };
      return Promise.resolve(
        structure[path as string].map(
          (entry) =>
            ({
              name: entry,
              isDirectory: () => !entry.endsWith('.adoc'),
              isFile: () => entry.endsWith('.adoc'),
            }) as Dirent,
        ),
      );
    });

    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    await restructureDocumentation(sourceDir, targetDir);

    // Check if directories were created
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target/normal-dir', {
      recursive: true,
    });
    expect(mockFs.mkdir).toHaveBeenCalledWith('/target/dir-with-pages', {
      recursive: true,
    });

    // Check if files were copied correctly
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/NORMAL_DIR/normal_file.adoc',
      '/target/normal-dir/normal-file.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/DIR_WITH_PAGES/pages/content.adoc',
      '/target/dir-with-pages/content.adoc',
    );
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/source/DIR_WITH_PAGES/pages/another_content.adoc',
      '/target/dir-with-pages/another-content.adoc',
    );

    // Ensure no 'pages' directory was created in the target
    expect(mockFs.mkdir).not.toHaveBeenCalledWith(
      '/target/dir-with-pages/pages',
      { recursive: true },
    );

    // Check total number of copyFile calls
    expect(mockFs.copyFile).toHaveBeenCalledTimes(3);
  });
});
