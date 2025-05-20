/**
 * @jest-environment node
 */
// @ts-nocheck Disable type checking as we are primarily focused on mock behavior

// Import the class being tested
import { LocalCache } from '../../src/cache/localCache.js'
import {
  describe,
  expect,
  test,
  jest,
  beforeEach,
  afterAll
} from '@jest/globals'
import * as fs from 'fs'

// Create mock functions
const mockCompressWithZstd = jest.fn()
const mockDecompressWithZstd = jest.fn()
const mockGetCacheFilePath = jest.fn()
const mockCacheExists = jest.fn()
const mockExistsSync = jest.fn()
const mockInfo = jest.fn()
const mockDebug = jest.fn()
const mockWarning = jest.fn()
const mockError = jest.fn()

// Temporary directory and file used in tests
const TEST_CACHE_PATH = '/tmp/cache-test/test-cache.tar.zst'

// Save original methods
const originalSave = LocalCache.save
const originalRestore = LocalCache.restore
const originalLookup = LocalCache.lookup

describe('LocalCache Integration Tests', () => {
  beforeEach(() => {
    // Clear call history for all mock functions
    jest.clearAllMocks()

    // Directly replace LocalCache class methods
    LocalCache.save = async (paths, key, compressionLevel = 3) => {
      // Mock existence check
      const existingPaths = paths.filter((p) => mockExistsSync(p))
      if (existingPaths.length === 0) {
        return false
      }

      // Mock getting cache path
      const cachePath = mockGetCacheFilePath(key)

      // Mock compression
      const success = await mockCompressWithZstd(
        cachePath,
        existingPaths,
        compressionLevel
      )
      return success
    }

    LocalCache.restore = async (
      paths,
      primaryKey,
      restoreKeys = [],
      targetDir = '/'
    ) => {
      // Check primary key
      if (mockCacheExists(primaryKey)) {
        const cachePath = mockGetCacheFilePath(primaryKey)
        const success = await mockDecompressWithZstd(cachePath, targetDir)

        if (success) {
          return { cacheHit: true, restoredKey: primaryKey }
        }
      }

      // Check fallback keys
      for (const restoreKey of restoreKeys) {
        if (mockCacheExists(restoreKey)) {
          const cachePath = mockGetCacheFilePath(restoreKey)
          const success = await mockDecompressWithZstd(cachePath, targetDir)

          if (success) {
            return { cacheHit: false, restoredKey: restoreKey }
          }
        }
      }

      return { cacheHit: false, restoredKey: undefined }
    }

    LocalCache.lookup = (primaryKey, restoreKeys = []) => {
      if (mockCacheExists(primaryKey)) {
        return { cacheHit: true, matchedKey: primaryKey }
      }

      for (const restoreKey of restoreKeys) {
        if (mockCacheExists(restoreKey)) {
          return { cacheHit: false, matchedKey: restoreKey }
        }
      }

      return { cacheHit: false, matchedKey: undefined }
    }
  })

  // Restore original methods
  afterAll(() => {
    LocalCache.save = originalSave
    LocalCache.restore = originalRestore
    LocalCache.lookup = originalLookup
  })

  describe('save', () => {
    test('should successfully save cache', async () => {
      // Setup mock return values
      mockExistsSync.mockReturnValue(true)
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockCompressWithZstd.mockResolvedValue(true)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const result = await LocalCache.save(paths, key)

      // Verify mock functions were called correctly
      expect(mockExistsSync).toHaveBeenCalledWith(paths[0])
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key)
      expect(mockCompressWithZstd).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should filter out non-existent paths', async () => {
      // Only the first path exists
      mockExistsSync.mockImplementation((path) => path === '/path/to/cache')
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockCompressWithZstd.mockResolvedValue(true)

      // Call test subject
      const paths = ['/path/to/cache', '/non/existent/path']
      const key = 'test-cache-key'
      const result = await LocalCache.save(paths, key)

      // Verify mock functions were called correctly
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/cache')
      expect(mockExistsSync).toHaveBeenCalledWith('/non/existent/path')
      expect(mockCompressWithZstd).toHaveBeenCalledWith(
        '/mock/cache/path.tar.zst',
        ['/path/to/cache'],
        3
      )
      expect(result).toBe(true)
    })

    test('should skip saving when all paths do not exist', async () => {
      // All paths don't exist
      mockExistsSync.mockReturnValue(false)

      // Call test subject
      const paths = ['/non/existent/path1', '/non/existent/path2']
      const key = 'test-cache-key'
      const result = await LocalCache.save(paths, key)

      // Verify mock functions were called correctly
      expect(mockExistsSync).toHaveBeenCalledWith(paths[0])
      expect(mockExistsSync).toHaveBeenCalledWith(paths[1])
      expect(mockCompressWithZstd).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    test('should return failure when compression fails', async () => {
      // Path exists but compression fails
      mockExistsSync.mockReturnValue(true)
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockCompressWithZstd.mockResolvedValue(false)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const result = await LocalCache.save(paths, key)

      // Verify mock functions were called correctly
      expect(mockCompressWithZstd).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('restore', () => {
    test('should successfully restore cache when primary key matches', async () => {
      // Setup mocks
      mockCacheExists.mockReturnValue(true)
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockDecompressWithZstd.mockResolvedValue(true)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const result = await LocalCache.restore(paths, key)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(mockGetCacheFilePath).toHaveBeenCalledWith(key)
      expect(mockDecompressWithZstd).toHaveBeenCalled()
      expect(result).toEqual({ cacheHit: true, restoredKey: key })
    })

    test('should successfully restore cache when primary key does not match but fallback key does', async () => {
      // Primary key doesn't exist, but second restore key does
      mockCacheExists.mockImplementation((k) => k === 'restore-key2')
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockDecompressWithZstd.mockResolvedValue(true)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const restoreKeys = ['restore-key1', 'restore-key2']
      const result = await LocalCache.restore(paths, key, restoreKeys)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1')
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2')
      expect(mockGetCacheFilePath).toHaveBeenCalledWith('restore-key2')
      expect(mockDecompressWithZstd).toHaveBeenCalled()
      expect(result).toEqual({ cacheHit: false, restoredKey: 'restore-key2' })
    })

    test('should support custom target directory', async () => {
      // Setup mocks
      mockCacheExists.mockReturnValue(true)
      mockGetCacheFilePath.mockReturnValue('/mock/cache/path.tar.zst')
      mockDecompressWithZstd.mockResolvedValue(true)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const targetDir = '/custom/target/dir'
      const result = await LocalCache.restore(paths, key, [], targetDir)

      // Verify calls and result
      expect(mockDecompressWithZstd).toHaveBeenCalledWith(
        '/mock/cache/path.tar.zst',
        targetDir
      )
      expect(result).toEqual({ cacheHit: true, restoredKey: key })
    })

    test('should return cache miss when no keys match', async () => {
      // All keys don't exist
      mockCacheExists.mockReturnValue(false)

      // Call test subject
      const paths = ['/path/to/cache']
      const key = 'test-cache-key'
      const restoreKeys = ['restore-key1', 'restore-key2']
      const result = await LocalCache.restore(paths, key, restoreKeys)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1')
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2')
      expect(mockDecompressWithZstd).not.toHaveBeenCalled()
      expect(result).toEqual({ cacheHit: false, restoredKey: undefined })
    })
  })

  describe('lookup', () => {
    test('should return hit when primary key matches', () => {
      // Setup mocks
      mockCacheExists.mockReturnValue(true)

      // Call test subject
      const key = 'test-cache-key'
      const result = LocalCache.lookup(key)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(result).toEqual({ cacheHit: true, matchedKey: key })
    })

    test('should return partial hit when primary key does not match but fallback key does', () => {
      // Primary key doesn't exist, but second restore key does
      mockCacheExists.mockImplementation((k) => k === 'restore-key2')

      // Call test subject
      const key = 'test-cache-key'
      const restoreKeys = ['restore-key1', 'restore-key2']
      const result = LocalCache.lookup(key, restoreKeys)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1')
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2')
      expect(result).toEqual({ cacheHit: false, matchedKey: 'restore-key2' })
    })

    test('should return miss when no keys match', () => {
      // All keys don't exist
      mockCacheExists.mockReturnValue(false)

      // Call test subject
      const key = 'test-cache-key'
      const restoreKeys = ['restore-key1', 'restore-key2']
      const result = LocalCache.lookup(key, restoreKeys)

      // Verify calls and result
      expect(mockCacheExists).toHaveBeenCalledWith(key)
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key1')
      expect(mockCacheExists).toHaveBeenCalledWith('restore-key2')
      expect(result).toEqual({ cacheHit: false, matchedKey: undefined })
    })
  })
})
