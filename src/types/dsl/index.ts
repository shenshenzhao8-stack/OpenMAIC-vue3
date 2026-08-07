/**
 * 文件头：自建类型模块的统一出口
 *
 * 对应原项目：packages/@openmaic/dsl/src/index.ts（DSL 包入口）
 *
 * 功能：把 action / slides / stage 三个子模块的类型与运行时常量统一 re-export。
 * 这是 Vite alias 与 tsconfig paths 的目标文件：
 *   `@openmaic/dsl` → `src/types/dsl/index.ts`
 * 从原项目「照搬」的代码里 `import ... from '@openmaic/dsl'` 因此无需改动。
 */

// 动作类型与常量（对应原项目 action.ts）
export * from './action'
// 幻灯片数据模型（对应原项目 slides.ts）
export * from './slides'
// 课程骨架与守卫（对应原项目 stage.ts）
export * from './stage'
