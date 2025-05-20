import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import { LocalCache } from '../../src/cache/localCache';
import { compressWithZstd, decompressWithZstd } from '../../src/cache/compression';
import { getCacheFilePath, cacheExists } from '../../src/cache/utils';

// 模拟依赖模块
jest.mock('../../src/cache/compression', () => ({
  compressWithZstd: jest.fn(),
  decompressWithZstd: jest.fn()
}));

jest.mock('../../src/cache/utils', () => ({
  getCacheFilePath: jest.fn(key => `/cache/dir/${key}.tar.zst`),
  cacheExists: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

describe('LocalCache 集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的模拟返回值
    compressWithZstd.mockResolvedValue(true);
    decompressWithZstd.mockResolvedValue(true);
    getCacheFilePath.mockImplementation(key => `/cache/dir/${key}.tar.zst`);
    cacheExists.mockReturnValue(true);
    fs.existsSync.mockReturnValue(true);
  });

  describe('save', () => {
    test('应该成功保存缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      fs.existsSync.mockReturnValue(true);
      getCacheFilePath.mockReturnValue(cachePath);
      compressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(true);
      expect(getCacheFilePath).toHaveBeenCalledWith(key);
      expect(compressWithZstd).toHaveBeenCalledWith(cachePath, paths, 3);
    });

    test('不存在的路径应该被过滤掉', async () => {
      const paths = ['/path/to/cache', '/non/existent/path'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      fs.existsSync.mockImplementation(path => path === '/path/to/cache');
      getCacheFilePath.mockReturnValue(cachePath);
      compressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(true);
      expect(getCacheFilePath).toHaveBeenCalledWith(key);
      expect(compressWithZstd).toHaveBeenCalledWith(cachePath, ['/path/to/cache'], 3);
    });

    test('所有路径都不存在时应该跳过保存', async () => {
      const paths = ['/non/existent/path1', '/non/existent/path2'];
      const key = 'test-cache-key';
      
      fs.existsSync.mockReturnValue(false);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(false);
      expect(compressWithZstd).not.toHaveBeenCalled();
    });

    test('压缩失败时应该返回失败', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      fs.existsSync.mockReturnValue(true);
      getCacheFilePath.mockReturnValue(cachePath);
      compressWithZstd.mockResolvedValue(false);
      
      const result = await LocalCache.save(paths, key);
      
      expect(result).toBe(false);
      expect(getCacheFilePath).toHaveBeenCalledWith(key);
      expect(compressWithZstd).toHaveBeenCalledWith(cachePath, paths, 3);
    });
  });

  describe('restore', () => {
    test('主键匹配时应该成功恢复缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const cachePath = '/cache/dir/test_cache_key.tar.zst';
      
      cacheExists.mockReturnValue(true);
      getCacheFilePath.mockReturnValue(cachePath);
      decompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.restore(paths, key);
      
      expect(result).toEqual({ cacheHit: true, restoredKey: key });
      expect(cacheExists).toHaveBeenCalledWith(key);
      expect(getCacheFilePath).toHaveBeenCalledWith(key);
      expect(decompressWithZstd).toHaveBeenCalledWith(cachePath, '/');
    });

    test('主键不匹配但备用键匹配时应该成功恢复缓存', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      const cachePath = '/cache/dir/restore_key2.tar.zst';
      
      cacheExists.mockImplementation(k => k === 'restore-key2');
      getCacheFilePath.mockReturnValue(cachePath);
      decompressWithZstd.mockResolvedValue(true);
      
      const result = await LocalCache.restore(paths, key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, restoredKey: 'restore-key2' });
      expect(cacheExists).toHaveBeenCalledWith(key);
      expect(cacheExists).toHaveBeenCalledWith('restore-key1');
      expect(cacheExists).toHaveBeenCalledWith('restore-key2');
      expect(getCacheFilePath).toHaveBeenCalledWith('restore-key2');
      expect(decompressWithZstd).toHaveBeenCalledWith(cachePath, '/');
    });

    test('没有匹配的键时应该返回未命中', async () => {
      const paths = ['/path/to/cache'];
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      cacheExists.mockReturnValue(false);
      
      const result = await LocalCache.restore(paths, key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, restoredKey: undefined });
      expect(cacheExists).toHaveBeenCalledWith(key);
      expect(cacheExists).toHaveBeenCalledWith('restore-key1');
      expect(cacheExists).toHaveBeenCalledWith('restore-key2');
      expect(decompressWithZstd).not.toHaveBeenCalled();
    });
  });

  describe('lookup', () => {
    test('主键匹配时应该返回命中', () => {
      const key = 'test-cache-key';
      
      cacheExists.mockReturnValue(true);
      
      const result = LocalCache.lookup(key);
      
      expect(result).toEqual({ cacheHit: true, matchedKey: key });
      expect(cacheExists).toHaveBeenCalledWith(key);
    });

    test('主键不匹配但备用键匹配时应该返回部分命中', () => {
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      cacheExists.mockImplementation(k => k === 'restore-key2');
      
      const result = LocalCache.lookup(key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, matchedKey: 'restore-key2' });
      expect(cacheExists).toHaveBeenCalledWith(key);
      expect(cacheExists).toHaveBeenCalledWith('restore-key1');
      expect(cacheExists).toHaveBeenCalledWith('restore-key2');
    });

    test('没有匹配的键时应该返回未命中', () => {
      const key = 'test-cache-key';
      const restoreKeys = ['restore-key1', 'restore-key2'];
      
      cacheExists.mockReturnValue(false);
      
      const result = LocalCache.lookup(key, restoreKeys);
      
      expect(result).toEqual({ cacheHit: false, matchedKey: undefined });
      expect(cacheExists).toHaveBeenCalledWith(key);
      expect(cacheExists).toHaveBeenCalledWith('restore-key1');
      expect(cacheExists).toHaveBeenCalledWith('restore-key2');
    });
  });
}); 