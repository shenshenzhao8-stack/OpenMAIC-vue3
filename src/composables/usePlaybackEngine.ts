/**
 * 文件头：播放引擎接线（composable）
 *
 * 对应原项目：components/edit/PlaybackChromeRoot.tsx（创建引擎并接回调）
 *
 * 功能（Phase 7/8）：
 *   - ★ 按当前场景播放（[currentScene]，问题 2 修复）；切场景重建引擎；
 *   - 字幕逐字：StreamBuffer 打字机；
 *   - 语音：AudioPlayer 播后台音频（mock 提供 mp3），无音频时朗读计时/浏览器 TTS 兜底；
 *   - 倍速：下拉框 → settings → AudioPlayer 实时同步；
 *   - 互动（Phase 8）：interrupt(text) 打断讲课进入 live；endDiscussion() 恢复讲课；
 *     play() 在讨论结束恢复位置时走 continuePlayback（而非从头）。
 *   - 进度（Phase 9，T-19 补回）：onProgress → currentActionIndex；jumpToAction /
 *     canJumpToAction 暴露给讲义视图与进度条（对齐原项目 PlaybackChromeRoot 的
 *     handleJumpToAction）。
 */
import { computed, onBeforeUnmount, readonly, ref, watch } from 'vue';

import { ActionEngine } from '#/core/action/engine';
import type { AudioPlayer } from '#/core/audio/audio-player';
import { createAudioPlayer } from '#/core/audio/audio-player';
import { StreamBuffer } from '#/core/buffer/stream-buffer';
import { PlaybackEngine } from '#/core/playback/engine';
import type { EngineMode } from '#/core/playback/types';
import { useSettingsStore } from '#/stores/settings';
import { useStageStore } from '#/stores/stage';
import { getAdjacentSceneId, getSceneForPlayback } from '#/utils/playback-navigation';

export function usePlaybackEngine() {
  const stageStore = useStageStore();
  const settingsStore = useSettingsStore();

  const mode = ref<EngineMode>('idle');
  const lectureSpeech = ref<string | null>(null);
  /** 当前场景内动作游标（onProgress 驱动，进度条/讲义高亮用） */
  const currentActionIndex = ref<number | null>(null);
  /** 当前场景动作总数（进度条分母） */
  const totalActions = computed(() => stageStore.currentScene?.actions?.length ?? 0);

  let audioPlayer: AudioPlayer | null = null;
  let engine: PlaybackEngine | null = null;
  let subtitleBuffer: StreamBuffer | null = null;
  let speechCounter = 0;
  let engineSceneId: string | null = null;
  /**
   * 是否待恢复「被打断的讲课位置」（讨论结束后 → 用户点播放 → continuePlayback）。
   * 必须在 handleEndDiscussion() 之前读取并缓存：该调用会恢复位置并清空引擎的
   * savedSceneIndex/savedActionIndex（对齐原项目 PlaybackChromeRoot 的
   * handleSessionStop：hadLectureInterruption MUST be read before doSessionCleanup）。
   */
  let pendingLectureResume = false;

  /** 直播/讨论中（用于 UI 显示「继续讲课」） */
  const isLive = computed(() => mode.value === 'live');

  function teardownEngine() {
    engine?.stop();
    engine = null;
    engineSceneId = null;
    pendingLectureResume = false;
    subtitleBuffer?.dispose();
    subtitleBuffer = null;
    audioPlayer?.destroy();
    audioPlayer = null;
    speechCounter = 0;
    lectureSpeech.value = null;
    currentActionIndex.value = null;
    mode.value = 'idle';
  }

  /** 创建字幕打字机（逐字揭示）；跳转/重建引擎时调用，保证旧打字机任务被替换 */
  function createSubtitleBuffer(): StreamBuffer {
    const buffer = new StreamBuffer(
      {
        onTextReveal: (_messageId, _partId, revealedText) => {
          lectureSpeech.value = revealedText;
        },
        onAgentStart: () => {},
        onAgentEnd: () => {},
        onActionReady: () => Promise.resolve(),
        onLiveSpeech: () => {},
        onSpeechProgress: () => {},
        onThinking: () => {},
        onCueUser: () => {},
        onDone: () => {},
        onError: () => {},
      },
      { tickMs: 30, charsPerTick: 1 },
    );
    buffer.start();
    return buffer;
  }

  function buildEngine(): PlaybackEngine | null {
    const scene = stageStore.currentScene;
    if (!scene) return null;
    engineSceneId = stageStore.currentSceneId;

    audioPlayer = createAudioPlayer();
    audioPlayer.setPlaybackRate(settingsStore.playbackSpeed);

    subtitleBuffer = createSubtitleBuffer();

    const actionEngine = new ActionEngine(audioPlayer);
    engine = new PlaybackEngine(
      getSceneForPlayback(stageStore.scenes, stageStore.currentSceneId),
      actionEngine,
      audioPlayer,
      {
        onModeChange: (next) => {
          mode.value = next;
        },
        // 播放进度 → 响应式游标（进度条/讲义高亮；T-19 补回）
        onProgress: (snapshot) => {
          currentActionIndex.value = snapshot.actionIndex;
        },
        onSpeechStart: (text) => {
          speechCounter += 1;
          const id = `lecture-${speechCounter}`;
          subtitleBuffer?.pushText(id, text, 'default-1');
          subtitleBuffer?.sealText(id);
        },
        onSpeechEnd: () => {},
        getPlaybackSpeed: () => settingsStore.playbackSpeed,
        isAgentSelected: () => true,
      },
    );
    return engine;
  }

  function ensureEngine(): PlaybackEngine | null {
    if (engine && engineSceneId === stageStore.currentSceneId) return engine;
    teardownEngine();
    return buildEngine();
  }

  watch(
    () => stageStore.currentSceneId,
    () => {
      teardownEngine();
    },
  );

  watch(
    () => settingsStore.playbackSpeed,
    (rate) => {
      audioPlayer?.setPlaybackRate(rate);
    },
  );

  /** 播放当前场景；若刚从讨论恢复（保存了讲课位置）则 continuePlayback 而非从头 */
  function play() {
    const e = ensureEngine();
    if (!e) return;
    // 讨论结束后：从恢复位置续播（而非从头）；续播后清除标志
    if (pendingLectureResume) {
      pendingLectureResume = false;
      e.continuePlayback();
    } else {
      e.start();
    }
  }

  function pause() {
    engine?.pause();
  }

  function resume() {
    engine?.resume();
  }

  function stop() {
    engine?.stop();
    lectureSpeech.value = null;
    currentActionIndex.value = null;
  }

  /** 目标动作是否可跳转（live 讨论中禁止；由引擎 canJumpToAction 判定） */
  function canJumpToAction(actionIndex: number): boolean {
    return engine?.canJumpToAction(actionIndex) ?? false;
  }

  /**
   * 跳转到当前场景的指定动作（讲义视图/进度条点击）。
   * 对齐原项目 handleJumpToAction：先 dispose 旧打字机并重建（停止旧字幕逐字任务），
   * 再把跳转目标的 speech 文本直接填入字幕；引擎内部会静默重放目标之前的白板动作。
   */
  async function jumpToAction(actionIndex: number): Promise<boolean> {
    const e = ensureEngine();
    if (!e) return false;
    const autoplay = mode.value === 'playing';
    const ok = await e.jumpToAction(actionIndex, { autoplay });
    if (!ok) return false;
    currentActionIndex.value = actionIndex;
    // 替换打字机：跳转后旧字幕任务作废，避免继续向新位置推字
    subtitleBuffer?.dispose();
    subtitleBuffer = createSubtitleBuffer();
    const action = stageStore.currentScene?.actions?.[actionIndex];
    if (action?.type === 'speech') {
      lectureSpeech.value = action.text;
    } else {
      lectureSpeech.value = null;
    }
    return true;
  }

  /** 学生提问：打断讲课 → 进入 live（保存位置，讨论结束后恢复） */
  function interrupt(text: string) {
    engine?.handleUserInterrupt(text);
  }

  /** 讨论结束：恢复讲课位置 → idle（用户点「播放」后 continuePlayback） */
  function endDiscussion() {
    // 先读取打断标志：handleEndDiscussion 会恢复并清空引擎保存的位置
    pendingLectureResume = engine?.hasLectureInterruption() ?? false;
    engine?.handleEndDiscussion();
  }

  function nextScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, 1);
    if (id) stageStore.setCurrentSceneId(id);
  }

  function prevScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, -1);
    if (id) stageStore.setCurrentSceneId(id);
  }

  onBeforeUnmount(() => {
    teardownEngine();
  });

  return {
    mode: readonly(mode),
    lectureSpeech: readonly(lectureSpeech),
    currentActionIndex: readonly(currentActionIndex),
    totalActions: readonly(totalActions),
    isLive,
    play,
    pause,
    resume,
    stop,
    jumpToAction,
    canJumpToAction,
    interrupt,
    endDiscussion,
    nextScene,
    prevScene,
  };
}
