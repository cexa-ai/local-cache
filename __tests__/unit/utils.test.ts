import { describe, expect, test } from '@jest/globals'
import { resolvePaths } from '../../src/cache/utils'

describe('Utils function tests', () => {
  describe('resolvePaths', () => {
    test('should correctly parse single line path', () => {
      const paths = resolvePaths('/path/to/file')
      expect(paths).toEqual(['/path/to/file'])
    })

    test('should correctly parse multi-line paths', () => {
      const paths = resolvePaths(`/path/to/file1
/path/to/file2
/path/to/file3`)
      expect(paths).toEqual([
        '/path/to/file1',
        '/path/to/file2',
        '/path/to/file3'
      ])
    })

    test('should remove empty lines', () => {
      const paths = resolvePaths(`/path/to/file1

/path/to/file2
`)
      expect(paths).toEqual(['/path/to/file1', '/path/to/file2'])
    })

    test('should remove whitespace-only lines', () => {
      const paths = resolvePaths(`/path/to/file1
  
/path/to/file2`)
      expect(paths).toEqual(['/path/to/file1', '/path/to/file2'])
    })
  })
})
