/**
 * 文件头：Vite / TypeScript 环境声明
 *
 * 原项目对应：Vite 工程通用文件（原项目 Next.js 无此文件，作用等价于其 tsconfig 的
 * DOM lib 与 JSX 配置，为 Vue 单文件组件提供类型声明）。
 *
 * 功能：
 *   1. 引入 Vite 客户端类型（import.meta.env 等）；
 *   2. 声明 *.vue 模块，让 TypeScript 能识别 Vue 单文件组件的默认导出。
 */
/// <reference types="vite/client" />

/**
 * Vue 单文件组件（.vue）模块声明。
 * 无此声明时，`import Xxx from './Xxx.vue'` 会报「找不到模块」。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}
