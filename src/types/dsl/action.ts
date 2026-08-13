/**
 * 文件头：自建裁剪版「Action 动作类型」模块
 *
 * 对应原项目文件：packages/@openmaic/dsl/src/action.ts
 *
 * 为什么自建而不是引入 @openmaic/dsl 包：
 *   1. 本项目不使用 monorepo，也不希望 vendor 整个 DSL 源码包；
 *   2. 按裁剪范围，实际只会产出 speech（讲解）+ spotlight（聚光）两种动作；
 *   3. 但播放引擎（lib/playback/engine.ts，后续 Phase 1 照搬）的 switch 分支
 *      引用了 laser / discussion / play_video / wb_* / widget_* 等动作类型，
 *      为了让照搬代码「一行不改」即可编译，这里把动作类型**全量保留**
 *      （类型是纯编译期信息，不产生运行时开销）；
 *   4. 运行时常量只保留引擎实际引用的（FIRE_AND_FORGET_ACTIONS 等）。
 *
 * 维护约定：若原项目 action.ts 的类型发生变更，本文件需同步核对。
 */

/**
 * 资源引用类型：音频 / 图片 / 视频资源的稳定标识。
 * 对应原项目：packages/@openmaic/dsl/src/storage.ts 中的 `AssetRef = string`。
 */
export type AssetRef = string;

/** 所有动作的公共基类（对应原项目 ActionBase） */
export interface ActionBase {
  /** 动作唯一标识 */
  id: string;
  /** 动作标题（可选，用于展示） */
  title?: string;
  /** 动作描述（可选） */
  description?: string;
}

/**
 * 聚光动作：聚焦幻灯片上的某个元素，其余区域变暗。
 * ★ 需求保留的教学动作之一（spotlight），播放引擎将其作为「火速动作」立即执行、不阻塞。
 */
export interface SpotlightAction extends ActionBase {
  type: 'spotlight';
  /** 目标元素 id（与渲染层 DOM id 约定 `screen-element-{id}` 对应） */
  elementId: string;
  /** 其余区域的变暗程度，默认 0.5 */
  dimOpacity?: number;
}

/**
 * 激光笔动作（裁剪范围不使用，但播放引擎 switch 引用了该类型，故保留类型定义）
 */
export interface LaserAction extends ActionBase {
  type: 'laser';
  elementId: string;
  /** 激光颜色，默认 '#ff0000' */
  color?: string;
}

/**
 * 语音讲解动作：老师的一句话。
 * ★ 需求保留（speech），播放引擎会**等待音频播完**（或阅读计时结束）再执行下一条，
 * 这是「语音文字同步」的核心。
 */
export interface SpeechAction extends ActionBase {
  type: 'speech';
  /** 台词文本（同时是字幕显示的文本） */
  text: string;
  /** 预生成音频的资源引用（原项目 TTS 生成阶段写入） */
  audioId?: AssetRef;
  /** 音频 URL（优先于 audioId，兼容旧数据） */
  audioUrl?: string;
  /** 音色标识 */
  voice?: string;
  /** 播放速度倍率，默认 1.0 */
  speed?: number;
}

// ==================== 白板动作（类型保留，功能裁剪） ====================
// 以下白板动作类型仅用于让照搬的引擎代码编译通过，运行时不会产出。

/** 打开白板（等待开板动画完成） */
export interface WbOpenAction extends ActionBase {
  type: 'wb_open';
}

/** 在白板上绘制文本（等待渲染完成） */
export interface WbDrawTextAction extends ActionBase {
  type: 'wb_draw_text';
  /** 自定义元素 id，供后续引用（如 wb_delete） */
  elementId?: string;
  /** 文本内容（HTML 字符串或纯文本） */
  content: string;
  /** 画布 X 坐标（0-1000） */
  x: number;
  /** 画布 Y 坐标（0-562） */
  y: number;
  /** 宽度，默认 400 */
  width?: number;
  /** 高度，默认 100 */
  height?: number;
  /** 字号，默认 18 */
  fontSize?: number;
  /** 颜色，默认 '#333333' */
  color?: string;
}

/** 在白板上绘制形状（等待渲染完成） */
export interface WbDrawShapeAction extends ActionBase {
  type: 'wb_draw_shape';
  elementId?: string;
  shape: 'rectangle' | 'circle' | 'triangle';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 填充色，默认 '#5b9bd5' */
  fillColor?: string;
}

/** 在白板上绘制图表（等待渲染完成） */
export interface WbDrawChartAction extends ActionBase {
  type: 'wb_draw_chart';
  elementId?: string;
  chartType: 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter';
  x: number;
  y: number;
  width: number;
  height: number;
  data: { labels: string[]; legends: string[]; series: number[][] };
  themeColors?: string[];
}

/** 在白板上绘制 LaTeX 公式（等待渲染完成） */
export interface WbDrawLatexAction extends ActionBase {
  type: 'wb_draw_latex';
  elementId?: string;
  latex: string;
  x: number;
  y: number;
  /** 宽度，默认 400 */
  width?: number;
  /** 高度，默认按公式宽高比自动计算 */
  height?: number;
  /** 颜色，默认 '#000000' */
  color?: string;
}

/** 在白板上绘制表格（等待渲染完成） */
export interface WbDrawTableAction extends ActionBase {
  type: 'wb_draw_table';
  elementId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 简化二维字符串数组，首行为表头 */
  data: string[][];
  outline?: { width: number; style: string; color: string };
  theme?: { color: string };
}

/** 在白板上绘制直线 / 箭头（等待渲染完成） */
export interface WbDrawLineAction extends ActionBase {
  type: 'wb_draw_line';
  elementId?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed';
  /** 端点标记，默认 ['', ''] */
  points?: ['', 'arrow'] | ['arrow', ''] | ['arrow', 'arrow'] | ['', ''];
}

/** 清空白板 */
export interface WbClearAction extends ActionBase {
  type: 'wb_clear';
}

/** 按 id 删除白板上的某个元素 */
export interface WbDeleteAction extends ActionBase {
  type: 'wb_delete';
  elementId: string;
}

/** 关闭白板（等待关板动画完成） */
export interface WbCloseAction extends ActionBase {
  type: 'wb_close';
}

/** 在白板上绘制代码块（等待打字动画完成） */
export interface WbDrawCodeAction extends ActionBase {
  type: 'wb_draw_code';
  elementId?: string;
  language: string;
  /** 原始代码文本，按 \n 分行 */
  code: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fileName?: string;
}

/** 编辑白板代码块（行级操作） */
export interface WbEditCodeAction extends ActionBase {
  type: 'wb_edit_code';
  elementId: string;
  operation: 'insert_after' | 'insert_before' | 'delete_lines' | 'replace_lines';
  lineId?: string;
  lineIds?: string[];
  content?: string;
}

// ==================== 其他动作（类型保留，功能裁剪） ====================

/** 播放视频：开始播放幻灯片上的视频元素 */
export interface PlayVideoAction extends ActionBase {
  type: 'play_video';
  elementId: string;
}

/** 讨论动作：触发一次圆桌讨论（裁剪范围不使用，类型保留） */
export interface DiscussionAction extends ActionBase {
  type: 'discussion';
  /** 讨论主题 */
  topic: string;
  /** 讨论引导语（可选） */
  prompt?: string;
  /** 发起讨论的 agent id（可选） */
  agentId?: string;
}

/** 在交互组件 iframe 中高亮元素 */
export interface WidgetHighlightAction extends ActionBase {
  type: 'widget_highlight';
  target: string;
  content?: string;
}

/** 设置交互组件状态（如模拟实验的变量） */
export interface WidgetSetStateAction extends ActionBase {
  type: 'widget_setState';
  state: Record<string, unknown>;
  content?: string;
}

/** 在交互组件中追加浮动注释 */
export interface WidgetAnnotationAction extends ActionBase {
  type: 'widget_annotation';
  target: string;
  content?: string;
}

/** 在交互组件中揭示隐藏内容 */
export interface WidgetRevealAction extends ActionBase {
  type: 'widget_reveal';
  target?: string;
  content?: string;
}

/** 全部动作的联合类型（对应原项目 Action） */
export type Action =
  | SpotlightAction
  | LaserAction
  | PlayVideoAction
  | SpeechAction
  | WbOpenAction
  | WbDrawTextAction
  | WbDrawShapeAction
  | WbDrawChartAction
  | WbDrawLatexAction
  | WbDrawTableAction
  | WbDrawLineAction
  | WbClearAction
  | WbDeleteAction
  | WbCloseAction
  | WbDrawCodeAction
  | WbEditCodeAction
  | DiscussionAction
  | WidgetHighlightAction
  | WidgetSetStateAction
  | WidgetAnnotationAction
  | WidgetRevealAction;

/** 动作类型字符串（对应原项目 ActionType） */
export type ActionType = Action['type'];

/** 立即执行、不阻塞后续动作的动作类型（播放引擎引用） */
export const FIRE_AND_FORGET_ACTIONS: ActionType[] = ['spotlight', 'laser'];

/** 仅适用于幻灯片场景的动作类型（播放引擎引用） */
export const SLIDE_ONLY_ACTIONS: ActionType[] = ['spotlight', 'laser'];

/** 必须等待完成后再执行下一条的动作类型（播放引擎引用） */
export const SYNC_ACTIONS: ActionType[] = [
  'speech',
  'play_video',
  'wb_open',
  'wb_draw_text',
  'wb_draw_shape',
  'wb_draw_chart',
  'wb_draw_latex',
  'wb_draw_table',
  'wb_draw_line',
  'wb_draw_code',
  'wb_edit_code',
  'wb_clear',
  'wb_delete',
  'wb_close',
  'discussion',
  'widget_highlight',
  'widget_setState',
  'widget_annotation',
  'widget_reveal',
];

/** 全部合法动作类型的冻结集合（用于 cheap 成员检查） */
export const ACTION_TYPES = [
  'spotlight',
  'laser',
  'play_video',
  'speech',
  'wb_open',
  'wb_draw_text',
  'wb_draw_shape',
  'wb_draw_chart',
  'wb_draw_latex',
  'wb_draw_table',
  'wb_draw_line',
  'wb_draw_code',
  'wb_edit_code',
  'wb_clear',
  'wb_delete',
  'wb_close',
  'discussion',
  'widget_highlight',
  'widget_setState',
  'widget_annotation',
  'widget_reveal',
] as const satisfies readonly ActionType[];

/** 把未知值收窄为合法 ActionType（纯函数） */
export function isActionType(value: unknown): value is ActionType {
  return typeof value === 'string' && (ACTION_TYPES as readonly string[]).includes(value);
}

/**
 * 百分比坐标系几何信息（0-100 坐标系）。
 * 对应原项目：lib/utils/geometry.ts 计算出的元素几何，供聚光/激光定位使用。
 */
export interface PercentageGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}
