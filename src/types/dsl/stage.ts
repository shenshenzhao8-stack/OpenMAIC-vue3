/**
 * 文件头：自建裁剪版「课程骨架（Stage / Scene / SceneContent）」模块
 *
 * 对应原项目文件：packages/@openmaic/dsl/src/stage.ts
 *
 * 与原项目的主要差异（裁剪）：
 *   1. `SceneType` 只保留 slide / quiz / interactive 三种，删除 pbl（需求 1）；
 *   2. `SceneCore.multiAgent` 字段删除：本裁剪范围的互动由 ChatSession（会话）承载，
 *      不需要原项目的白板/讨论多智能体配置；
 *   3. `QuizQuestion` 裁剪判分/讲解字段（2026-08-11）：删除 points / analysis /
 *      commentPrompt / hasAnswer——本项目无判分业务，复盘仅展示对错与参考答案。
 *
 * 保留的关键机制：
 *   - `Scene` 的泛型判别联合：`type` 与 `content` 强绑定（slide 场景必须携带
 *     SlideContent），与原项目一致；
 *   - `isSlideContent` / `isQuizContent` 纯守卫，渲染分发器依赖它们。
 */

import type { Action } from './action';
import type { Slide } from './slides';

/** 场景类型（裁剪后：仅三种） */
export type SceneType = 'slide' | 'quiz' | 'interactive';

/** 全部合法场景类型的冻结集合 */
export const SCENE_TYPES = ['slide', 'quiz', 'interactive'] as const satisfies readonly SceneType[];

/** 把未知值收窄为合法 SceneType（纯函数） */
export function isSceneType(value: unknown): value is SceneType {
  return typeof value === 'string' && (SCENE_TYPES as readonly string[]).includes(value);
}

/** 课堂所处的运行模式（播放 / 编辑 / 自主） */
export type StageMode = 'autonomous' | 'playback' | 'edit';

/** 白板画布：结构上等于去掉主题/翻页等字段的 Slide（原项目 Whiteboard） */
export type Whiteboard = Omit<Slide, 'theme' | 'turningMode' | 'sectionTag' | 'type'>;

/** 视频清单条目（生成视频的请求描述） */
export interface VideoManifestEntry {
  type: 'video';
  prompt: string;
  aspectRatio?: string;
}

/** 视频清单：以视频元素的 mediaRef 为键 */
export type VideoManifest = Record<string, VideoManifestEntry>;

/** Agent 音色三要素配方（原项目 VoiceDesign） */
export interface VoiceDesign {
  /** 性别 / 年龄 / 角色 */
  identity: string;
  /** 音色 / 音质 */
  texture: string;
  /** 情绪 / 语速 */
  delivery: string;
}

/** Agent 绑定的具体 TTS 音色（原项目 AgentVoiceConfig） */
export interface AgentVoiceConfig {
  providerId: string;
  voiceId: string;
}

/** 生成课堂时嵌入文档的 Agent 配置（原项目 GeneratedAgentConfig） */
export interface GeneratedAgentConfig {
  id: string;
  name: string;
  role: string;
  persona: string;
  avatar: string;
  color: string;
  priority: number;
  voiceConfig?: AgentVoiceConfig;
  voiceDesign?: VoiceDesign;
}

/** 幻灯片场景内容：一张画布（原项目 SlideContent） */
export interface SlideContent {
  type: 'slide';
  schemaVersion?: number;
  canvas: Slide;
}

/** 测验选项 */
export interface QuizOption {
  label: string;
  value: string;
}

/** 测验题目（裁剪版：无判分/讲解字段） */
export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  question: string;
  options?: QuizOption[];
  /** 正确答案（选择题）或参考答案（简答题）；简答题展示在复盘页 */
  answer?: string[];
}

/** 测验场景内容（原项目 QuizContent） */
export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
}

/** 场景内容（DSL 契约层的两种通用内容类型） */
export type SceneContent = SlideContent | QuizContent;

/** 场景的公共字段（原项目 SceneCore，裁剪了 multiAgent） */
export interface SceneCore<TAction = Action> {
  id: string;
  /** 所属 Stage id（数据完整性校验用） */
  stageId: string;
  title: string;
  /** 展示顺序（第几页） */
  order: number;
  /** 播放时执行的剧本动作 */
  actions?: TAction[];
  /** 深度讲解用的白板（类型保留） */
  whiteboards?: Slide[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * 场景：一「页」（原项目 Scene）
 *
 * 关键机制：`type` 判别字段与 `content` **强绑定**——slide 场景必须携带
 * SlideContent，quiz 场景必须携带 QuizContent。渲染分发器按 `scene.type`
 * 分支后，读取 `scene.content` 即为对应形状。
 */
export type Scene<
  TAction = Action,
  TContent extends { type: SceneType } = SlideContent | QuizContent,
> = TContent extends unknown ? SceneCore<TAction> & { type: TContent['type']; content: TContent } : never;

/** 把候选收窄为 SlideContent（纯守卫） */
export function isSlideContent<T extends { type: SceneType }>(content: T): content is T & SlideContent {
  return content.type === 'slide';
}

/** 把候选收窄为 QuizContent（纯守卫） */
export function isQuizContent<T extends { type: SceneType }>(content: T): content is T & QuizContent {
  return content.type === 'quiz';
}

/** 课程（Stage）：一节课 = 一个容器 + 多个按 order 排序的场景（原项目 Stage） */
export interface Stage {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  languageDirective?: string;
  style?: string;
  whiteboard?: Whiteboard[];
  videoManifest?: VideoManifest;
  /** 创建课堂时选中的 agent id 列表 */
  agentIds?: string[];
  /** 服务端生成的 agent 配置（LLM 生成阵容时嵌入文档） */
  generatedAgentConfigs?: GeneratedAgentConfig[];
  /** 是否以 Interactive Mode 生成 */
  interactiveMode?: boolean;
  taskEngineMode?: boolean;
}
