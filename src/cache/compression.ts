import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as path from 'path'
import * as fs from 'fs'
import { debug, info, error } from './utils.js'

/**
 * Compress files and directories using tar + zstd
 * @param archivePath Path to save the compressed file
 * @param paths Array of file or directory paths to compress
 * @param compressionLevel zstd compression level
 * @returns true if successful, false otherwise
 */
export async function compressWithZstd(
  archivePath: string,
  paths: string[],
  compressionLevel: number = 3
): Promise<boolean> {
  try {
    // Ensure tar and zstd commands are available
    await io.which('tar', true)
    let zstdPath = ''

    try {
      zstdPath = await io.which('zstd', true)
    } catch (err) {
      error('zstd compression tool not available, please install zstd')
      throw err
    }

    // Create target directory (if it doesn't exist)
    const archiveDir = path.dirname(archivePath)
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true })
    }

    // Create file list for each path or use pattern
    const fileArgs: string[] = []
    for (const p of paths) {
      fileArgs.push(p)
    }

    // Build tar command
    const tarArgs = [
      '--use-compress-program',
      `${zstdPath} -${compressionLevel}`,
      '-cf',
      archivePath,
      '-P', // Use absolute paths
      ...fileArgs
    ]

    debug(
      `Starting to compress ${paths.join(', ')} to ${archivePath} using zstd`
    )

    // Execute tar command
    const exitCode = await exec.exec('tar', tarArgs)

    if (exitCode !== 0) {
      error(`Compression with zstd failed, exit code: ${exitCode}`)
      return false
    }

    info(`Successfully compressed: ${paths.join(', ')} -> ${archivePath}`)
    return true
  } catch (err) {
    error('Error during compression', err as Error)
    return false
  }
}

/**
 * Decompress file using tar + zstd
 * @param archivePath Path to the compressed file
 * @param targetDir Target directory for decompression
 * @returns true if successful, false otherwise
 */
export async function decompressWithZstd(
  archivePath: string,
  targetDir: string = '/'
): Promise<boolean> {
  try {
    // Ensure tar and zstd commands are available
    await io.which('tar', true)
    let zstdPath = ''

    try {
      zstdPath = await io.which('zstd', true)
    } catch (err) {
      error('zstd decompression tool not available, please install zstd')
      throw err
    }

    // Confirm compressed file exists
    if (!fs.existsSync(archivePath)) {
      error(`Compressed file does not exist: ${archivePath}`)
      return false
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      debug(`Creating target directory: ${targetDir}`)
      try {
        fs.mkdirSync(targetDir, { recursive: true })
      } catch (err) {
        error(`Failed to create target directory: ${targetDir}`, err as Error)
        // 如果无法创建目录，尝试使用当前目录
        targetDir = process.cwd()
        info(`Falling back to current directory: ${targetDir}`)
      }
    }

    // 检查目标目录的写入权限
    try {
      fs.accessSync(targetDir, fs.constants.W_OK)
      debug(`Write permission confirmed for directory: ${targetDir}`)
    } catch (err) {
      error(`No write permission for directory: ${targetDir}`, err as Error)
      // 如果没有写入权限，尝试使用临时目录
      const tempDir = process.env.RUNNER_TEMP || '/tmp'
      targetDir = tempDir
      info(`Falling back to temp directory: ${targetDir}`)
    }

    // Build tar command
    const tarArgs = [
      '--use-compress-program',
      zstdPath,
      '-xf',
      archivePath,
      '-C',
      targetDir
    ]

    debug(`Starting to decompress ${archivePath} to ${targetDir}`)

    // Execute tar command
    const exitCode = await exec.exec('tar', tarArgs)

    if (exitCode !== 0) {
      error(`Decompression failed, exit code: ${exitCode}`)
      return false
    }

    info(`Successfully decompressed: ${archivePath} -> ${targetDir}`)
    return true
  } catch (err) {
    error('Error during decompression', err as Error)
    return false
  }
}
