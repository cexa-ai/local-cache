import { describe, expect, test, jest } from '@jest/globals';
import * as fs from 'fs';
import { resolvePaths, getCacheDir, getCacheFilePath, cacheExists } from '../../src/cache/utils';

// 模拟 fs 模块
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// 创建本地模块对象而不是尝试 mock global
const utils = { getCacheDir, getCacheFilePath };

describe('utils 工具函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolvePaths', () => {
    test('应该正确解析单行路径', () => {
      const paths = resolvePaths('/path/to/file');
      expect(paths).toEqual(['/path/to/file']);
    });

    test('应该正确解析多行路径', () => {
      const paths = resolvePaths(`/path/to/file1
/path/to/file2
/path/to/file3`);
      expect(paths).toEqual([
        '/path/to/file1',
        '/path/to/file2',
        '/path/to/file3'
      ]);
    });

    test('应该移除空行', () => {
      const paths = resolvePaths(`/path/to/file1

/path/to/file2
`);
      expect(paths).toEqual([
        '/path/to/file1',
        '/path/to/file2'
      ]);
    });

    test('应该移除空白行', () => {
      const paths = resolvePaths(`/path/to/file1
  
/path/to/file2`);
      expect(paths).toEqual([
        '/path/to/file1',
        '/path/to/file2'
      ]);
    });
  });

  describe('getCacheDir', () => {
    test('应该使用 RUNNER_TOOL_CACHE 环境变量', () => {
      process.env.RUNNER_TOOL_CACHE = '/cache/dir';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const cacheDir = getCacheDir();
      
      expect(cacheDir).toBe('/cache/dir');
      expect(fs.existsSync).toHaveBeenCalledWith('/cache/dir');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      
      delete process.env.RUNNER_TOOL_CACHE;
    });

    test('应该使用 HOME 环境变量创建默认缓存目录', () => {
      process.env.HOME = '/home/user';
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const cacheDir = getCacheDir();
      
      expect(cacheDir).toBe('/home/user/.local-cache');
      expect(fs.existsSync).toHaveBeenCalledWith('/home/user/.local-cache');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/user/.local-cache', { recursive: true });
      
      delete process.env.HOME;
    });

    test('应该在缓存目录不存在时创建缓存目录', () => {
      process.env.RUNNER_TOOL_CACHE = '/cache/dir';
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const cacheDir = getCacheDir();
      
      expect(cacheDir).toBe('/cache/dir');
      expect(fs.existsSync).toHaveBeenCalledWith('/cache/dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/cache/dir', { recursive: true });
      
      delete process.env.RUNNER_TOOL_CACHE;
    });
  });

  describe('getCacheFilePath', () => {
    test('应该正确生成缓存文件路径', () => {
      // 替代 global mock，使用模块导入的函数进行 mock
      jest.spyOn(utils, 'getCacheDir').mockReturnValue('/cache/dir');
      
      const cachePath = getCacheFilePath('my-cache-key');
      
      expect(cachePath).toBe('/cache/dir/my_cache_key.tar.zst');
    });

    test('应该安全地处理特殊字符', () => {
      jest.spyOn(utils, 'getCacheDir').mockReturnValue('/cache/dir');
      
      const cachePath = getCacheFilePath('my/cache/key:with:special$chars');
      
      expect(cachePath).toBe('/cache/dir/my_cache_key_with_special_chars.tar.zst');
    });
  });

  describe('cacheExists', () => {
    test('应该检查缓存文件是否存在', () => {
      // 使用 jest.fn() 直接 mock getCacheFilePath
      const originalGetCacheFilePath = utils.getCacheFilePath; 
      utils.getCacheFilePath = jest.fn().mockReturnValue('/cache/dir/my_cache_key.tar.zst');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const exists = cacheExists('my-cache-key');
      
      expect(exists).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/cache/dir/my_cache_key.tar.zst');
      
      // 恢复原始函数
      utils.getCacheFilePath = originalGetCacheFilePath;
    });
  });
}); 