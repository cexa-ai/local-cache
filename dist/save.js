import * as core from '@actions/core';
import * as fs from 'fs';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';

/**
 * Get cache directory path
 * @returns Absolute path of the cache directory
 */
function getCacheDir() {
    // Default to using .cache directory under runner work directory
    const cacheDir = process.env.RUNNER_TOOL_CACHE || path.join(process.env.HOME || '/tmp', '.local-cache');
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}
/**
 * Generate cache file path
 * @param key Cache key
 * @returns Absolute path of the cache file
 */
function getCacheFilePath(key) {
    // Use MD5 hash function to process key name to ensure filename safety
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(getCacheDir(), `${safeKey}.tar.zst`);
}
/**
 * Check if cache exists
 * @param key Cache key
 * @returns true if cache exists, false otherwise
 */
function cacheExists(key) {
    const cachePath = getCacheFilePath(key);
    return fs.existsSync(cachePath);
}
/**
 * Parse path parameters
 * @param pathInput Path input string
 * @returns Array of paths
 */
function resolvePaths(pathInput) {
    // Split input paths and remove empty lines
    return pathInput
        .split('\n')
        .map(s => s.trim())
        .filter(s => s !== '');
}
/**
 * Log debug information
 * @param message Debug message
 */
function debug(message) {
    core.debug(message);
}
/**
 * Log information
 * @param message Info message
 */
function info(message) {
    core.info(message);
}
/**
 * Log error
 * @param message Error message
 * @param error Error object
 */
function error(message, error) {
    if (error) {
        core.error(`${message}: ${error.message}`);
    }
    else {
        core.error(message);
    }
}

/**
 * Compress files and directories using tar + zstd
 * @param archivePath Path to save the compressed file
 * @param paths Array of file or directory paths to compress
 * @param compressionLevel zstd compression level
 * @returns true if successful, false otherwise
 */
async function compressWithZstd(archivePath, paths, compressionLevel = 3) {
    try {
        // Ensure tar and zstd commands are available
        await io.which('tar', true);
        let zstdPath = '';
        try {
            zstdPath = await io.which('zstd', true);
        }
        catch (err) {
            error('zstd compression tool not available, please install zstd');
            throw err;
        }
        // Create target directory (if it doesn't exist)
        const archiveDir = path.dirname(archivePath);
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }
        // Create file list for each path or use pattern
        const fileArgs = [];
        for (const p of paths) {
            fileArgs.push(p);
        }
        // Build tar command
        const tarArgs = [
            '--use-compress-program',
            `${zstdPath} -${compressionLevel}`,
            '-cf',
            archivePath,
            '-P', // Use absolute paths
            ...fileArgs
        ];
        debug(`Starting to compress ${paths.join(', ')} to ${archivePath} using zstd`);
        // Execute tar command
        const exitCode = await exec.exec('tar', tarArgs);
        if (exitCode !== 0) {
            error(`Compression with zstd failed, exit code: ${exitCode}`);
            return false;
        }
        info(`Successfully compressed: ${paths.join(', ')} -> ${archivePath}`);
        return true;
    }
    catch (err) {
        error('Error during compression', err);
        return false;
    }
}
/**
 * Decompress file using tar + zstd
 * @param archivePath Path to the compressed file
 * @param targetDir Target directory for decompression
 * @returns true if successful, false otherwise
 */
async function decompressWithZstd(archivePath, targetDir = '/') {
    try {
        // Ensure tar and zstd commands are available
        await io.which('tar', true);
        let zstdPath = '';
        try {
            zstdPath = await io.which('zstd', true);
        }
        catch (err) {
            error('zstd decompression tool not available, please install zstd');
            throw err;
        }
        // Confirm compressed file exists
        if (!fs.existsSync(archivePath)) {
            error(`Compressed file does not exist: ${archivePath}`);
            return false;
        }
        // Build tar command
        const tarArgs = [
            '--use-compress-program',
            zstdPath,
            '-xf',
            archivePath,
            '-C',
            targetDir
        ];
        debug(`Starting to decompress ${archivePath} to ${targetDir}`);
        // Execute tar command
        const exitCode = await exec.exec('tar', tarArgs);
        if (exitCode !== 0) {
            error(`Decompression failed, exit code: ${exitCode}`);
            return false;
        }
        info(`Successfully decompressed: ${archivePath} -> ${targetDir}`);
        return true;
    }
    catch (err) {
        error('Error during decompression', err);
        return false;
    }
}

/**
 * Local Cache class
 */
class LocalCache {
    /**
     * Save cache
     * @param paths Array of paths to cache
     * @param key Cache key
     * @param compressionLevel Compression level
     * @returns true if successful, false otherwise
     */
    static async save(paths, key, compressionLevel = 3) {
        try {
            core.info(`Starting to save cache, key: ${key}`);
            core.debug(`Cache paths: ${paths.join(', ')}`);
            // Check if all paths exist
            const existingPaths = paths.filter(p => fs.existsSync(p));
            if (existingPaths.length === 0) {
                core.warning('No paths found to cache, skipping cache save');
                return false;
            }
            // Get cache file path
            const cachePath = getCacheFilePath(key);
            // Compress files
            const success = await compressWithZstd(cachePath, existingPaths, compressionLevel);
            if (success) {
                core.info(`Cache saved successfully: ${key}`);
                return true;
            }
            else {
                core.warning(`Cache save failed: ${key}`);
                return false;
            }
        }
        catch (err) {
            core.error(`Error saving cache: ${err.message}`);
            return false;
        }
    }
    /**
     * Restore cache
     * @param paths Array of target paths to restore
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @returns Restore result, including hit status and used key
     */
    static async restore(paths, primaryKey, restoreKeys = []) {
        try {
            core.info(`Starting to restore cache, primary key: ${primaryKey}`);
            if (restoreKeys.length > 0) {
                core.debug(`Restore keys: ${restoreKeys.join(', ')}`);
            }
            // First check primary key
            if (cacheExists(primaryKey)) {
                core.info(`Found exact match cache: ${primaryKey}`);
                const cachePath = getCacheFilePath(primaryKey);
                const success = await decompressWithZstd(cachePath, '/');
                if (success) {
                    core.info(`Cache restored successfully: ${primaryKey}`);
                    return { cacheHit: true, restoredKey: primaryKey };
                }
                else {
                    core.warning(`Cache restore failed: ${primaryKey}`);
                }
            }
            // If primary key doesn't exist or restore fails, try fallback keys
            for (const restoreKey of restoreKeys) {
                if (cacheExists(restoreKey)) {
                    core.info(`Found partial match cache: ${restoreKey}`);
                    const cachePath = getCacheFilePath(restoreKey);
                    const success = await decompressWithZstd(cachePath, '/');
                    if (success) {
                        core.info(`Cache restored successfully: ${restoreKey}`);
                        return { cacheHit: false, restoredKey: restoreKey };
                    }
                    else {
                        core.warning(`Cache restore failed: ${restoreKey}`);
                    }
                }
            }
            core.info('No matching cache found');
            return { cacheHit: false, restoredKey: undefined };
        }
        catch (err) {
            core.error(`Error restoring cache: ${err.message}`);
            return { cacheHit: false, restoredKey: undefined };
        }
    }
    /**
     * Lookup cache
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @returns Lookup result, including hit status and found key
     */
    static lookup(primaryKey, restoreKeys = []) {
        try {
            core.info(`Looking up cache, primary key: ${primaryKey}`);
            // First check primary key
            if (cacheExists(primaryKey)) {
                core.info(`Found exact match cache: ${primaryKey}`);
                return { cacheHit: true, matchedKey: primaryKey };
            }
            // If primary key doesn't exist, try fallback keys
            for (const restoreKey of restoreKeys) {
                if (cacheExists(restoreKey)) {
                    core.info(`Found partial match cache: ${restoreKey}`);
                    return { cacheHit: false, matchedKey: restoreKey };
                }
            }
            core.info('No matching cache found');
            return { cacheHit: false, matchedKey: undefined };
        }
        catch (err) {
            core.error(`Error looking up cache: ${err.message}`);
            return { cacheHit: false, matchedKey: undefined };
        }
    }
}

/**
 * Save cache entry function
 */
async function run() {
    try {
        // Get input parameters
        const path = core.getInput('path', { required: true });
        const key = core.getInput('key', { required: true });
        const compressionLevel = parseInt(core.getInput('compression-level') || '3', 10);
        // Parse paths
        const paths = resolvePaths(path);
        core.debug(`Paths: ${paths.join(', ')}`);
        core.debug(`Key: ${key}`);
        core.debug(`Compression level: ${compressionLevel}`);
        // Save cache
        const success = await LocalCache.save(paths, key, compressionLevel);
        if (success) {
            core.info(`Cache saved successfully: ${key}`);
        }
        else {
            core.warning(`Cache save failed: ${key}`);
        }
    }
    catch (err) {
        core.setFailed(`Action failed: ${err.message}`);
    }
}
run();
//# sourceMappingURL=save.js.map
