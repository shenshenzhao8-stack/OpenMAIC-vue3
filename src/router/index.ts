/**
 * 文件头：路由配置
 *
 * 对应原项目 Next.js App Router 的页面路由（裁剪后）：
 *   app/page.tsx                → '/'              首页（课堂入口）
 *   app/classroom/[id]/page.tsx → '/classroom/:id' 课堂播放页（主业务）
 *
 * 范围变更：项目不需要「生成页 / 生成预览页」
 * （原 app/generation-preview/page.tsx 已不在范围内），故移除 /generate 路由。
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ClassroomPage from '@/pages/ClassroomPage.vue'

const router = createRouter({
  // createWebHistory：HTML5 History 模式（干净 URL，无 # 号）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/classroom/:id', name: 'classroom', component: ClassroomPage, props: true },
  ],
})

export default router
