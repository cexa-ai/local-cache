import * as core from '@actions/core'
import { LocalCache } from './cache/localCache.js'
import { resolvePaths } from './cache/utils.js'

/**
 * Save cache entry function
 */
async function run(): Promise<void> {
  try {
    // Get input parameters
    const path = core.getInput('path', { required: true })
    const key = core.getInput('key', { required: true })
    const compressionLevel = parseInt(
      core.getInput('compression-level') || '3',
      10
    )

    // Parse paths
    const paths = resolvePaths(path)

    core.debug(`Paths: ${paths.join(', ')}`)
    core.debug(`Key: ${key}`)
    core.debug(`Compression level: ${compressionLevel}`)

    // Save cache
    const success = await LocalCache.save(paths, key, compressionLevel)

    if (success) {
      core.info(`Cache saved successfully: ${key}`)
    } else {
      core.warning(`Cache save failed: ${key}`)
    }
  } catch (err) {
    core.setFailed(`Action failed: ${(err as Error).message}`)
  }
}

run()
