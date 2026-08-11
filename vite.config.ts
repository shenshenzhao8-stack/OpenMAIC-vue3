/**
 * 文件头：Vite 构建配置
 *
 * 对应原项目：next.config.ts（构建/打包配置）
 *
 * 为什么这样配置：
 *   1. `@` 别名 → src：与原项目代码里 `import '@/lib/...'` 的路径风格保持一致，
 *      后续照搬纯 TS 文件时，路径改动最少；
 *   2. `@openmaic/dsl` 别名 → src/types/dsl/index.ts：本项目不使用 monorepo，
 *      也不引入 npm 包，而是把数据结构类型自建在 src/types/dsl/ 下。
 *      通过这个别名，从原项目「照搬」的引擎代码（如 lib/playback/engine.ts）
 *      里 `import ... from '@openmaic/dsl'` 可以一字不改地编译。
 *   3. server.host = '0.0.0.0'：开发服务器监听所有网卡，支持通过本机 IP / 局域网
 *      访问（如 http://192.168.x.x:5173），方便在手机/其他设备上调试。
 *      preview.host 同理：`npm run preview` 也支持 IP 访问。
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Vue 单文件组件编译插件
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@openmaic/dsl': fileURLToPath(new URL('./src/types/dsl/index.ts', import.meta.url)),
    },
  },
  server: {
    // 监听所有地址（0.0.0.0），支持通过 IP 访问
    host: '0.0.0.0',
    // 固定端口，避免冲突时自动换端口导致访问地址漂移
    port: 5173,
  },
  preview: {
    // 生产预览同样支持 IP 访问
    host: '0.0.0.0',
    port: 4173,
  },
})
