/**
 * 文件头：PlaybackEngine —— 课堂播放的「磁带机」引擎
 *
 * 对应原项目：lib/playback/engine.ts（照搬，注释已结合业务逻辑重写为中文）
 *
 * ── 它在整个业务里扮演什么角色 ──
 * 课堂播放页把一份「剧本」（Scene.actions[]）交给引擎，引擎像磁带机一样
 * 逐条消费：说一句话（等音频播完）→ 聚光（立即执行）→ 再说一句话……
 * 一个场景的台词播完自动推进到下一页；全部播完回到 idle 并触发 onComplete。
 *
 * 它同时是「讲课 ↔ 实时讨论」的调度中枢：
 *   - 学生中途提问 → handleUserInterrupt：保存当前讲课位置，进入 live 模式；
 *   - 讨论结束后 → handleEndDiscussion：恢复保存的位置，从被打断的那句继续讲。
 *
 * 状态机：idle → playing → paused → live（详见下方原状态图）。
 *
 * 关键设计（与原项目一致）：
 *   - 「完成信号」因动作而异：speech 靠音频 ended 事件；spotlight 立即完成；
 *     discussion 靠用户点「加入/跳过」；统一收敛为「完成后调用 processNext()」；
 *   - 播放位置快照（getSnapshot/restoreFromSnapshot）用于刷新恢复；
 *   - 无音频时用朗读时长估算兜底（estimateSpeechDurationMs），保证节奏不卡；
 *   - 浏览器 TTS 用 cancel+重讲处理暂停/恢复（Firefox 兼容）。
 */
import type { Scene } from '@/types/stage'
import type { Action, SpeechAction, DiscussionAction } from '@/types/action'
import type {
  EngineMode,
  TopicState,
  PlaybackEngineCallbacks,
  PlaybackSnapshot,
  TriggerEvent,
  Effect,
} from './types'
import type { AudioPlayer } from '@/core/audio/audio-player'
import { ActionEngine } from '@/core/action/engine'
import {
  resolvePlaybackCursor,
  estimateSpeechDurationMs,
  DISCUSSION_TRIGGER_DELAY_MS,
} from '@/core/choreography'
import {
  canJumpWithinReconstructablePrefix,
  isWhiteboardPlaybackAction,
} from './action-navigation'
import { useCanvasStore } from '@/stores/canvas'
import { useSettingsStore } from '@/stores/settings'
import { isTTSProviderEnabled } from '@/core/audio/provider-enablement'
import { createLogger } from '@/core/logger'

const log = createLogger('PlaybackEngine')

/**
 * 文本 CJK 占比超过该阈值即视为中文。
 * 阈值刻意取低：中英混排文本常含标点、数字和少量拉丁词（如 "AI课堂"）。
 */
const CJK_LANG_THRESHOLD = 0.3

/**
 * 播放引擎——课堂播放与实时讨论的统一状态机。
 *
 * 状态流转：
 *                  start()                  pause()
 *   idle ──────────────────→ playing ──────────────→ paused
 *     ▲                         ▲                       │
 *     │                         │  resume()             │
 *     │                         └───────────────────────┘
 *     │
 *     │  handleEndDiscussion()
 *     │                         confirmDiscussion()
 *     │                         / handleUserInterrupt()
 *     │                              │
 *     │                              ▼         pause()
 *     └──────────────────────── live ──────────────→ paused
 *                                 ▲                    │
 *                                 │ resume / user msg  │
 *                                 └────────────────────┘
 */
export class PlaybackEngine {
  /** 全部场景（剧本） */
  private scenes: Scene[] = []
  /** 当前场景序号 */
  private sceneIndex: number = 0
  /** 当前场景内动作序号 */
  private actionIndex: number = 0
  /** 引擎状态（idle/playing/paused/live） */
  private mode: EngineMode = 'idle'
  /** 已消费的讨论动作 id（防止重播时重复触发） */
  private consumedDiscussions: Set<string> = new Set()

  // 讨论打断讲课时的位置保存
  private savedSceneIndex: number | null = null
  private savedActionIndex: number | null = null

  // 讨论主题状态
  private currentTopicState: TopicState | null = null

  // 依赖注入
  private audioPlayer: AudioPlayer
  private actionEngine: ActionEngine
  private callbacks: PlaybackEngineCallbacks

  // 场景标识（快照校验用）
  private sceneId: string | undefined

  // 内部状态
  private currentTrigger: TriggerEvent | null = null
  private triggerDelayTimer: ReturnType<typeof setTimeout> | null = null
  /** 无预生成音频时的「阅读计时」定时器（TTS 关闭时兜底） */
  private speechTimer: ReturnType<typeof setTimeout> | null = null
  private speechTimerStart: number = 0
  // 浏览器原生 TTS（Web Speech API）状态
  private browserTTSActive: boolean = false
  private browserTTSChunks: string[] = []
  private browserTTSChunkIndex: number = 0
  private browserTTSPausedChunks: string[] = []
  /** 暂停时保存的剩余朗读毫秒数 */
  private speechTimerRemaining: number = 0
  /** 播放代次：每次暂停/停止/跳转自增，用于使旧的异步回调失效 */
  private playbackGeneration: number = 0

  constructor(
    scenes: Scene[],
    actionEngine: ActionEngine,
    audioPlayer: AudioPlayer,
    callbacks: PlaybackEngineCallbacks = {},
  ) {
    this.scenes = scenes
    this.sceneId = scenes[0]?.id
    this.actionEngine = actionEngine
    this.audioPlayer = audioPlayer
    this.callbacks = callbacks
  }

  // ==================== 公开 API ====================

  /** 获取当前引擎状态 */
  getMode(): EngineMode {
    return this.mode
  }

  /** 当前是否处于「讨论打断讲课」状态（恢复前有保存的讲课位置） */
  hasLectureInterruption(): boolean {
    return this.savedSceneIndex !== null
  }

  /** 当前播放位置的场景 id（恢复引擎状态后读取） */
  getCurrentSceneId(): string | null {
    return this.scenes[this.sceneIndex]?.id ?? null
  }

  /** 导出可序列化的播放位置快照（用于持久化） */
  getSnapshot(): PlaybackSnapshot {
    return {
      sceneIndex: this.sceneIndex,
      actionIndex: this.actionIndex,
      consumedDiscussions: [...this.consumedDiscussions],
      sceneId: this.sceneId,
    }
  }

  /** 从快照恢复播放位置 */
  restoreFromSnapshot(snapshot: PlaybackSnapshot): void {
    this.sceneIndex = snapshot.sceneIndex
    this.actionIndex = snapshot.actionIndex
    this.consumedDiscussions = new Set(snapshot.consumedDiscussions)
  }

  /** 从头开始播放（idle → playing） */
  start(): void {
    if (this.mode !== 'idle') {
      log.warn('Cannot start: not idle, current mode:', this.mode)
      return
    }

    this.sceneIndex = 0
    this.actionIndex = 0
    this.invalidatePlaybackGeneration()
    this.setMode('playing')
    this.processNext()
  }

  /** 从当前位置继续播放（如讨论结束后恢复讲课） */
  continuePlayback(): void {
    if (this.mode !== 'idle') {
      log.warn('Cannot continue: not idle, current mode:', this.mode)
      return
    }
    this.invalidatePlaybackGeneration()
    this.setMode('playing')
    this.processNext()
  }

  /** 目标动作是否可安全跳转（live 模式下不允许跳转） */
  canJumpToAction(actionIndex: number): boolean {
    const actions = this.scenes[0]?.actions ?? []
    return (
      this.mode !== 'live' &&
      canJumpWithinReconstructablePrefix(actions, this.actionIndex, actionIndex)
    )
  }

  /**
   * 跳转到指定动作：先静默重放目标之前的白板动作（保证白板状态正确），
   * 再移动游标；可选自动播放。
   */
  async jumpToAction(actionIndex: number, options: { autoplay?: boolean } = {}): Promise<boolean> {
    const actions = this.scenes[0]?.actions ?? []
    if (!this.canJumpToAction(actionIndex)) return false

    const autoplay = options.autoplay ?? this.mode === 'playing'
    const generation = this.invalidatePlaybackGeneration()
    this.cancelActivePlaybackWork()
    this.sceneIndex = 0
    this.actionIndex = 0
    this.savedSceneIndex = null
    this.savedActionIndex = null
    this.currentTopicState = null
    this.currentTrigger = null
    this.actionEngine.resetPlaybackVisualState()

    // 静默重放目标之前的白板动作，保持白板画面正确
    for (let i = 0; i < actionIndex; i++) {
      if (!this.isCurrentGeneration(generation)) return false
      const action = actions[i]
      if (isWhiteboardPlaybackAction(action)) {
        await this.actionEngine.execute(action, { silent: true })
      }
    }

    if (!this.isCurrentGeneration(generation)) return false
    this.actionEngine.clearEffects()
    this.sceneIndex = 0
    this.actionIndex = actionIndex
    this.callbacks.onProgress?.(this.getSnapshot())

    if (autoplay) {
      this.setMode('playing')
      this.processNext(generation)
    } else if (this.mode === 'playing' || this.mode === 'live') {
      this.setMode('paused')
    }

    return true
  }

  /**
   * 暂停：取消待执行的定时器/音频。
   * - playing → paused：浏览器 TTS 用「cancel+保存剩余句段」方式暂停
   *   （Firefox 的 pause/resume 不可靠），普通音频直接 pause；
   * - live → paused：讨论挂起（pending），由调用方负责中断 SSE 流。
   */
  pause(): void {
    if (this.mode === 'playing') {
      this.invalidatePlaybackGeneration()
      // 取消待执行的讨论卡片定时器
      if (this.triggerDelayTimer) {
        clearTimeout(this.triggerDelayTimer)
        this.triggerDelayTimer = null
      }
      // 保存阅读计时剩余时间，resume() 据此重新调度
      if (this.speechTimer) {
        this.speechTimerRemaining = Math.max(
          0,
          this.speechTimerRemaining - (Date.now() - this.speechTimerStart),
        )
        clearTimeout(this.speechTimer)
        this.speechTimer = null
      }
      this.setMode('paused')
      // 冻结语音——但若正停在主动讨论卡片上（无进行中的语音）则跳过
      if (!this.currentTrigger) {
        if (this.browserTTSActive) {
          // cancel+重讲：保存剩余句段，恢复时从当前句重讲
          this.browserTTSPausedChunks = this.browserTTSChunks.slice(this.browserTTSChunkIndex)
          window.speechSynthesis?.cancel()
        } else if (this.audioPlayer.isPlaying()) {
          this.audioPlayer.pause()
        }
      }
    } else if (this.mode === 'live') {
      this.invalidatePlaybackGeneration()
      this.setMode('paused')
      this.currentTopicState = 'pending'
    } else {
      log.warn('Cannot pause: mode is', this.mode)
    }
  }

  /** 恢复：paused → playing（讨论挂起则回到 live） */
  resume(): void {
    if (this.mode !== 'paused') {
      log.warn('Cannot resume: not paused, mode is', this.mode)
      return
    }

    if (this.currentTopicState === 'pending') {
      // 讨论挂起 → 恢复 live
      this.currentTopicState = 'active'
      this.setMode('live')
    } else if (this.currentTrigger) {
      // 正停在主动讨论卡片——只恢复状态，不碰音频
      this.setMode('playing')
    } else {
      // 恢复讲课
      this.setMode('playing')
      if (this.browserTTSPausedChunks.length > 0) {
        // 浏览器 TTS 曾被 cancel——重讲剩余句段
        this.browserTTSActive = true
        this.browserTTSChunks = this.browserTTSPausedChunks
        this.browserTTSChunkIndex = 0
        this.browserTTSPausedChunks = []
        this.playBrowserTTSChunk(this.playbackGeneration)
      } else if (this.audioPlayer.hasActiveAudio()) {
        // 普通音频暂停中——恢复播放；播完继续走下一步
        const generation = this.playbackGeneration
        this.audioPlayer.onEnded(() => {
          if (!this.isCurrentGeneration(generation)) return
          this.callbacks.onSpeechEnd?.()
          if (this.mode === 'playing') {
            this.processNext(generation)
          }
        })
        this.audioPlayer.resume()
      } else if (this.speechTimerRemaining > 0) {
        // 阅读计时暂停中——按剩余时间重新调度
        const generation = this.playbackGeneration
        this.speechTimerStart = Date.now()
        this.speechTimer = setTimeout(() => {
          if (!this.isCurrentGeneration(generation)) return
          this.speechTimer = null
          this.speechTimerRemaining = 0
          this.callbacks.onSpeechEnd?.()
          if (this.mode === 'playing') this.processNext(generation)
        }, this.speechTimerRemaining)
      } else {
        // 暂停期间语音已播完——直接继续下一条
        this.processNext()
      }
    }
  }

  /** 停止并回到初始状态（idle，游标归零） */
  stop(): void {
    this.invalidatePlaybackGeneration()
    // 先改状态再停音频：防止 onend 同步回调触发多余的 processNext
    this.setMode('idle')
    this.audioPlayer.stop()
    this.cancelBrowserTTS()
    this.actionEngine.clearEffects()
    if (this.triggerDelayTimer) {
      clearTimeout(this.triggerDelayTimer)
      this.triggerDelayTimer = null
    }
    if (this.speechTimer) {
      clearTimeout(this.speechTimer)
      this.speechTimer = null
    }
    this.speechTimerRemaining = 0
    this.sceneIndex = 0
    this.actionIndex = 0
    this.savedSceneIndex = null
    this.savedActionIndex = null
    this.currentTopicState = null
    this.currentTrigger = null
  }

  /**
   * 消费一个讨论动作并立即发布进度快照。
   * 进度回调默认在动作执行前触发；若讨论是场景最后一个动作，不在这里补发
   * 「已消费」记录，持久化就会丢——所以这里必须显式发一次。
   */
  private markDiscussionConsumed(id: string): void {
    this.consumedDiscussions.add(id)
    this.callbacks.onProgress?.(this.getSnapshot())
  }

  /** 用户点击「加入讨论」→ 保存讲课位置 → 进入 live */
  confirmDiscussion(): void {
    if (!this.currentTrigger) {
      log.warn('confirmDiscussion called but no trigger')
      return
    }
    this.invalidatePlaybackGeneration()

    // 标记已消费，避免重播时再次触发
    this.markDiscussionConsumed(this.currentTrigger.id)

    // 保存讲课位置——讨论动作排在所有语音动作之后，
    // 其前的语音已完整播放，恢复时无需重播。
    this.savedSceneIndex = this.sceneIndex
    this.savedActionIndex = this.actionIndex

    // 进入 live 模式
    this.currentTopicState = 'active'
    this.setMode('live')

    // 通知 UI：隐藏卡片 + 回调讨论开始
    this.callbacks.onProactiveHide?.()
    this.callbacks.onDiscussionConfirmed?.(
      this.currentTrigger.question,
      this.currentTrigger.prompt,
      this.currentTrigger.agentId,
    )
    this.currentTrigger = null
  }

  /** 用户点击「跳过讨论」→ 标记已消费 → 继续播放 */
  skipDiscussion(): void {
    if (this.currentTrigger) {
      this.markDiscussionConsumed(this.currentTrigger.id)
      this.currentTrigger = null
    }
    const generation = this.invalidatePlaybackGeneration()
    this.callbacks.onProactiveHide?.()

    if (this.mode === 'playing') {
      this.processNext(generation)
    }
  }

  /** 讨论结束 → 恢复讲课位置 → idle（用户点「继续」后再 start/continue） */
  handleEndDiscussion(): void {
    this.invalidatePlaybackGeneration()
    this.actionEngine.clearEffects()
    this.currentTopicState = 'closed'

    // 讨论期间可能开过白板，收尾关闭
    useCanvasStore.getState().setWhiteboardOpen(false)

    // 先恢复讲课游标再通知 UI（回调可能检查 isExhausted 决定是否播放完成）
    this.restoreSavedLectureState()

    this.callbacks.onDiscussionEnd?.()

    this.setMode('idle')
  }

  /**
   * 请求失败时退出 live 模式（不当作正常讨论结束，会话可重试）。
   * 只恢复引擎到非 live 的连贯状态。
   */
  handleDiscussionError(): void {
    const hasSavedLectureState = this.savedSceneIndex !== null && this.savedActionIndex !== null
    const isLiveTopic =
      this.mode === 'live' || (this.mode === 'paused' && this.currentTopicState === 'pending')

    if (!isLiveTopic && !hasSavedLectureState) {
      return
    }

    this.invalidatePlaybackGeneration()
    this.actionEngine.clearEffects()
    useCanvasStore.getState().setWhiteboardOpen(false)
    this.currentTopicState = 'closed'
    this.currentTrigger = null
    this.restoreSavedLectureState()
    this.setMode('idle')
  }

  /** 学生播放中发消息 → 打断讲课 → 保存位置 → 进入 live */
  handleUserInterrupt(text: string): void {
    this.invalidatePlaybackGeneration()
    if (this.mode === 'playing' || this.mode === 'paused') {
      // 保存讲课位置——actionIndex 已被 processNext 自增，减 1 以重播被打断的那句；
      // 若已有保存位置（live → paused → 新消息）则不覆盖。
      if (this.savedSceneIndex === null) {
        this.savedSceneIndex = this.sceneIndex
        this.savedActionIndex = Math.max(0, this.actionIndex - 1)
      }

      // 取消待执行的讨论卡片定时器
      if (this.triggerDelayTimer) {
        clearTimeout(this.triggerDelayTimer)
        this.triggerDelayTimer = null
      }
    }

    // 先改模式再停音频：speechSynthesis.cancel() 可能同步触发 onend，
    // processNext 会检查 mode === 'playing'，先改模式可防止多余的推进。
    this.currentTopicState = 'active'
    this.setMode('live')
    this.audioPlayer.stop()
    this.cancelBrowserTTS()
    this.callbacks.onUserInterrupt?.(text)
  }

  /** 是否所有剩余动作都已消费（无待播语音）；已消费的讨论不算剩余工作 */
  isExhausted(): boolean {
    let si = this.sceneIndex
    let ai = this.actionIndex
    while (si < this.scenes.length) {
      const actions = this.scenes[si].actions || []
      while (ai < actions.length) {
        const action = actions[ai]
        if (action.type === 'discussion' && this.consumedDiscussions.has(action.id)) {
          ai++
          continue
        }
        return false
      }
      si++
      ai = 0
    }
    return true
  }

  // ==================== 私有 ====================

  /** 使所有旧代次的异步回调失效，返回新代次号 */
  private invalidatePlaybackGeneration(): number {
    this.playbackGeneration += 1
    return this.playbackGeneration
  }

  /** 判断回调是否属于当前代次（旧代次的回调应被忽略） */
  private isCurrentGeneration(generation: number): boolean {
    return generation === this.playbackGeneration
  }

  /** 取消所有进行中的播放工作（音频/浏览器 TTS/定时器/特效） */
  private cancelActivePlaybackWork(): void {
    this.audioPlayer.stop()
    this.cancelBrowserTTS()
    this.actionEngine.clearEffects()
    useCanvasStore.getState().pauseVideo()

    if (this.triggerDelayTimer) {
      clearTimeout(this.triggerDelayTimer)
      this.triggerDelayTimer = null
    }
    if (this.speechTimer) {
      clearTimeout(this.speechTimer)
      this.speechTimer = null
    }
    this.speechTimerRemaining = 0
    this.callbacks.onProactiveHide?.()
  }

  /** 设置引擎模式并通知 UI（相同模式不重复通知） */
  private setMode(mode: EngineMode): void {
    if (this.mode === mode) return
    this.mode = mode
    this.callbacks.onModeChange?.(mode)
  }

  /** 恢复被讨论打断的讲课位置，并清除保存标记 */
  private restoreSavedLectureState(): void {
    if (this.savedSceneIndex !== null && this.savedActionIndex !== null) {
      this.sceneIndex = this.savedSceneIndex
      this.actionIndex = this.savedActionIndex
    }
    this.savedSceneIndex = null
    this.savedActionIndex = null
  }

  /**
   * 获取当前应执行的动作；场景 actions 耗尽时自动推进场景。
   * 无 actions 的场景产生一次合成停留拍（resolvePlaybackCursor 处理）。
   */
  private getCurrentAction(): { action: Action; sceneId: string } | null {
    const res = resolvePlaybackCursor(this.scenes, this.sceneIndex, this.actionIndex)
    if (!res) return null
    this.sceneIndex = res.sceneIndex
    this.actionIndex = res.actionIndex
    return { action: res.action, sceneId: res.sceneId }
  }

  /**
   * 核心处理循环：消费下一个动作。
   *
   * 执行前会先检查「是否仍在播放且属于当前代次」——暂停/停止/跳转都会使代次失效，
   * 从而丢弃迟到的异步回调。
   */
  private async processNext(generation: number = this.playbackGeneration): Promise<void> {
    if (this.mode !== 'playing' || !this.isCurrentGeneration(generation)) return

    // 场景边界：每进入一个新场景，清掉上一个场景的视觉特效并通知 UI 翻页
    if (this.actionIndex === 0 && this.sceneIndex < this.scenes.length) {
      const scene = this.scenes[this.sceneIndex]
      this.actionEngine.clearEffects()
      this.callbacks.onSceneChange?.(scene.id)
      this.callbacks.onSpeakerChange?.('teacher')
    }

    const current = this.getCurrentAction()
    if (!current) {
      if (!this.isCurrentGeneration(generation)) return
      // 全部场景播放完成
      this.invalidatePlaybackGeneration()
      this.actionEngine.clearEffects()
      this.setMode('idle')
      this.callbacks.onComplete?.()
      return
    }

    const { action } = current

    // 在推进游标【之前】先通知进度，快照指向当前动作；
    // 恢复时同一动作会被重播——这正是 speech 期望的行为（学生可能只听了一半）。
    this.callbacks.onProgress?.(this.getSnapshot())

    this.actionIndex++

    switch (action.type) {
      case 'speech': {
        const speechAction = action as SpeechAction
        // 通知 UI：这句台词开始（字幕亮起）
        this.callbacks.onSpeechStart?.(speechAction.text)

        // 音频播完 → processNext；若期间被暂停，resume() 会负责继续
        this.audioPlayer.onEnded(() => {
          if (!this.isCurrentGeneration(generation)) return
          this.callbacks.onSpeechEnd?.()
          if (this.mode === 'playing') {
            this.processNext(generation)
          }
        })

        // 无预生成音频（TTS 关闭）时，按文字长度估算「念完」所需时间（阅读计时）：
        // 估算规则（CJK 按字 / 英文按词、下限 2s、随倍速调整）统一放在
        // @/core/choreography，保证与（原项目）视频导出一致；暂停时取消，恢复时直接
        // processNext 继续。
        const scheduleReadingTimer = () => {
          if (!this.isCurrentGeneration(generation)) return
          const speed = this.callbacks.getPlaybackSpeed?.() ?? 1
          const readingMs = estimateSpeechDurationMs(speechAction.text, { speed })
          this.speechTimerStart = Date.now()
          this.speechTimerRemaining = readingMs
          this.speechTimer = setTimeout(() => {
            if (!this.isCurrentGeneration(generation)) return
            this.speechTimer = null
            this.speechTimerRemaining = 0
            this.callbacks.onSpeechEnd?.()
            if (this.mode === 'playing') this.processNext(generation)
          }, readingMs)
        }

        // 空文本台词（如空白页的种子台词、或用户清空后的台词）没有可合成的语音，
        // 直接走阅读计时短暂停留——Chrome 对空 SpeechSynthesisUtterance 不保证触发
        // onend，可能导致该页播放卡死。
        const hasText = !!speechAction.text.trim()

        this.audioPlayer
          .play(speechAction.audioId || '', speechAction.audioUrl)
          .then((audioStarted) => {
            if (!this.isCurrentGeneration(generation)) return
            if (!audioStarted) {
              // 没有预生成音频——仅当用户选择并启用了浏览器原生 TTS 时才用它兜底
              const settings = useSettingsStore.getState()
              if (
                hasText &&
                settings.ttsEnabled &&
                settings.ttsProviderId === 'browser-native-tts' &&
                isTTSProviderEnabled(
                  'browser-native-tts',
                  settings.ttsProvidersConfig?.['browser-native-tts'],
                ) &&
                typeof window !== 'undefined' &&
                window.speechSynthesis
              ) {
                this.playBrowserTTS(speechAction, generation)
              } else {
                scheduleReadingTimer()
              }
            }
          })
          .catch((err) => {
            if (!this.isCurrentGeneration(generation)) return
            log.error('TTS error:', err)
            scheduleReadingTimer()
          })
        break
      }

      case 'spotlight':
      case 'laser': {
        // 火速特效：交给 ActionEngine 立即执行，不阻塞
        this.actionEngine.execute(action)
        this.callbacks.onEffectFire?.({
          kind: action.type,
          targetId: action.elementId,
          ...(action.type === 'spotlight'
            ? { dimOpacity: action.dimOpacity }
            : { color: action.color }),
        } as Effect)
        // 不阻塞——立即继续下一条；用 queueMicrotask 避免大量连续
        // spotlight/laser 时深同步递归导致栈溢出
        queueMicrotask(() => {
          if (this.isCurrentGeneration(generation)) {
            this.processNext(generation)
          }
        })
        break
      }

      case 'discussion': {
        const discussionAction = action as DiscussionAction
        // 已消费过：跳过
        if (this.consumedDiscussions.has(discussionAction.id)) {
          this.processNext(generation)
          return
        }
        // 发起讨论的 agent 不在用户选中列表：跳过
        if (
          discussionAction.agentId &&
          this.callbacks.isAgentSelected &&
          !this.callbacks.isAgentSelected(discussionAction.agentId)
        ) {
          this.markDiscussionConsumed(discussionAction.id)
          this.processNext(generation)
          return
        }

        // 延迟 3 秒再显示讨论卡片：让前一句语音自然收尾
        const trigger: TriggerEvent = {
          id: discussionAction.id,
          question: discussionAction.topic,
          prompt: discussionAction.prompt,
          agentId: discussionAction.agentId,
        }

        this.triggerDelayTimer = setTimeout(() => {
          if (!this.isCurrentGeneration(generation)) return
          this.triggerDelayTimer = null
          if (this.mode !== 'playing') return // 用户暂停/停止则取消
          this.currentTrigger = trigger
          this.callbacks.onProactiveShow?.(trigger)
          // 引擎在此停下等待——由用户调用 confirmDiscussion() 或 skipDiscussion()
        }, DISCUSSION_TRIGGER_DELAY_MS)
        break
      }

      case 'play_video':
      case 'wb_open':
      case 'wb_draw_text':
      case 'wb_draw_shape':
      case 'wb_draw_chart':
      case 'wb_draw_latex':
      case 'wb_draw_table':
      case 'wb_draw_line':
      case 'wb_draw_code':
      case 'wb_edit_code':
      case 'wb_clear':
      case 'wb_delete':
      case 'wb_close':
      case 'widget_highlight':
      case 'widget_setState':
      case 'widget_annotation':
      case 'widget_reveal': {
        // 同步动作——等待执行完成再继续（本项目裁剪范围不含这些动作，
        // ActionEngine 对其 no-op，因此不会阻塞）
        await this.actionEngine.execute(action)
        if (!this.isCurrentGeneration(generation)) return
        if (this.mode === 'playing') {
          this.processNext(generation)
        }
        break
      }

      default:
        // 未知动作，跳过
        this.processNext(generation)
        break
    }
  }

  // ==================== 浏览器原生 TTS ====================

  /**
   * 把文本按句子切块，供顺序播放。
   * Chrome 存在 bug：超过约 15 秒的 utterance 会被静默截断且 onend 不触发，
   * 导致引擎卡住。按句切块可避开该问题。
   */
  private splitIntoChunks(text: string): string[] {
    // 按句末标点（中英文）与换行切分
    const chunks = text
      .split(/(?<=[.!?。！？\n])\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (chunks.length > 0) return chunks
    // 空白/纯空格文本 → 无块（playBrowserTTSChunk 干净收尾，
    // 避免朗读空 utterance 永不触发 onend）。否则文本没有句末标点——
    // 整段作为一块朗读。
    return text.trim() ? [text] : []
  }

  /**
   * 使用 Web Speech API（浏览器原生 TTS）朗读台词。
   * 按句切块以规避 Chrome 约 15 秒截断；暂停/恢复使用 cancel+重讲（Firefox 兼容）。
   */
  private playBrowserTTS(speechAction: SpeechAction, generation: number): void {
    if (!this.isCurrentGeneration(generation)) return
    this.browserTTSChunks = this.splitIntoChunks(speechAction.text)
    this.browserTTSChunkIndex = 0
    this.browserTTSPausedChunks = []
    this.browserTTSActive = true
    this.playBrowserTTSChunk(generation)
  }

  /** 朗读当前句块；完成后朗读下一块或收尾 */
  private async playBrowserTTSChunk(generation: number): Promise<void> {
    if (!this.isCurrentGeneration(generation)) return
    if (this.browserTTSChunkIndex >= this.browserTTSChunks.length) {
      // 所有句块朗读完毕
      this.browserTTSActive = false
      this.browserTTSChunks = []
      this.callbacks.onSpeechEnd?.()
      if (this.mode === 'playing') this.processNext(generation)
      return
    }

    const settings = useSettingsStore.getState()
    const chunkText = this.browserTTSChunks[this.browserTTSChunkIndex]
    const utterance = new SpeechSynthesisUtterance(chunkText)

    // 应用设置：语速 = 用户语速 × 播放倍速；音量随静音/音量设置
    const speed = this.callbacks.getPlaybackSpeed?.() ?? 1
    utterance.rate = (settings.ttsSpeed ?? 1) * speed
    utterance.volume = settings.ttsMuted ? 0 : (settings.ttsVolume ?? 1)

    // 确保语音列表已加载（Chrome 异步加载）
    const voices = await this.ensureVoicesLoaded()
    if (!this.isCurrentGeneration(generation)) return

    // 选择音色：优先用户配置的 voiceURI，否则按文本语言自动选择
    let voiceFound = false
    if (settings.ttsVoice && settings.ttsVoice !== 'default') {
      const voice = voices.find((v) => v.voiceURI === settings.ttsVoice)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
        voiceFound = true
      }
    }
    if (!voiceFound) {
      // 没有可用音色——按文本语言让浏览器自动选择合适音色
      const cjkRatio =
        chunkText.length > 0
          ? (chunkText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length / chunkText.length
          : 0
      utterance.lang = cjkRatio > CJK_LANG_THRESHOLD ? 'zh-CN' : 'en-US'
    }

    utterance.onend = () => {
      if (!this.isCurrentGeneration(generation)) return
      this.browserTTSChunkIndex++
      if (this.mode === 'playing') {
        this.playBrowserTTSChunk(generation) // 下一块
      }
    }

    utterance.onerror = (event) => {
      if (!this.isCurrentGeneration(generation)) return
      // 'canceled' 是 stop/pause 的正常结果，不是真错误
      if (event.error !== 'canceled') {
        log.warn('Browser TTS chunk error:', event.error)
        // 跳过失败句块，继续下一块
        this.browserTTSChunkIndex++
        if (this.mode === 'playing') {
          this.playBrowserTTSChunk(generation)
        }
      }
      // 'canceled'：不做处理——暂停处理已保存状态
    }

    // Chrome bug 规避：speak() 前先 cancel()，清除可能产生杂音/损坏输出的旧合成状态
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  /**
   * 等待 speechSynthesis 的语音列表加载（Chrome 异步加载）。
   * 结果缓存，后续调用立即返回。
   */
  private cachedVoices: SpeechSynthesisVoice[] | null = null
  private async ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
    if (this.cachedVoices && this.cachedVoices.length > 0) {
      return this.cachedVoices
    }

    let voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      this.cachedVoices = voices
      return voices
    }

    // Chrome：语音异步加载——等待 voiceschanged 事件
    await new Promise<void>((resolve) => {
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve()
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
      // 2 秒超时兜底，避免卡死
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve()
      }, 2000)
    })

    voices = window.speechSynthesis.getVoices()
    this.cachedVoices = voices
    return voices
  }

  /** 取消正在进行的浏览器原生 TTS */
  private cancelBrowserTTS(): void {
    if (this.browserTTSActive) {
      this.browserTTSActive = false
      this.browserTTSChunks = []
      this.browserTTSChunkIndex = 0
      this.browserTTSPausedChunks = []
      window.speechSynthesis?.cancel()
    }
  }
}
