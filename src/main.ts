import * as core from '@actions/core'
import { LocalCache } from './cache/localCache.js'
import { resolvePaths } from './cache/utils.js'

/**
 * Main function
 */
async function run(): Promise<void> {
  try {
    // Get input parameters
    const path = core.getInput('path', { required: true })
    const key = core.getInput('key', { required: true })
    const restoreKeys = core.getInput('restore-keys')
    const compressionLevel = parseInt(
      core.getInput('compression-level') || '3',
      10
    )
    const failOnCacheMiss = core.getBooleanInput('fail-on-cache-miss')
    const lookupOnly = core.getBooleanInput('lookup-only')

    // Parse paths and restore keys
    const paths = resolvePaths(path)
    const restoreKeysList = restoreKeys
      ? restoreKeys
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s !== '')
      : []

    core.debug(`Paths: ${paths.join(', ')}`)
    core.debug(`Key: ${key}`)
    core.debug(`Restore keys: ${restoreKeysList.join(', ')}`)
    core.debug(`Compression level: ${compressionLevel}`)

    // If just looking up cache
    if (lookupOnly) {
      const { cacheHit } = LocalCache.lookup(key, restoreKeysList)
      core.setOutput('cache-hit', cacheHit.toString())
      core.setOutput('cache-primary-key', key)

      if (failOnCacheMiss && !cacheHit) {
        core.setFailed('No matching cache found')
      }
      return
    }

    // Restore cache
    const { cacheHit, restoredKey } = await LocalCache.restore(
      paths,
      key,
      restoreKeysList
    )
    core.setOutput('cache-hit', cacheHit.toString())
    core.setOutput('cache-primary-key', key)

    if (cacheHit) {
      core.info('Cache restored successfully')
    } else if (restoredKey) {
      core.info(`Cache restored with partial match key: ${restoredKey}`)
    } else {
      core.info(
        'No matching cache found, will create new cache after workflow completes'
      )

      // If fail option is set and no cache hit
      if (failOnCacheMiss) {
        core.setFailed('No matching cache found')
        return
      }

      // Register post action to save cache when workflow completes
      core.info(
        'Registering post action to save cache after workflow completes'
      )

      // Use GitHub Actions post action mechanism
      core.saveState('CACHE_KEY', key)
      core.saveState('CACHE_PATH', path)
      core.saveState('CACHE_COMPRESSION_LEVEL', compressionLevel.toString())
    }
  } catch (err) {
    core.setFailed(`Action failed: ${(err as Error).message}`)
  }
}

run()

// Export post function to execute when workflow completes
export async function post(): Promise<void> {
  try {
    const key = core.getState('CACHE_KEY')
    const pathInput = core.getState('CACHE_PATH')
    const compressionLevelStr = core.getState('CACHE_COMPRESSION_LEVEL')

    if (!key || !pathInput) {
      return
    }

    const compressionLevel = parseInt(compressionLevelStr || '3', 10)
    const paths = resolvePaths(pathInput)

    core.info('Executing post action, saving cache')
    await LocalCache.save(paths, key, compressionLevel)
  } catch (err) {
    core.warning(`Post action failed: ${(err as Error).message}`)
  }
}
