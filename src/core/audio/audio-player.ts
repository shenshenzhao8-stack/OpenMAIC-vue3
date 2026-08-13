/**
 * 文件头：AudioPlayer（音频播放器，简化版）
 *
 * 对应原项目：lib/utils/audio-player.ts
 *
 * 功能：HTMLAudioElement 的封装，供播放引擎（speech 动作）与 TTS 队列使用。
 *   - play(audioId, audioUrl)：优先播放 audioUrl（服务器/mock 返回的音频地址）；
 *     无 URL 时从本地音频缓存（内存 Map）按 audioId 查找；
 *   - onEnded(cb)：注册「播放结束」回调（引擎据此走下一步）；
 *   - 支持暂停/恢复/停止/倍速/音量/静音；
 *   - requestToken 令牌机制：防止上一次播放的结束事件干扰新播放。
 *
 * 与原项目的差异（裁剪说明）：
 *   原项目用 Dexie/IndexedDB 缓存客户端生成的 TTS（db.audioFiles.get(audioId)）；
 *   本项目 mock 阶段音频直接走 URL，本地缓存先用内存 Map 简化，
 *   将来接真实 TTS 或需要跨页面缓存时可替换为 IndexedDB。
 */
export interface AudioPlayer {
  play: (audioId: string, audioUrl?: string) => Promise<boolean>;
  pause: () => void;
  stop: () => void;
  resume: () => void;
  isPlaying: () => boolean;
  hasActiveAudio: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  onEnded: (callback: () => void) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
  /** 写入本地音频缓存（mock/客户端 TTS 使用） */
  cacheAudio: (audioId: string, blob: Blob) => void;
}

/** 本地音频缓存：audioId → Blob（简化版，替代原项目的 IndexedDB） */
const localAudioCache = new Map<string, Blob>();

/**
 * 清空本地音频缓存（MONOREPO Phase 4：组件卸载/课程切换时调用）。
 * 单实例约束下直接整表清空；若未来支持多实例，改为按课堂 id 分桶。
 */
export function clearLocalAudioCache(): void {
  localAudioCache.clear();
}

/** AudioPlayer 实现（见文件头功能说明） */
export class BrowserAudioPlayer implements AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onEndedCallback: (() => void) | null = null;
  private muted = false;
  private volume = 1;
  private playbackRate = 1;
  /** 播放令牌：每次 play/pause/stop 自增，旧播放的异步回调据此失效 */
  private requestToken = 0;
  /** 当前活动 Blob URL（cacheAudio 分支创建，停止时需回收） */
  private activeBlobUrl: string | null = null;

  /** 停止并释放当前音频元素 */
  private stopAudioElement(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    // 回收活动 Blob URL，防止 stop/销毁后泄漏
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }
  }

  /** 把 Blob 写入本地缓存 */
  cacheAudio(audioId: string, blob: Blob): void {
    localAudioCache.set(audioId, blob);
  }

  /**
   * 播放音频。
   * @returns true=已开始播放；false=没有可用音频（返回后由引擎走阅读计时兜底）
   */
  async play(audioId: string, audioUrl?: string): Promise<boolean> {
    const requestToken = ++this.requestToken;
    try {
      // 1. 优先播放显式 URL（服务器/mock 生成）
      if (audioUrl) {
        this.stopAudioElement();
        if (requestToken !== this.requestToken) return false;
        this.audio = new Audio();
        this.audio.src = audioUrl;
        this.audio.volume = this.muted ? 0 : this.volume;
        this.audio.defaultPlaybackRate = this.playbackRate;
        this.audio.playbackRate = this.playbackRate;
        this.audio.addEventListener('ended', () => {
          this.onEndedCallback?.();
        });
        await this.audio.play();
        return true;
      }

      // 2. 回退到本地缓存（简化版替代原项目 IndexedDB）
      const blob = localAudioCache.get(audioId);
      if (!blob) return false;
      this.stopAudioElement();
      if (requestToken !== this.requestToken) return false;
      const blobUrl = URL.createObjectURL(blob);
      this.activeBlobUrl = blobUrl;
      this.audio = new Audio();
      this.audio.src = blobUrl;
      this.audio.volume = this.muted ? 0 : this.volume;
      this.audio.playbackRate = this.playbackRate;
      this.audio.addEventListener('ended', () => {
        this.activeBlobUrl = null;
        URL.revokeObjectURL(blobUrl);
        this.onEndedCallback?.();
      });
      try {
        await this.audio.play();
      } catch (playError) {
        this.activeBlobUrl = null;
        URL.revokeObjectURL(blobUrl);
        throw playError;
      }
      return true;
    } catch (error) {
      console.error('[AudioPlayer] 播放失败:', error);
      throw error;
    }
  }

  /** 暂停播放（令牌自增使旧回调失效） */
  pause(): void {
    this.requestToken += 1;
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /** 停止播放并回到开头 */
  stop(): void {
    this.requestToken += 1;
    this.stopAudioElement();
  }

  /** 恢复播放（暂停状态下） */
  resume(): void {
    if (this.audio?.paused) {
      this.audio.playbackRate = this.playbackRate;
      this.audio.play().catch((error) => {
        console.error('[AudioPlayer] 恢复播放失败:', error);
      });
    }
  }

  /** 是否正在播放（未暂停且有音频元素） */
  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  /** 是否存在活动音频（播放中或已暂停，但未结束） */
  hasActiveAudio(): boolean {
    return this.audio !== null;
  }

  /** 当前播放进度（毫秒） */
  getCurrentTime(): number {
    return this.audio ? this.audio.currentTime * 1000 : 0;
  }

  /** 音频总时长（毫秒） */
  getDuration(): number {
    return this.audio && !Number.isNaN(this.audio.duration) ? this.audio.duration * 1000 : 0;
  }

  /** 注册播放结束回调（引擎据此 processNext） */
  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  /** 设置静音（立即作用于当前音频） */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
  }

  /** 设置音量（0-1） */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.muted) {
      this.audio.volume = this.volume;
    }
  }

  /** 设置倍速（0.5-2） */
  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2, rate));
    if (this.audio) {
      this.audio.playbackRate = this.playbackRate;
    }
  }

  /** 销毁：停止播放并清空回调 */
  destroy(): void {
    this.stop();
    this.onEndedCallback = null;
  }
}

/** 创建音频播放器实例（与引擎/界面解耦的工厂函数） */
export function createAudioPlayer(): AudioPlayer {
  return new BrowserAudioPlayer();
}
