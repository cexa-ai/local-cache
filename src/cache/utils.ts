import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'

/**
 * Get cache directory path
 * @returns Absolute path of the cache directory
 */
export function getCacheDir(): string {
  // Default to using .cache directory under runner work directory
  const cacheDir =
    process.env.RUNNER_TOOL_CACHE ||
    path.join(process.env.HOME || '/tmp', '.local-cache')

  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  return cacheDir
}

/**
 * Generate cache file path
 * @param key Cache key
 * @returns Absolute path of the cache file
 */
export function getCacheFilePath(key: string): string {
  // Use MD5 hash function to process key name to ensure filename safety
  const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(getCacheDir(), `${safeKey}.tar.zst`)
}

/**
 * Check if cache exists
 * @param key Cache key
 * @returns true if cache exists, false otherwise
 */
export function cacheExists(key: string): boolean {
  const cachePath = getCacheFilePath(key)
  return fs.existsSync(cachePath)
}

/**
 * Parse path parameters
 * @param pathInput Path input string
 * @returns Array of paths
 */
export function resolvePaths(pathInput: string): string[] {
  // Split input paths and remove empty lines
  return pathInput
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/**
 * Log debug information
 * @param message Debug message
 */
export function debug(message: string): void {
  core.debug(message)
}

/**
 * Log information
 * @param message Info message
 */
export function info(message: string): void {
  core.info(message)
}

/**
 * Log warning
 * @param message Warning message
 */
export function warning(message: string): void {
  core.warning(message)
}

/**
 * Log error
 * @param message Error message
 * @param error Error object
 */
export function error(message: string, error?: Error): void {
  if (error) {
    core.error(`${message}: ${error.message}`)
  } else {
    core.error(message)
  }
}
