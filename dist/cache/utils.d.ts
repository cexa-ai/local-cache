/**
 * Get cache directory path
 * @returns Absolute path of the cache directory
 */
export declare function getCacheDir(): string;
/**
 * Generate cache file path
 * @param key Cache key
 * @returns Absolute path of the cache file
 */
export declare function getCacheFilePath(key: string): string;
/**
 * Check if cache exists
 * @param key Cache key
 * @returns true if cache exists, false otherwise
 */
export declare function cacheExists(key: string): boolean;
/**
 * Parse path parameters
 * @param pathInput Path input string
 * @returns Array of paths
 */
export declare function resolvePaths(pathInput: string): string[];
/**
 * Log debug information
 * @param message Debug message
 */
export declare function debug(message: string): void;
/**
 * Log information
 * @param message Info message
 */
export declare function info(message: string): void;
/**
 * Log warning
 * @param message Warning message
 */
export declare function warning(message: string): void;
/**
 * Log error
 * @param message Error message
 * @param error Error object
 */
export declare function error(message: string, error?: Error): void;
