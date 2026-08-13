/**
 * 文件头：StreamBuffer —— 实时流式文字的「统一节奏控制层」（打字机）
 *
 * 对应原项目：lib/buffer/stream-buffer.ts（照搬，注释已结合业务逻辑重写为中文）
 *
 * ── 它在整个业务里扮演什么角色 ──
 * 学生提问后，AI 老师的回答以 SSE 事件流到达（text_delta 一段段文字）。
 * 如果直接把文字贴到界面，会一次性全蹦出来，既没有"老师在打字"的观感，
 * 也无法和语音对齐。StreamBuffer 就是夹在「SSE 数据源」和「界面」之间的节奏器：
 *
 *   1. pushText：SSE 的文字增量先进队（同一句未封口就追加）；
 *   2. tick 循环：每 30ms 揭示 1 个字符（打字机效果），onTextReveal 通知界面；
 *   3. 封口（seal）：agent_end 到达 = 这句说完了，触发 onSegmentSealed
 *      —— 把「完整句子」交给 TTS 语音队列（语音只在文字写完后才开始合成）；
 *   4. 等语音（shouldHoldAfterReveal）：句子显示完后，若语音还在播就停住不动，
 *      直到该段音频播完（segmentDone 计数变化）才继续——实现"语音文字同步"；
 *   5. 动作/发言切换等非文本项按顺序穿插处理，保证"先显示文字、再执行动作"。
 *
 * 设计约束（与原项目一致）：
 *   - 唯一的节奏来源就是本文件的 tick 循环，界面不自己做打字机，避免双份速度；
 *   - pause() 是 O(1) 的，暂停只是让 tick 直接返回；
 *   - 动作只在 tick 游标到达它时触发（保证排在它前面的文字先显示完）。
 */
import type { DirectorState } from '#/types/chat';

// ─── 缓冲项类型 ───────────────────────────────────────────────

/** agent 开始发言（新气泡出现） */
export interface AgentStartItem {
  kind: 'agent_start';
  messageId: string;
  agentId: string;
  agentName: string;
  avatar?: string;
  color?: string;
}

/** agent 发言结束（封口信号的前置事件） */
export interface AgentEndItem {
  kind: 'agent_end';
  messageId: string;
  agentId: string;
}

/**
 * 文本项：一条可增长的文字。
 * text 随 SSE delta 追加；sealed=true 表示不会再追加（agent_end 到达）。
 */
export interface TextItem {
  kind: 'text';
  messageId: string;
  agentId: string;
  /** 本条文本的唯一 id（区分同一消息里的多段文字） */
  partId: string;
  /** 可增长——SSE 增量在这里追加 */
  text: string;
  /** 封口标记：true 后不再追加，tick 可在完全揭示后越过它 */
  sealed: boolean;
}

/** 动作项：到达时执行（如聚光），排在其前的文字先显示 */
export interface ActionItem {
  kind: 'action';
  messageId: string;
  actionId: string;
  actionName: string;
  params: Record<string, unknown>;
  agentId: string;
}

/** 思考项：导演/agent 加载中的提示 */
export interface ThinkingItem {
  kind: 'thinking';
  stage: string;
  agentId?: string;
}

/** 轮到用户发言 */
export interface CueUserItem {
  kind: 'cue_user';
  fromAgentId?: string;
  prompt?: string;
}

/** 本轮结束（含导演状态） */
export interface DoneItem {
  kind: 'done';
  totalActions: number;
  totalAgents: number;
  agentHadContent?: boolean;
  cueUserReceived?: boolean;
  sessionClosed?: boolean;
  endReason?: string;
  directorState?: DirectorState;
}

/** 错误项 */
export interface ErrorItem {
  kind: 'error';
  message: string;
}

/** 缓冲项联合类型 */
export type BufferItem =
  | AgentStartItem
  | AgentEndItem
  | TextItem
  | ActionItem
  | ThinkingItem
  | CueUserItem
  | DoneItem
  | ErrorItem;

// ─── 回调契约 ─────────────────────────────────────────────────

export interface StreamBufferCallbacks {
  onAgentStart: (data: AgentStartItem) => void;
  onAgentEnd: (data: AgentEndItem) => void;
  /**
   * 每 tick 文字揭示时触发。
   * @param messageId 消息 id
   * @param partId 本条文字部分 id（跨 tick 稳定）
   * @param revealedText 当前已显示的文字（全文的切片）
   * @param isComplete 是否已完整显示且已封口
   */
  onTextReveal: (messageId: string, partId: string, revealedText: string, isComplete: boolean) => void;
  /** tick 到达动作项时触发；调用方应执行动作效果并加徽标 */
  onActionReady: (messageId: string, data: ActionItem, signal: AbortSignal) => void | Promise<void>;
  /** 圆桌当前发言段（切动作/换 agent 时重置） */
  onLiveSpeech: (text: string | null, agentId: string | null) => void;
  /** 圆桌自动滚动的文字进度（charCursor / 总长） */
  onSpeechProgress: (ratio: number | null) => void;
  onThinking: (data: { stage: string; agentId?: string } | null) => void;
  onCueUser: (fromAgentId?: string, prompt?: string) => void;
  onDone: (data: {
    totalActions: number;
    totalAgents: number;
    agentHadContent?: boolean;
    cueUserReceived?: boolean;
    sessionClosed?: boolean;
    endReason?: string;
    directorState?: DirectorState;
  }) => void;
  onError: (message: string) => void;
  /**
   * 封口回调：某句文字完整后触发，把 fullText 交给语音系统（TTS 入队）。
   * 这是「语音等文字写完」的入口。
   */
  onSegmentSealed?: (messageId: string, partId: string, fullText: string, agentId: string | null) => void;
  /**
   * 文字完整显示且封口后调用；若返回 true（或 holding=true），tick 不前进——
   * 界面停在当前气泡等语音播完（「文字等语音播完」的出口）。
   */
  shouldHoldAfterReveal?: () => { holding: boolean; segmentDone: number } | boolean;
}

// ─── 选项 ─────────────────────────────────────────────────────

export interface StreamBufferOptions {
  /** tick 间隔（毫秒），默认 30 */
  tickMs?: number;
  /** 每 tick 揭示的字符数，默认 1（≈33 字符/秒） */
  charsPerTick?: number;
  /** 文字完整显示后、前进前固定停顿（毫秒），给读者呼吸空间。默认 0 */
  postTextDelayMs?: number;
  /** 动作触发后前进前的延迟（毫秒），给动画留时间。默认 0 */
  actionDelayMs?: number;
}

// ─── StreamBuffer 类 ──────────────────────────────────────────

export class StreamBuffer {
  // 队列
  private items: BufferItem[] = [];
  private readIndex = 0;
  private charCursor = 0;

  // 圆桌当前段跟踪
  private currentSegmentText = '';
  private currentAgentId: string | null = null;

  // 控制
  private _paused = false;
  private _disposed = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  // 停留 / 延迟计数（以 tick 为单位）
  private _dwellTicksRemaining = 0;
  /** 文字显示完后是否正在等 TTS 语音播完 */
  private _holdingForTTS = false;
  private _holdSegmentSnapshot = -1;
  /** 阻塞队列前进直到当前动作效果完成 */
  private _actionCompletion: Promise<void> | null = null;
  private _flushing = false;
  private _flushPromise: Promise<void> | null = null;
  private readonly lifecycleAbortController = new AbortController();

  // 配置
  private readonly tickMs: number;
  private readonly charsPerTick: number;
  private readonly postTextDelayTicks: number;
  private readonly actionDelayTicks: number;
  private readonly cb: StreamBufferCallbacks;
  private partCounter = 0;
  private _drained = false;
  private _drainResolve: (() => void) | null = null;
  private _drainReject: ((err: Error) => void) | null = null;

  constructor(callbacks: StreamBufferCallbacks, options?: StreamBufferOptions) {
    this.cb = callbacks;
    this.tickMs = options?.tickMs ?? 30;
    this.charsPerTick = options?.charsPerTick ?? 1;
    this.postTextDelayTicks = Math.ceil((options?.postTextDelayMs ?? 0) / this.tickMs);
    this.actionDelayTicks = Math.ceil((options?.actionDelayMs ?? 0) / this.tickMs);
  }

  // ─── 入队方法 ────────────────────────────────────────────────

  /** agent 开始发言：先把上一句未封口的文字封口，再入队新发言项 */
  pushAgentStart(data: Omit<AgentStartItem, 'kind'>): void {
    if (this._disposed) return;
    this.sealLastText();
    this.items.push({ kind: 'agent_start', ...data });
  }

  /** agent 发言结束：封口当前文字并入队结束项 */
  pushAgentEnd(data: Omit<AgentEndItem, 'kind'>): void {
    if (this._disposed) return;
    this.sealLastText();
    this.items.push({ kind: 'agent_end', ...data });
  }

  /**
   * 追加文字增量：同一消息的未封口文本项直接拼上去；
   * 否则新建一个文本项（如切换了消息）。
   */
  pushText(messageId: string, delta: string, agentId?: string): void {
    if (this._disposed) return;
    const last = this.items[this.items.length - 1];
    if (last && last.kind === 'text' && last.messageId === messageId && !last.sealed) {
      last.text += delta;
    } else {
      this.items.push({
        kind: 'text',
        messageId,
        agentId: agentId ?? this.currentAgentId ?? '',
        partId: `p${this.partCounter++}`,
        text: delta,
        sealed: false,
      });
    }
  }

  /** 标记当前文本项为「完整」（不再追加） */
  sealText(messageId: string): void {
    if (this._disposed) return;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.kind === 'text' && item.messageId === messageId && !item.sealed) {
        item.sealed = true;
        break;
      }
    }
  }

  /** 入队动作项：先封口当前文字，保证动作排在文字之后 */
  pushAction(data: Omit<ActionItem, 'kind'>): void {
    if (this._disposed) return;
    this.sealLastText();
    this.items.push({ kind: 'action', ...data });
  }

  pushThinking(data: { stage: string; agentId?: string }): void {
    if (this._disposed) return;
    this.items.push({ kind: 'thinking', ...data });
  }

  pushCueUser(data: { fromAgentId?: string; prompt?: string }): void {
    if (this._disposed) return;
    this.items.push({ kind: 'cue_user', ...data });
  }

  pushDone(data: {
    totalActions: number;
    totalAgents: number;
    agentHadContent?: boolean;
    cueUserReceived?: boolean;
    sessionClosed?: boolean;
    endReason?: string;
    directorState?: DirectorState;
  }): void {
    if (this._disposed) return;
    this.sealLastText();
    this.items.push({ kind: 'done', ...data });
  }

  pushError(message: string): void {
    if (this._disposed) return;
    this.items.push({ kind: 'error', message });
  }

  // ─── 控制 ─────────────────────────────────────────────────────

  /** 启动 tick 循环（幂等：重复调用安全） */
  start(): void {
    if (this._disposed || this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  /** 立即暂停：tick 变为空操作（O(1)） */
  pause(): void {
    this._paused = true;
  }

  /** 从暂停处继续 */
  resume(): void {
    this._paused = false;
  }

  /**
   * 返回一个 Promise：所有项（含最后的 done）处理完时 resolve。
   * 暂停期间不会 resolve（设计如此——暂停冻结一切前进，恢复后才继续）。
   */
  waitUntilDrained(): Promise<void> {
    if (this._drained) {
      return Promise.resolve();
    }
    if (this._disposed) {
      return Promise.reject(new Error('Buffer already disposed'));
    }
    return new Promise<void>((resolve, reject) => {
      this._drainResolve = resolve;
      this._drainReject = reject;
    });
  }

  get paused(): boolean {
    return this._paused;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  /** 等当前动作的效果完成（用于「先文字后动作」的次序保证） */
  waitForCurrentAction(): Promise<void> {
    return this._actionCompletion ?? Promise.resolve();
  }

  /** 立即揭示所有剩余内容（恢复持久化会话/强制完成时用） */
  flush(): Promise<void> {
    if (this._disposed) return Promise.resolve();
    if (this._flushPromise) return this._flushPromise;

    const flushPromise = this.flushRemaining().finally(() => {
      if (this._flushPromise === flushPromise) {
        this._flushPromise = null;
      }
    });
    this._flushPromise = flushPromise;
    return flushPromise;
  }

  /** 强制完成：跳过打字机逐字揭示，直接一次性揭示全部剩余项 */
  private async flushRemaining(): Promise<void> {
    this._flushing = true;
    try {
      await this._actionCompletion;
      if (this._disposed) return;
      while (this.readIndex < this.items.length) {
        if (this._disposed) return;
        const item = this.items[this.readIndex];
        switch (item.kind) {
          case 'text':
            this.cb.onTextReveal(item.messageId, item.partId, item.text, true);
            if (this._disposed) return;
            this.currentSegmentText = item.text;
            this.cb.onLiveSpeech(this.currentSegmentText, this.currentAgentId);
            if (this._disposed) return;
            this.cb.onSpeechProgress(1);
            break;
          case 'action':
            this.currentSegmentText = '';
            await this.trackAction(item);
            if (this._disposed) return;
            this.cb.onLiveSpeech(null, this.currentAgentId);
            break;
          case 'agent_start':
            this.currentAgentId = item.agentId;
            this.currentSegmentText = '';
            this.cb.onThinking(null); // 已选中 agent——清除思考指示
            if (this._disposed) return;
            this.cb.onAgentStart(item);
            if (this._disposed) return;
            this.cb.onLiveSpeech(null, item.agentId);
            break;
          case 'agent_end':
            this.cb.onAgentEnd(item);
            break;
          case 'thinking':
            this.cb.onThinking(item);
            break;
          case 'cue_user':
            this.cb.onCueUser(item.fromAgentId, item.prompt);
            break;
          case 'done':
            this.cb.onLiveSpeech(null, null);
            if (this._disposed) return;
            this.cb.onSpeechProgress(null);
            if (this._disposed) return;
            this.cb.onThinking(null);
            if (this._disposed) return;
            this.cb.onDone(item);
            this.resolveDrain();
            break;
          case 'error':
            this.cb.onError(item.message);
            break;
        }
        this.readIndex++;
        this.charCursor = 0;
      }
    } finally {
      this._flushing = false;
    }
  }

  /** 停止 tick 循环并释放资源；dispose 会发最终 onLiveSpeech(null) */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.lifecycleAbortController.abort();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // 拒绝仍在等待 drain 的 Promise
    this._drainReject?.(new Error('Buffer disposed'));
    this._drainResolve = null;
    this._drainReject = null;
    // 最终清理信号
    this.cb.onLiveSpeech(null, null);
    this.cb.onSpeechProgress(null);
  }

  /**
   * 停止 tick 循环并标记已释放，但**不**触发最终 onLiveSpeech。
   * 用于替换缓冲（软暂停后恢复），避免过期微任务清掉圆桌状态。
   */
  shutdown(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.lifecycleAbortController.abort();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // 拒绝仍在等待 drain 的 Promise
    this._drainReject?.(new Error('Buffer shutdown'));
    this._drainResolve = null;
    this._drainReject = null;
  }

  // ─── 内部 ───────────────────────────────────────────────────

  /**
   * 封口最后一个未封口的文本项。
   * 调用时机约定：在 pushAgentEnd/pushAgentStart 之前调用，
   * 此时 currentAgentId 仍指向正要封口文字的 agent——保证封口回调能拿到正确的发言者。
   */
  private sealLastText(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.kind === 'text' && !item.sealed) {
        item.sealed = true;
        this.cb.onSegmentSealed?.(item.messageId, item.partId, item.text, this.currentAgentId);
        break;
      }
      // 遇到非文本项就停止搜索（封口只针对队列末尾的连续文本）
      if (item.kind !== 'text') break;
    }
  }

  private resolveDrain(): void {
    this._drained = true;
    this._drainResolve?.();
    this._drainResolve = null;
    this._drainReject = null;
  }

  /**
   * tick 主循环：推进打字机游标。
   *
   * 优先级：
   *   1. 暂停/释放/冲刷中 → 直接返回；
   *   2. 停留倒计时（postTextDelay）→ 递减；
   *   3. 正在等语音（_holdingForTTS）→ 询问 shouldHoldAfterReveal：
   *      语音还在播就原地等待；某段音频播完（segmentDone 变化）才放行；
   *   4. 处理当前项：文本逐字揭示 / 非文本立即处理。
   */
  private tick(): void {
    if (this._paused || this._disposed || this._flushing) return;

    // 处理停留 / 动作延迟倒计时
    if (this._dwellTicksRemaining > 0) {
      this._dwellTicksRemaining--;
      if (this._dwellTicksRemaining === 0 && this._holdingForTTS) {
        // 文字后停顿刚结束——落到下面的 TTS 等待检查
      } else {
        return;
      }
    }

    if (this._actionCompletion) return;

    // 等语音：文字显示完后，界面停在当前气泡直到该段音频播完
    if (this._holdingForTTS) {
      const result = this.cb.shouldHoldAfterReveal?.();
      if (result) {
        if (typeof result === 'object') {
          if (!result.holding) {
            // 语音队列已空——放行
            this._holdingForTTS = false;
            this._holdSegmentSnapshot = -1;
            this.advanceNonText();
            return;
          }
          if (result.segmentDone !== this._holdSegmentSnapshot) {
            // 刚才那段音频刚播完——即使下一段马上开始也放行
            this._holdingForTTS = false;
            this._holdSegmentSnapshot = -1;
            this.advanceNonText();
            return;
          }
          return; // 同一段还在播——停在当前项
        }
        // 布尔形式（旧版兼容）：为 true 就一直等
        return;
      }
      this._holdingForTTS = false;
      this._holdSegmentSnapshot = -1;
      // 语音已完成——继续处理下一项
      this.advanceNonText();
      return;
    }

    const item = this.items[this.readIndex];
    if (!item) return; // 队列为空或已追上——等待

    switch (item.kind) {
      case 'text': {
        // 推进字符游标并揭示
        this.charCursor = Math.min(this.charCursor + this.charsPerTick, item.text.length);
        const revealed = item.text.slice(0, this.charCursor);
        const fullyRevealed = this.charCursor >= item.text.length;
        const isComplete = fullyRevealed && item.sealed;

        // 更新聊天区
        this.cb.onTextReveal(item.messageId, item.partId, revealed, isComplete);

        // 更新圆桌（只显示当前段）。
        // 用 this.currentAgentId（tick 处理 agent_start 时设置）而非 item.agentId——
        // 推送与 tick 存在竞态：SSE 推送可能快于 tick，item.agentId 可能带着上一轮
        // agent 的过期值。
        this.currentSegmentText = revealed;
        this.cb.onLiveSpeech(this.currentSegmentText, this.currentAgentId);
        this.cb.onSpeechProgress(item.text.length > 0 ? this.charCursor / item.text.length : 1);

        // 已完整显示且封口 → 前进
        if (isComplete) {
          this.readIndex++;
          this.charCursor = 0;

          // 文字结束后固定停顿：给读者呼吸空间，再处理下一个动作/发言
          if (this.postTextDelayTicks > 0) {
            this._dwellTicksRemaining = this.postTextDelayTicks;
            // 若配置了等语音回调，标记需要在停顿后检查
            if (this.cb.shouldHoldAfterReveal) {
              this._holdingForTTS = true;
              const snap = this.cb.shouldHoldAfterReveal();
              this._holdSegmentSnapshot = typeof snap === 'object' ? snap.segmentDone : -1;
            }
            return; // 下一 tick 先倒计时，再 advanceNonText
          }

          // 无文字后停顿——立即检查等语音
          {
            const result = this.cb.shouldHoldAfterReveal?.();
            if (result) {
              this._holdingForTTS = true;
              this._holdSegmentSnapshot = typeof result === 'object' ? result.segmentDone : -1;
              return; // 语音还在播——停在这里
            }
          }

          // 同一 tick 内继续处理可直接前进的项（如文字后面的动作徽标）
          this.advanceNonText();
        }
        // 已完全显示但未封口：等待更多 SSE 增量
        break;
      }

      // 非文本项立即处理
      case 'agent_start':
        this.currentAgentId = item.agentId;
        this.currentSegmentText = '';
        this.cb.onThinking(null); // 已选中 agent——清除思考指示
        this.cb.onAgentStart(item);
        this.cb.onLiveSpeech(null, item.agentId);
        this.readIndex++;
        this.charCursor = 0;
        this.advanceNonText();
        break;

      case 'agent_end':
        this.cb.onAgentEnd(item);
        this.readIndex++;
        this.charCursor = 0;
        this.advanceNonText();
        break;

      case 'action':
        this.startAction(item);
        break;

      case 'thinking':
        this.cb.onThinking(item);
        this.readIndex++;
        this.charCursor = 0;
        this.advanceNonText();
        break;

      case 'cue_user':
        this.cb.onCueUser(item.fromAgentId, item.prompt);
        this.readIndex++;
        this.charCursor = 0;
        this.advanceNonText();
        break;

      case 'done':
        this.cb.onLiveSpeech(null, null);
        this.cb.onSpeechProgress(null);
        this.cb.onThinking(null);
        this.cb.onDone(item);
        this.readIndex++;
        this.charCursor = 0;
        // 停止定时器——后面没有可处理的了
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.resolveDrain();
        break;

      case 'error':
        this.cb.onError(item.message);
        this.readIndex++;
        this.charCursor = 0;
        this.advanceNonText();
        break;
    }
  }

  /**
   * 处理完一个非文本项后，在同一 tick 内继续越过连续的非文本项。
   * 遇到文本项即停（交给下一 tick 做逐字揭示，避免跳过打字机效果）；
   * 遇到动作项则启动它（可能带延迟动画）并返回。
   */
  private advanceNonText(): void {
    while (this.readIndex < this.items.length) {
      const next = this.items[this.readIndex];
      if (next.kind === 'text') break; // 交给下一 tick 处理文本

      switch (next.kind) {
        case 'agent_start':
          this.currentAgentId = next.agentId;
          this.currentSegmentText = '';
          this.cb.onThinking(null); // 已选中 agent——清除思考指示
          this.cb.onAgentStart(next);
          this.cb.onLiveSpeech(null, next.agentId);
          break;
        case 'agent_end':
          this.cb.onAgentEnd(next);
          break;
        case 'action':
          this.startAction(next);
          return;
        case 'thinking':
          this.cb.onThinking(next);
          break;
        case 'cue_user':
          this.cb.onCueUser(next.fromAgentId, next.prompt);
          break;
        case 'done':
          this.cb.onLiveSpeech(null, null);
          this.cb.onSpeechProgress(null);
          this.cb.onThinking(null);
          this.cb.onDone(next);
          this.readIndex++;
          this.charCursor = 0;
          if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
          }
          this.resolveDrain();
          return; // done——停止前进
        case 'error':
          this.cb.onError(next.message);
          break;
      }
      this.readIndex++;
      this.charCursor = 0;
    }
  }

  /** 启动一个动作项：清空圆桌当前段、推进游标、进入动作延迟倒计时，并执行动作 */
  private startAction(item: ActionItem): void {
    this.currentSegmentText = '';
    this.cb.onLiveSpeech(null, this.currentAgentId);
    this.readIndex++;
    this.charCursor = 0;
    this._dwellTicksRemaining = this.actionDelayTicks;

    void this.trackAction(item);
  }

  /** 执行动作并跟踪其完成 Promise（失败不阻塞队列，转为 onError 通知） */
  private trackAction(item: ActionItem): Promise<void> {
    let completion: Promise<void>;
    try {
      completion = Promise.resolve(this.cb.onActionReady(item.messageId, item, this.lifecycleAbortController.signal));
    } catch (error) {
      this.reportActionError(item, error);
      completion = Promise.resolve();
    }

    const trackedCompletion = completion
      .catch((error) => this.reportActionError(item, error))
      .finally(() => {
        if (this._actionCompletion === trackedCompletion) {
          this._actionCompletion = null;
        }
      });
    this._actionCompletion = trackedCompletion;
    return trackedCompletion;
  }

  /** 动作执行失败的统一上报 */
  private reportActionError(item: ActionItem, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.cb.onError(`Action ${item.actionName} failed: ${message}`);
  }
}
