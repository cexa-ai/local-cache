// See: https://rollupjs.org/introduction/

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

// 定义打包配置项
const config = [
  // 主入口文件
  {
    input: 'src/main.ts',
    output: {
      file: 'dist/main.js',
      format: 'es',
      sourcemap: true
    },
    external: ['@actions/core', '@actions/io', '@actions/exec', '@actions/cache'],
    plugins: [
      resolve({
        extensions: ['.ts', '.js']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ],
  },
  // 恢复操作入口文件
  {
    input: 'src/restore.ts',
    output: {
      file: 'dist/restore.js',
      format: 'es',
      sourcemap: true
    },
    external: ['@actions/core', '@actions/io', '@actions/exec', '@actions/cache'],
    plugins: [
      resolve({
        extensions: ['.ts', '.js']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ],
  },
  // 保存操作入口文件
  {
    input: 'src/save.ts',
    output: {
      file: 'dist/save.js',
      format: 'es',
      sourcemap: true
    },
    external: ['@actions/core', '@actions/io', '@actions/exec', '@actions/cache'],
    plugins: [
      resolve({
        extensions: ['.ts', '.js']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ],
  }
]

export default defineConfig(config)
