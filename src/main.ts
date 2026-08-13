/**
 * 文件头：应用入口
 *
 * 对应原项目：app/layout.tsx（根布局启动）与 app/page.tsx（首页）共同承担的启动职责。
 *
 * 功能：
 *   1. 创建 Vue 应用实例；
 *   2. 挂载 Pinia（对应原项目 Zustand 状态管理体系的等价物）；
 *   3. 挂载 Vue Router（对应原项目 Next.js App Router）；
 *   4. 挂载到 index.html 的 #app 节点。
 */
// 独立 SPA 专用根样式（含 html/body/#app 规则）；组件入口不得引入
import './standalone.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

// 创建 Vue 应用实例
const app = createApp(App);

// 挂载 Pinia：本项目所有状态仓库（stage / canvas / settings / chat 等）都在 Pinia 之上实现，
// 对应原项目 lib/store/*.ts 的 Zustand store。
app.use(createPinia());

// 挂载 Vue Router：路由表定义见 src/router/index.ts
app.use(router);

// 挂载到 index.html 中 id="app" 的根节点
app.mount('#app');
