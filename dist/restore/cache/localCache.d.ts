/**
 * Local Cache class
 */
export declare class LocalCache {
    /**
     * Save cache
     * @param paths Array of paths to cache
     * @param key Cache key
     * @param compressionLevel Compression level
     * @returns true if successful, false otherwise
     */
    static save(paths: string[], key: string, compressionLevel?: number): Promise<boolean>;
    /**
     * Restore cache
     * @param paths Array of target paths to restore
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @returns Restore result, including hit status and used key
     */
    static restore(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<{
        cacheHit: boolean;
        restoredKey: string | undefined;
    }>;
    /**
     * Lookup cache
     * @param primaryKey Primary cache key
     * @param restoreKeys Array of fallback cache keys
     * @returns Lookup result, including hit status and found key
     */
    static lookup(primaryKey: string, restoreKeys?: string[]): {
        cacheHit: boolean;
        matchedKey: string | undefined;
    };
}
