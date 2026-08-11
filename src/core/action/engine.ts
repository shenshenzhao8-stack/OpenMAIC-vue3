/**
 * 文件头：ActionEngine（动作执行器，裁剪版）
 *
 * 对应原项目：lib/action/engine.ts（统一执行层，约 900 行）
 *
 * 裁剪说明：
 *   原项目 ActionEngine 是「在线流式」与「离线播放」共用的唯一执行层，
 *   支持 speech / spotlight / laser / 白板 / 视频 / widget 等全部动作。
 *   按范围要求（教学动作：speech + spotlight + laser，2026-08-11 更新），
 *   本文件实现：
 *     - spotlight：改 canvas store（聚光状态）→ 界面自动响应；
 *     - laser：改 canvas store（激光目标）→ LaserOverlay 自动响应；
 *     - speech：交给 AudioPlayer 播放，播完 resolve（引擎据此走下一步）。
 *   其余动作类型（wb_* / widget_* / play_video / discussion）直接 no-op。
 *
 * 保留的对外接口（播放引擎调用）：
 *   - execute(action, options?)       执行单个动作
 *   - clearEffects()                  清除全部视觉特效
 *   - resetPlaybackVisualState()      重置播放视觉状态（跳转前调用）
 *   - dispose()                       清理定时器
 */
import type { Action, SpotlightAction, LaserAction, SpeechAction } from '@/types/action'
import type { AudioPlayer } from '@/core/audio/audio-player'
import { useCanvasStore } from '@/stores/canvas'
import { EFFECT_AUTO_CLEAR_MS } from '@/core/choreography'

/** 动作执行选项 */
export interface ActionExecutionOptions {
  /** 静默模式：跳转/重放时使用，speech/spotlight/laser 等不产生实际效果 */
  silent?: boolean
}

/**
 * 动作执行器（裁剪版）。
 * 设计原则与原项目一致：执行器只改 store 状态，不直接操作 DOM，
 * 组件订阅 store 后自动渲染，从而实现「引擎 → store → 组件」单向数据流。
 */
export class ActionEngine {
  /** 音频播放器（可空：无音频时 speech 直接完成） */
  private audioPlayer: AudioPlayer | null
  /** 特效自动清除定时器（聚光/激光 5 秒后熄灭） */
  private effectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(audioPlayer?: AudioPlayer | null) {
    this.audioPlayer = audioPlayer ?? null
  }

  /** 清理定时器（组件卸载时调用，防止内存泄漏） */
  dispose(): void {
    if (this.effectTimer) {
      clearTimeout(this.effectTimer)
      this.effectTimer = null
    }
  }

  /**
   * 执行单个动作。
   * - 火速动作（spotlight/laser）：立即执行并返回；
   * - 同步动作（speech）：返回 Promise，音频播完才 resolve；
   * - 裁剪范围外的动作：no-op。
   */
  async execute(action: Action, options: ActionExecutionOptions = {}): Promise<void> {
    // 静默模式：speech / spotlight / laser 直接跳过（用于跳转时的前缀重放）
    if (options.silent) {
      if (action.type === 'speech' || action.type === 'spotlight' || action.type === 'laser') {
        return
      }
    }

    switch (action.type) {
      case 'spotlight':
        this.executeSpotlight(action)
        return
      case 'laser':
        this.executeLaser(action)
        return
      case 'speech':
        return this.executeSpeech(action)
      default:
        // 裁剪范围外的动作（白板 / 视频 / widget / discussion）：不做任何事
        return
    }
  }

  /** 清除全部视觉特效（聚光/激光），并取消待执行的自动清除定时器 */
  clearEffects(): void {
    if (this.effectTimer) {
      clearTimeout(this.effectTimer)
      this.effectTimer = null
    }
    useCanvasStore.getState().clearAllEffects()
  }

  /**
   * 重置播放视觉状态（播放引擎 jumpToAction 前调用）。
   * 原项目还会清空白板，本项目无白板，故仅清除特效、暂停视频、关闭白板标记。
   */
  resetPlaybackVisualState(): void {
    this.clearEffects()
    useCanvasStore.getState().pauseVideo()
    useCanvasStore.getState().setWhiteboardOpen(false)
    useCanvasStore.getState().setWhiteboardClearing(false)
  }

  /**
   * 为火速特效安排自动清除：
   * 每次执行聚光/激光后重置定时器，EFFECT_AUTO_CLEAR_MS（5 秒）后调用
   * canvas store 的 clearAllEffects()，保证特效不会一直亮着。
   */
  private scheduleEffectClear(): void {
    if (this.effectTimer) {
      clearTimeout(this.effectTimer)
    }
    this.effectTimer = setTimeout(() => {
      useCanvasStore.getState().clearAllEffects()
      this.effectTimer = null
    }, EFFECT_AUTO_CLEAR_MS)
  }

  // ==================== 火速动作 ====================

  /** 执行聚光：把「聚焦元素 id + 变暗程度」写入 canvas store，界面自动响应 */
  private executeSpotlight(action: SpotlightAction): void {
    useCanvasStore.getState().setSpotlight(action.elementId, {
      dimness: action.dimOpacity ?? 0.5,
    })
    this.scheduleEffectClear()
  }

  /** 执行激光笔：把「目标元素 id + 颜色」写入 canvas store，LaserOverlay 自动响应 */
  private executeLaser(action: LaserAction): void {
    useCanvasStore.getState().setLaser(action.elementId, {
      color: action.color ?? '#ff0000',
    })
    this.scheduleEffectClear()
  }

  // ==================== 同步动作 ====================

  /**
   * 执行语音：把「播完回调」挂到 AudioPlayer 上并开始播放；
   * 音频播完（onEnded）或没有音频（未开始/失败）时 resolve，
   * 播放引擎据此执行下一条动作 —— 这是「语音文字同步」的执行端。
   */
  private async executeSpeech(action: SpeechAction): Promise<void> {
    if (!this.audioPlayer) return
    return new Promise<void>((resolve) => {
      this.audioPlayer!.onEnded(() => resolve())
      this.audioPlayer!.play(action.audioId || '', action.audioUrl)
        .then((audioStarted) => {
          if (!audioStarted) resolve()
        })
        .catch(() => resolve())
    })
  }
}
