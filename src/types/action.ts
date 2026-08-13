/**
 * 文件头：应用侧「动作类型」收口文件
 *
 * 对应原项目：lib/types/action.ts
 *
 * 原项目该文件的功能：把 @openmaic/dsl 的动作类型与运行时常量重新导出，
 * 让应用内代码统一从 '#/types/action' 引用（MONOREPO Phase 2 后为包私有映射）。
 * 本项目做同样的事：统一从 '#/types/action' 引用，避免散落各处直接 import dsl。
 */

export type {
  Action,
  ActionBase,
  ActionType,
  DiscussionAction,
  LaserAction,
  PercentageGeometry,
  PlayVideoAction,
  SpeechAction,
  SpotlightAction,
  WbClearAction,
  WbCloseAction,
  WbDeleteAction,
  WbDrawChartAction,
  WbDrawCodeAction,
  WbDrawLatexAction,
  WbDrawLineAction,
  WbDrawShapeAction,
  WbDrawTableAction,
  WbDrawTextAction,
  WbEditCodeAction,
  WbOpenAction,
  WidgetAnnotationAction,
  WidgetHighlightAction,
  WidgetRevealAction,
  WidgetSetStateAction,
} from '@openmaic/dsl';

// 运行时常量必须用值导出（bare `export type` 会在运行时擦除为 undefined）
export { ACTION_TYPES, FIRE_AND_FORGET_ACTIONS, SLIDE_ONLY_ACTIONS, SYNC_ACTIONS } from '@openmaic/dsl';
