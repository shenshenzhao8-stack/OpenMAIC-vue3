/**
 * 文件头：workspace 包公开入口
 *
 * 对应改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 2（分离独立应用入口与包入口）
 *
 * 功能：
 *   - 只导出 OpenMaicClassroom 组件与必要公共类型；
 *   - 严禁导入 src/main.ts、独立 Router、App.vue 或独立全局样式——
 *     保证「导入包入口不会创建应用、安装 Router 或挂载 #app」；
 *   - 首期由目标 Web 的 Vite 直接编译 workspace 源码（不建设 ESM/CJS 双产物）。
 */
export { default as OpenMaicClassroom } from './components/classroom/index.vue';
export type { ClassroomData, OpenMaicClassroomProps } from './types/public';
