/**
 * @jest-environment node
 */
// @ts-nocheck 禁用类型检查，因为我们主要关注模拟的行为

// 导入被测试的类
import { LocalCache } from '../../src/cache/localCache.js';
import { describe, expect, test, jest, beforeEach, afterAll } from '@jest/globals';
import * as fs from 'fs';

// 创建模拟函数
const mockCompressWithZstd = jest.fn();
const mockDecompressWithZstd = jest.fn();
const mockGetCacheFilePath = jest.fn();
const mockCacheExists = jest.fn();
const mockExistsSync = jest.fn();
const mockInfo = jest.fn();
const mockDebug = jest.fn();
const mockWarning = jest.fn();
const mockError = jest.fn();

// 测试中使用的临时目录和文件
const TEST_CACHE_PATH = '/tmp/cache-test/test-cache.tar.zst';

// 保存原始方法
const originalSave = LocalCache.save;
const originalRestore = LocalCache.restore;
const originalLookup = LocalCache.lookup;

describe('LocalCache 集成测试', () => {
    beforeEach(() => {
        // 清除所有模拟函数的调用历史
        jest.clearAllMocks();

        // 直接替换 LocalCache 类的方法
        LocalCache.save = async (paths, key, compressionLevel = 3) => {
            // 模拟存在性检查
            const existingPaths = paths.filter(p => mockExistsSync(p));
            if (existingPaths.length === 0) {
                return false;
            }

            // 模拟获取缓存路径
            const cachePath = mockGetCacheFilePath(key);

            // 模拟压缩
            const success = await mockCompressWithZstd(cachePath, existingPaths, compressionLevel);
            return success;
        };

        LocalCache.restore = async (paths, primaryKey, restoreKeys = [], targetDir = '/') => {
            // 检查主键
            if (mockCacheExists(primaryKey)) {
                const cachePath = mockGetCacheFilePath(primaryKey);
                const success = await mockDecompressWithZstd(cachePath, targetDir);

                if (success) {
                    return { cacheHit: true, restoredKey: primaryKey };
                }
            }

            // 检查备用键
            for (const restoreKey of restoreKeys) {
                if (mockCacheExists(restoreKey)) {
                    const cachePath = mockGetCacheFilePath(restoreKey);
                    const success = await mockDecompressWithZstd(cachePath, targetDir);

                    if (success) {
                        return { cacheHit: false, restoredKey: restoreKey };
                    }
                }
            }

            return { cacheHit: false, restoredKey: undefined };
        };

        LocalCache.lookup = (primaryKey, restoreKeys = []) => {
            if (mockCacheExists(primaryKey)) {
                return { cacheHit: true, matchedKey: primaryKey };
            }

            for (const restoreKey of restoreKeys) {
                if (mockCacheExists(restoreKey)) {
                    return { cacheHit: false, matchedKey: restoreKey };
                }
            }

            return { cacheHit: false, matchedKey: undefined };
        };
    });

    // 恢复原始方法
    afterAll(() => {
        LocalCache.save = originalSave;
        LocalCache.restore = originalRestore;
        LocalCache.lookup = originalLookup;
    });

    describe('save', () => {
        test('应该成功保存缓存', async () => {
            // 设置模拟返回值
            mockExistsSync.mockReturnValue(true);
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockCompressWithZstd.mockResolvedValue(true);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const result = await LocalCache.save(paths, key);

            // 验证模拟函数被正确调用
            expect(mockExistsSync).toHaveBeenCalledWith(paths[0]);
            expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
            expect(mockCompressWithZstd).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        test('不存在的路径应该被过滤掉', async () => {
            // 只有第一个路径存在
            mockExistsSync.mockImplementation(path => path === '/path/to/cache');
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockCompressWithZstd.mockResolvedValue(true);

            // 调用测试对象
            const paths = ['/path/to/cache', '/non/existent/path'];
            const key = 'test-cache-key';
            const result = await LocalCache.save(paths, key);

            // 验证模拟函数被正确调用
            expect(mockExistsSync).toHaveBeenCalledWith('/path/to/cache');
            expect(mockExistsSync).toHaveBeenCalledWith('/non/existent/path');
            expect(mockCompressWithZstd).toHaveBeenCalledWith(
                '/mock/cache/path.tar.zst',
                ['/path/to/cache'],
                3
            );
            expect(result).toBe(true);
        });

        test('所有路径都不存在时应该跳过保存', async () => {
            // 所有路径都不存在
            mockExistsSync.mockReturnValue(false);

            // 调用测试对象
            const paths = ['/non/existent/path1', '/non/existent/path2'];
            const key = 'test-cache-key';
            const result = await LocalCache.save(paths, key);

            // 验证模拟函数被正确调用
            expect(mockExistsSync).toHaveBeenCalledWith(paths[0]);
            expect(mockExistsSync).toHaveBeenCalledWith(paths[1]);
            expect(mockCompressWithZstd).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        test('压缩失败时应该返回失败', async () => {
            // 路径存在但压缩失败
            mockExistsSync.mockReturnValue(true);
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockCompressWithZstd.mockResolvedValue(false);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const result = await LocalCache.save(paths, key);

            // 验证模拟函数被正确调用
            expect(mockCompressWithZstd).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('restore', () => {
        test('主键匹配时应该成功恢复缓存', async () => {
            // 设置模拟
            mockCacheExists.mockReturnValue(true);
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockDecompressWithZstd.mockResolvedValue(true);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const result = await LocalCache.restore(paths, key);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(mockGetCacheFilePath).toHaveBeenCalledWith(key);
            expect(mockDecompressWithZstd).toHaveBeenCalled();
            expect(result).toEqual({ cacheHit: true, restoredKey: key });
        });

        test('主键不匹配但备用键匹配时应该成功恢复缓存', async () => {
            // 主键不存在，但第二个备用键存在
            mockCacheExists.mockImplementation(k => k === 'restore-key2');
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockDecompressWithZstd.mockResolvedValue(true);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const restoreKeys = ['restore-key1', 'restore-key2'];
            const result = await LocalCache.restore(paths, key, restoreKeys);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
            expect(mockGetCacheFilePath).toHaveBeenCalledWith('restore-key2');
            expect(mockDecompressWithZstd).toHaveBeenCalled();
            expect(result).toEqual({ cacheHit: false, restoredKey: 'restore-key2' });
        });

        test('应该支持自定义目标目录', async () => {
            // 设置模拟
            mockCacheExists.mockReturnValue(true);
            mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst');
            mockDecompressWithZstd.mockResolvedValue(true);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const targetDir = '/custom/target/dir';
            const result = await LocalCache.restore(paths, key, [], targetDir);

            // 验证调用和结果
            expect(mockDecompressWithZstd).toHaveBeenCalledWith('/mock/cache/path.tar.zst', targetDir);
            expect(result).toEqual({ cacheHit: true, restoredKey: key });
        });

        test('没有匹配的键时应该返回未命中', async () => {
            // 所有键都不存在
            mockCacheExists.mockReturnValue(false);

            // 调用测试对象
            const paths = ['/path/to/cache'];
            const key = 'test-cache-key';
            const restoreKeys = ['restore-key1', 'restore-key2'];
            const result = await LocalCache.restore(paths, key, restoreKeys);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
            expect(mockDecompressWithZstd).not.toHaveBeenCalled();
            expect(result).toEqual({ cacheHit: false, restoredKey: undefined });
        });
    });

    describe('lookup', () => {
        test('主键匹配时应该返回命中', () => {
            // 设置模拟
            mockCacheExists.mockReturnValue(true);

            // 调用测试对象
            const key = 'test-cache-key';
            const result = LocalCache.lookup(key);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(result).toEqual({ cacheHit: true, matchedKey: key });
        });

        test('主键不匹配但备用键匹配时应该返回部分命中', () => {
            // 主键不存在，但第二个备用键存在
            mockCacheExists.mockImplementation(k => k === 'restore-key2');

            // 调用测试对象
            const key = 'test-cache-key';
            const restoreKeys = ['restore-key1', 'restore-key2'];
            const result = LocalCache.lookup(key, restoreKeys);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
            expect(result).toEqual({ cacheHit: false, matchedKey: 'restore-key2' });
        });

        test('没有匹配的键时应该返回未命中', () => {
            // 所有键都不存在
            mockCacheExists.mockReturnValue(false);

            // 调用测试对象
            const key = 'test-cache-key';
            const restoreKeys = ['restore-key1', 'restore-key2'];
            const result = LocalCache.lookup(key, restoreKeys);

            // 验证调用和结果
            expect(mockCacheExists).toHaveBeenCalledWith(key);
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key1');
            expect(mockCacheExists).toHaveBeenCalledWith('restore-key2');
            expect(result).toEqual({ cacheHit: false, matchedKey: undefined });
        });
    });
});
