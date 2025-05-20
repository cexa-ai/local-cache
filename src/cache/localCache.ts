import * as core from '@actions/core'
import * as fs from 'fs'
import { compressWithZstd, decompressWithZstd } from './compression.js'
import { cacheExists, getCacheFilePath } from './utils.js'

/**
 * Local Cache class
 */
export class LocalCache {
    /**
     * Save cache
     * @param paths Array of paths to cache
     * @param key Cache key
     * @param compressionLevel Compression level
     * @returns true if successful, false otherwise
     */
    static async save(
        paths: string[],
        key: string,
        compressionLevel: number = 3
    ): Promise<boolean> {
        try {
            core.info(`Starting to save cache, key: ${key}`)
            core.debug(`Cache paths: ${paths.join(', ')}`)

            // Check if all paths exist
            const existingPaths = paths.filter((p) => fs.existsSync(p))
            if (existingPaths.length === 0) {
                core.warning('No paths found to cache, skipping cache save')
                return false
            }

            // Get cache file path
            const cachePath = getCacheFilePath(key)

            // Compress files
            const success = await compressWithZstd(
                cachePath,
                existingPaths,
                compressionLevel
            )

            if (success) {
                core.info(`Cache saved successfully: ${key}`)
                return true
            } else {
                core.warning(`Cache save failed: ${key}`)
                return false
            }
        } catch (err) {
            core.error(`Error saving cache: ${(err as Error).message}`)
            return false
        }
    }

    /**
     * Restore cache
     * @param paths Array of target paths to restore
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @param targetDir Target directory for decompression
     * @returns Restore result, including hit status and used key
     */
    static async restore(
        paths: string[],
        primaryKey: string,
        restoreKeys: string[] = [],
        targetDir: string = '/'
    ): Promise<{ cacheHit: boolean; restoredKey: string | undefined }> {
        try {
            core.info(`Starting to restore cache, primary key: ${primaryKey}`)
            if (restoreKeys.length > 0) {
                core.debug(`Restore keys: ${restoreKeys.join(', ')}`)
            }

            // First check primary key
            if (cacheExists(primaryKey)) {
                core.info(`Found exact match cache: ${primaryKey}`)
                const cachePath = getCacheFilePath(primaryKey)
                const success = await decompressWithZstd(cachePath, targetDir)

                if (success) {
                    core.info(`Cache restored successfully: ${primaryKey}`)
                    return { cacheHit: true, restoredKey: primaryKey }
                } else {
                    core.warning(`Cache restore failed: ${primaryKey}`)
                }
            }

            // If primary key doesn't exist or restore fails, try fallback keys
            for (const restoreKey of restoreKeys) {
                if (cacheExists(restoreKey)) {
                    core.info(`Found partial match cache: ${restoreKey}`)
                    const cachePath = getCacheFilePath(restoreKey)
                    const success = await decompressWithZstd(cachePath, targetDir)

                    if (success) {
                        core.info(`Cache restored successfully: ${restoreKey}`)
                        return { cacheHit: false, restoredKey: restoreKey }
                    } else {
                        core.warning(`Cache restore failed: ${restoreKey}`)
                    }
                }
            }

            core.info('No matching cache found')
            return { cacheHit: false, restoredKey: undefined }
        } catch (err) {
            core.error(`Error restoring cache: ${(err as Error).message}`)
            return { cacheHit: false, restoredKey: undefined }
        }
    }

    /**
     * Lookup cache
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @returns Lookup result, including hit status and found key
     */
    static lookup(
        primaryKey: string,
        restoreKeys: string[] = []
    ): { cacheHit: boolean; matchedKey: string | undefined } {
        try {
            core.info(`Looking up cache, primary key: ${primaryKey}`)

            // First check primary key
            if (cacheExists(primaryKey)) {
                core.info(`Found exact match cache: ${primaryKey}`)
                return { cacheHit: true, matchedKey: primaryKey }
            }

            // If primary key doesn't exist, try fallback keys
            for (const restoreKey of restoreKeys) {
                if (cacheExists(restoreKey)) {
                    core.info(`Found partial match cache: ${restoreKey}`)
                    return { cacheHit: false, matchedKey: restoreKey }
                }
            }

            core.info('No matching cache found')
            return { cacheHit: false, matchedKey: undefined }
        } catch (err) {
            core.error(`Error looking up cache: ${(err as Error).message}`)
            return { cacheHit: false, matchedKey: undefined }
        }
    }
}
