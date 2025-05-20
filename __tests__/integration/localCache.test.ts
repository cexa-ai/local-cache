import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// 创建模拟函数
const mockCompressWithZstd = jest.fn().mockResolvedValue(true);
const mockDecompressWithZstd = jest.fn().mockResolvedValue(true);
const mockGetCacheFilePath = jest.fn(key => `/cache/dir/${key}.tar.zst`);
const mockCacheExists = jest.fn().mockReturnValue(true);
const mockFsExistsSync = jest.fn().mockReturnValue(true);

// 模拟依赖模块
jest.doMock('../../src/cache/compression', () => ({
  compressWithZstd: mockCompressWithZstd,
  decompressWithZstd: mockDecompressWithZstd
}));

jest.doMock('../../src/cache/utils', () => ({
  getCacheFilePath: mockGetCacheFilePath,
  cacheExists: mockCacheExists,
  resolvePaths: (paths: string) => paths.split('\n').map(p => p.trim()).filter(p => p !== '')
}));

jest.doMock('fs', () => ({
  existsSync: mockFsExistsSync
}));

// 在模拟之后导入模块
import { LocalCache } from '../../src/cache/localCache';

describe('LocalCache 集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置模拟函数的默认行为
    mockCompressWithZstd.mockResolvedValue(true);
    mockDecompressWithZstd.mockResolvedValue(true);
    mockGetCacheFilePath.mockImplementation(key => `/cache/dir/${key}.tar.zst`);
    mockCacheExists.mockReturnValue(true);
    mockFsExistsSync.mockReturnValue(true);
  });

  describe('save', () => {
    test('应该成功保存缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      mockFsExistsSync.mockReturnValue(true);
      mockGetCacheFilePath.mockReturnValue(cachePath);
      mockCompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(true);
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
      expect(mockCompressWithZstd).toHaveBeenCalledWith(cachePath, paths, 3);
    });

    test('不存在的路径应该被过滤掉', async () => {
      const paths = ['/path/to/cache', '/non/existent/path'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      mockFsExistsSync.mockImplementation(path => path === '/path/to/cache');
      mockGetCacheFilePath.mockReturnValue(cachePath);
      mockCompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(true);
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
      expect(mockCompressWithZstd).toHaveBeenCalledWith(cachePath, ['/path/to/cache'], 3);
    });

    test('所有路径都不存在时应该跳过保存', async () => {
      const paths = ['/non/existent/path1', '/non/existent/path2'];
      const key = 'test-cache-key';
      
      mockFsExistsSync.mockReturnValue(false);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(false);
      expect(mockCompressWithZstd).not.toHaveBeenCalled();
    });

    test('压缩失败时应该返回失败', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      mockFsExistsSync.mockReturnValue(true);
      mockGetCacheFilePath.mockReturnValue(cachePath);
      mockCompressWithZstd.mockResolvedValue(false);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(false);
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
      expect(mockCompressWithZstd).toHaveBeenCalledWith(cachePath, paths, 3);
    });
  });

  describe('restore', () => {
    test('主键匹配时应该成功恢复缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      mockCacheExists.mockReturnValue(true);
      mockGetCacheFilePath.mockReturnValue(cachePath);
      mockDecompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.restore(paths, key);
      
      expect(result).toEqual({ cacheHit: true, restoredKey: key });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
      expect(mockDecompressWithZstd).toHaveBeenCalledWith(cachePath, '/');
    });

    test('主键不匹配但备用键匹配时应该成功恢复缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      const cachePath = '/cache/dir/restore_key2.tar.zst';
      
      mockCacheExists.mockImplementation(k => k === 'restore-key2');
      mockGetCacheFilePath.mockReturnValue(cachePath);
      mockDecompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.restore(paths, key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, restoredKey: 'restore-key2' });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
      expect(mockGetCacheFilePath).toHaveBeenCalledWith('restore-key2');
      expect(mockDecompressWithZstd).toHaveBeenCalledWith(cachePath, '/');
    });

    test('没有匹配的键时应该返回未命中', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      mockCacheExists.mockReturnValue(false);
      
      const result = await LocalCache.restore(paths, key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, restoredKey: undefined });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
      expect(mockDecompressWithZstd).not.toHaveBeenCalled();
    });
  });

  describe('lookup', () => {
    test('主键匹配时应该返回命中', () => {
      const key = 'test-cache-key';
      
      mockCacheExists.mockReturnValue(true);
      
      const result = LocalCache.lookup(key);
      
      expect(result).toEqual({ cacheHit: true, matchedKey: key });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
    });

    test('主键不匹配但备用键匹配时应该返回部分命中', () => {
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      mockCacheExists.mockImplementation(k => k === 'restore-key2');
      
      const result = LocalCache.lookup(key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, matchedKey: 'restore-key2' });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
    });

    test('没有匹配的键时应该返回未命中', () => {
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      mockCacheExists.mockReturnValue(false);
      
      const result = LocalCache.lookup(key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, matchedKey: undefined });
      expect(mockCacheExists).toHaveBeenCalledWith(key);
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
    });
  });
}); 