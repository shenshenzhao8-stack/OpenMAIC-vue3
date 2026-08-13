/**
 * 文件头：Vite 构建配置
 *
 * 对应原项目：next.config.ts（构建/打包配置）
 *
 * 为什么这样配置：
 *   1. `#` 别名 → src：包私有映射（package.json imports + tsconfig paths + vite alias
 *      三处同步，参照目标 monorepo 的 package-share）；MONOREPO Phase 2 已把全部
 *      `@/` 内部引用迁移为 `#/`；
 *   2. `@openmaic/dsl` 别名 → src/types/dsl/index.ts：本项目不使用 monorepo，
 *      也不引入 npm 包，而是把数据结构类型自建在 src/types/dsl/ 下。
 *      通过这个别名，从原项目「照搬」的引擎代码（如 lib/playback/engine.ts）
 *      里 `import ... from '@openmaic/dsl'` 可以一字不改地编译。
 *   3. server.host = '0.0.0.0'：开发服务器监听所有网卡，支持通过本机 IP / 局域网
 *      访问（如 http://192.168.x.x:5173），方便在手机/其他设备上调试。
 *      preview.host 同理：`npm run preview` 也支持 IP 访问。
 */
// URL 重命名导入：避免与 DOM 全局 URL 类型冲突（IDE/tsc 推断项目下的常见爆红点）
import { fileURLToPath, URL as NodeUrl } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  // Vue 单文件组件编译插件
  plugins: [vue()],
  resolve: {
    alias: [
      // #/xxx → src/xxx：必须用正则前缀匹配，且 replacement 需带尾部斜杠
      // （@rollup/plugin-alias 对正则执行 importee.replace(find, replacement)，
      //  匹配只吃掉 '#/'，不带尾斜杠会得到 srcpages/... 的错误路径）
      { find: /^#\//, replacement: `${fileURLToPath(new NodeUrl('./src', import.meta.url))}/` },
      {
        find: '@openmaic/dsl',
        replacement: fileURLToPath(new NodeUrl('./src/types/dsl/index.ts', import.meta.url)),
      },
    ],
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
});
