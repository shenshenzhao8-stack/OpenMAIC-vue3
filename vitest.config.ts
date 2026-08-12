/**
 * 文件头：Vitest 单元测试配置
 *
 * 原项目对应：vitest.config.ts（OpenMAIC 同样使用 vitest 跑纯 TS 单测）
 *
 * 为什么：开发过程中用测试验证引擎/纯函数行为（不涉及 DOM，使用 node 环境）；
 * 按仓库约定（package-openmaic/AGENTS.md 规则七），测试文件不随正式代码落库——
 * 开发时在 src 下临时放置 *.test.ts 运行本配置，验证后删除。
 *
 * 与 vite.config.ts 保持同一套 alias：让测试里 `import '@openmaic/dsl'`
 * 也能解析到 src/types/dsl/index.ts，从而验证 alias 全链路可用。
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: {
    alias: [
      // 与 vite.config 一致：正则替换需带尾部斜杠
      { find: /^#\//, replacement: `${fileURLToPath(new URL('./src', import.meta.url))}/` },
      {
        find: '@openmaic/dsl',
        replacement: fileURLToPath(new URL('./src/types/dsl/index.ts', import.meta.url)),
      },
    ],
  },
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
