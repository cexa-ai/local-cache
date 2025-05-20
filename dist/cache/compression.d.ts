/**
 * Compress files and directories using tar + zstd
 * @param archivePath Path to save the compressed file
 * @param paths Array of file or directory paths to compress
 * @param compressionLevel zstd compression level
 * @returns true if successful, false otherwise
 */
export declare function compressWithZstd(archivePath: string, paths: string[], compressionLevel?: number): Promise<boolean>;
/**
 * Decompress file using tar + zstd
 * @param archivePath Path to the compressed file
 * @param targetDir Target directory for decompression
 * @returns true if successful, false otherwise
 */
export declare function decompressWithZstd(archivePath: string, targetDir?: string): Promise<boolean>;
