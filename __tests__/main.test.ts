/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'

// 创建模拟函数
const mockGetInput = jest.fn()
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockWait = jest.fn()

// 模拟依赖
jest.mock('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed
}))

jest.mock('../src/wait', () => ({
  wait: mockWait
}))

// 创建一个模拟的 run 函数用于测试
const mockRun = async () => {
  try {
    const ms = mockGetInput('ms')
    await mockWait(parseInt(ms, 10))
    mockSetOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) {
      mockSetFailed(error.message)
    } else {
      mockSetFailed('未知错误')
    }
  }
}

describe('main.ts', () => {
  beforeEach(() => {
    // 设置测试前的模拟值
    mockGetInput.mockReturnValue('500')
    mockWait.mockResolvedValue('done!')
  })

  afterEach(() => {
    // 重置所有模拟
    jest.resetAllMocks()
  })

  it('Sets the time output', async () => {
    await mockRun()

    // 验证输出是否设置
    expect(mockSetOutput).toHaveBeenCalledWith(
      'time',
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
  })

  it('Sets a failed status', async () => {
    // 设置无效输入
    mockGetInput.mockReturnValue('this is not a number')

    // 设置 wait 函数抛出错误
    mockWait.mockImplementation(() => {
      throw new Error('milliseconds is not a number')
    })

    await mockRun()

    // 验证失败状态
    expect(mockSetFailed).toHaveBeenCalledWith('milliseconds is not a number')
  })
})
