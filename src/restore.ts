import * as core from '@actions/core'
import { LocalCache } from './cache/localCache.js'
import { resolvePaths } from './cache/utils.js'

/**
 * Restore cache entry function
 */
async function run(): Promise<void> {
    try {
        // Get input parameters
        const path = core.getInput('path', { required: true })
        const key = core.getInput('key', { required: true })
        const restoreKeys = core.getInput('restore-keys')
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

        const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd()

        // Restore cache
        const { cacheHit, restoredKey } = await LocalCache.restore(
            paths,
            key,
            restoreKeysList,
            workspaceDir
        )
        core.setOutput('cache-hit', cacheHit.toString())
        core.setOutput('cache-primary-key', key)

        if (cacheHit) {
            core.info('Cache restored successfully')
        } else if (restoredKey) {
            core.info(`Cache restored with partial match key: ${restoredKey}`)
        } else {
            core.info('No matching cache found')

            // If fail option is set and no cache hit
            if (failOnCacheMiss) {
                core.setFailed('No matching cache found')
            }
        }
    } catch (err) {
        core.setFailed(`Action failed: ${(err as Error).message}`)
    }
}

run()
