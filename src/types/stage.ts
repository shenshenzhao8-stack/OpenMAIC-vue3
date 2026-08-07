/**
 * 文件头：应用侧「场景 / 舞台」类型收口文件
 *
 * 对应原项目：lib/types/stage.ts
 *
 * 原项目该文件的功能（本文件完整保留其职责）：
 *   1. re-export DSL 契约层的通用类型（Stage / SceneType / SlideContent / QuizContent ...）；
 *   2. 定义应用侧独有的内容类型：InteractiveContent（交互网页）、PBLContent（已裁剪）；
 *   3. 用 `Scene<Action, AppSceneContent>` 组装出应用侧完整的 Scene 类型；
 *   4. 值导出 isSlideContent / isQuizContent 守卫。
 *
 * 与原文的差异（裁剪）：删除 PBLContent 及其分支（需求 1 只保留三种场景）。
 */
import type {
  Scene as DslScene,
  SceneContent as DslSceneContent,
} from '@openmaic/dsl'
import type { Action } from './action'

// —— 从 DSL 契约层直接 re-export 的通用类型 ——
export type {
  SceneType,
  Stage,
  SlideContent,
  QuizOption,
  QuizQuestion,
  QuizContent,
  StageMode,
  Slide,
  Whiteboard,
  VideoManifest,
  GeneratedAgentConfig,
} from '@openmaic/dsl'

// 守卫是运行期函数，必须值导出
export { isSlideContent, isQuizContent } from '@openmaic/dsl'

/**
 * 交互页面子类型（对应原项目 lib/types/widgets.ts 的 WidgetType）
 * 仅 interactive 场景使用，Phase 6 实现交互渲染时会细化 widgetConfig 结构。
 */
export type WidgetType =
  | 'simulation'
  | 'diagram'
  | 'code'
  | 'game'
  | 'visualization3d'
  | 'procedural-skill'

/**
 * 交互场景内容：一段 HTML（或外部 URL）+ 可选 widget 配置。
 * 对应原项目 lib/types/stage.ts 的 InteractiveContent。
 */
export interface InteractiveContent {
  type: 'interactive'
  url: string
  html?: string
  widgetType?: WidgetType
  widgetConfig?: Record<string, unknown>
}

/** 应用侧完整的内容联合：DSL 契约层（slide/quiz）+ 应用侧（interactive） */
export type AppSceneContent = DslSceneContent | InteractiveContent

/** 应用侧 SceneContent 别名 */
export type SceneContent = AppSceneContent

/**
 * 应用侧完整 Scene：契约层骨架 + 应用侧内容联合 + outlineId 注解。
 * outlineId 记录生成大纲的稳定 id（原项目 app 层注解，供编辑器/生成器按 id 关联）。
 */
export type AppScene = DslScene<Action, AppSceneContent> & {
  outlineId?: string
}

/** 应用侧 Scene 别名（照搬代码统一使用） */
export type Scene = AppScene
