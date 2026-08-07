/**
 * 文件头：Vitest 单元测试配置
 *
 * 原项目对应：vitest.config.ts（OpenMAIC 同样使用 vitest 跑纯 TS 单测）
 *
 * 为什么：Phase 0 的测试只验证「自建类型模块」的运行时守卫与常量，不涉及 DOM，
 * 因此使用 node 环境，保持测试轻量、可脱离浏览器运行。
 *
 * 与 vite.config.ts 保持同一套 alias：让测试里 `import '@openmaic/dsl'`
 * 也能解析到 src/types/dsl/index.ts，从而验证 alias 全链路可用。
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@openmaic/dsl': fileURLToPath(new URL('./src/types/dsl/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
