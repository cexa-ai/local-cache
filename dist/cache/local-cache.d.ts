/**
 * 本地缓存类
 */
export declare class LocalCache {
    /**
     * 保存缓存
     * @param paths 要缓存的路径数组
     * @param key 缓存键
     * @param compressionLevel 压缩级别
     * @returns 成功返回 true，失败返回 false
     */
    static save(paths: string[], key: string, compressionLevel?: number): Promise<boolean>;
    /**
     * 恢复缓存
     * @param paths 要恢复的目标路径数组
     * @param primaryKey 主缓存键
     * @param restoreKeys 备用缓存键数组
     * @returns 恢复结果，包含是否命中和使用的键
     */
    static restore(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<{
        cacheHit: boolean;
        restoredKey: string | undefined;
    }>;
    /**
     * 查找缓存
     * @param primaryKey 主缓存键
     * @param restoreKeys 备用缓存键数组
     * @returns 查找结果，包含是否命中和找到的键
     */
    static lookup(primaryKey: string, restoreKeys?: string[]): {
        cacheHit: boolean;
        matchedKey: string | undefined;
    };
}
