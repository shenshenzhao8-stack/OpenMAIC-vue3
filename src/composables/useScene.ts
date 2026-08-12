/**
 * 文件头：场景上下文（provide/inject）
 *
 * 对应原项目：lib/contexts/scene-context.tsx（SceneProvider + useSceneSelector）
 *
 * 功能：把「当前场景数据」提供给场景渲染子树。原项目用 React Context +
 * useSyncExternalStore；Vue 对应 provide/inject + computed。
 *
 * 用法：
 *   - 上层（ClassroomPage）用 <SceneProvider> 包裹场景渲染区；
 *   - 场景组件（SceneRenderer / SlideView / QuizView ...）用 useScene() 取当前场景。
 */
import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'
import type { Scene } from '#/types/stage'

/** 场景上下文的值：当前场景（响应式；无场景时为 null） */
export interface SceneContext {
  scene: ComputedRef<Scene | null>
}

/** provide/inject 的 key（Symbol，避免跨组件树冲突） */
export const SceneKey: InjectionKey<SceneContext> = Symbol('scene-context')

/**
 * 注入当前场景上下文。
 * 若在 SceneProvider 之外调用，返回空场景（null），避免直接报错。
 */
export function useScene(): SceneContext {
  return inject(SceneKey, { scene: computed(() => null) })
}
