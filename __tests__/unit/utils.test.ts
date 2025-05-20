import { describe, expect, test } from '@jest/globals'
import { resolvePaths } from '../../src/cache/utils'

describe('utils 工具函数测试', () => {
  describe('resolvePaths', () => {
    test('应该正确解析单行路径', () => {
      const paths = resolvePaths('/path/to/file')
      expect(paths).toEqual(['/path/to/file'])
    })

    test('应该正确解析多行路径', () => {
      const paths = resolvePaths(`/path/to/file1
/path/to/file2
/path/to/file3`)
      expect(paths).toEqual([
        '/path/to/file1',
        '/path/to/file2',
        '/path/to/file3'
      ])
    })

    test('应该移除空行', () => {
      const paths = resolvePaths(`/path/to/file1

/path/to/file2
`)
      expect(paths).toEqual(['/path/to/file1', '/path/to/file2'])
    })

    test('应该移除空白行', () => {
      const paths = resolvePaths(`/path/to/file1
  
/path/to/file2`)
      expect(paths).toEqual(['/path/to/file1', '/path/to/file2'])
    })
  })
})
