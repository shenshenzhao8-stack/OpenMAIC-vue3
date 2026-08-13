/**
 * 文件头：播放引擎类型定义
 *
 * 对应原项目：lib/playback/types.ts（照搬，注释已翻译为中文）
 *
 * 功能：
 *   - EngineMode：引擎状态机（idle / playing / paused / live）；
 *   - PlaybackSnapshot：可序列化的播放位置快照（场景序号 + 动作序号 + 已消费讨论）；
 *   - Effect：聚光 / 激光等视觉特效通知（onEffectFire 回调参数）；
 *   - TopicState / TriggerEvent：讨论主题状态与触发事件（类型保留）；
 *   - PlaybackEngineCallbacks：引擎对外回调契约（字幕、切场景、特效、进度、打断等）。
 */

/** 播放位置快照：用于持久化与恢复（刷新页面回到离开的那一句） */
export interface PlaybackSnapshot {
  /** 场景序号 */
  sceneIndex: number;
  /** 场景内动作序号 */
  actionIndex: number;
  /** 已消费的讨论动作 id 集合（避免重播重复触发讨论） */
  consumedDiscussions: string[];
  /** 场景 id（快照校验用） */
  sceneId?: string;
}

/** 视觉特效通知（onEffectFire 回调参数） */
export type Effect =
  | { kind: 'spotlight'; targetId: string; dimOpacity?: number }
  | { kind: 'laser'; targetId: string; color?: string };

/** 引擎状态机模式 */
export type EngineMode = 'idle' | 'playing' | 'paused' | 'live';

/** 讨论主题状态 */
export type TopicState = 'active' | 'pending' | 'closed';

/** 讨论触发事件（主动讨论卡片用） */
export interface TriggerEvent {
  id: string;
  /** 讨论问题 */
  question: string;
  /** 讨论引导语（可选） */
  prompt?: string;
  /** 发起讨论的 agent id（可选） */
  agentId?: string;
}

/** 播放引擎对外回调契约 */
export interface PlaybackEngineCallbacks {
  /** 状态机变化（idle/playing/paused/live） */
  onModeChange?: (mode: EngineMode) => void;
  /** 切换场景（进入新场景时触发） */
  onSceneChange?: (sceneId: string) => void;
  /** 一句台词开始（字幕亮起） */
  onSpeechStart?: (text: string) => void;
  /** 一句台词结束 */
  onSpeechEnd?: () => void;
  /** 实时文字增量（打字机用） */
  onTextDelta?: (content: string) => void;
  /** 发言者变化 */
  onSpeakerChange?: (role: string) => void;
  /** 视觉特效触发（聚光/激光） */
  onEffectFire?: (effect: Effect) => void;

  // 主动讨论卡片
  /** 显示主动讨论卡片 */
  onProactiveShow?: (trigger: TriggerEvent) => void;
  /** 隐藏主动讨论卡片 */
  onProactiveHide?: () => void;

  // 讨论生命周期
  /** 用户确认加入讨论 */
  onDiscussionConfirmed?: (topic: string, prompt?: string, agentId?: string) => void;
  /** 讨论结束 */
  onDiscussionEnd?: () => void;
  /** 用户在播放中发送消息（打断讲课） */
  onUserInterrupt?: (text: string) => void;

  // 主题 / 记录
  /** 主题开始（讲课或讨论） */
  onTopicStart?: (type: 'lecture' | 'discussion', title: string) => void;
  /** 追加一条发言记录 */
  onTopicAppend?: (role: string, text: string) => void;
  /** 主题结束 */
  onTopicEnd?: () => void;

  /** 播放进度更新（持久化用） */
  onProgress?: (snapshot: PlaybackSnapshot) => void;

  /** 判断某 agent 是否在用户选中列表中（跳过其讨论动作用） */
  isAgentSelected?: (agentId: string) => boolean;

  /** 获取当前播放倍速 */
  getPlaybackSpeed?: () => number;

  /** 全部动作播放完成 */
  onComplete?: () => void;
}
