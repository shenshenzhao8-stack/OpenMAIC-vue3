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
 */
import { ref, readonly, computed, watch, onBeforeUnmount } from 'vue'
import { useStageStore } from '@/stores/stage'
import { useSettingsStore } from '@/stores/settings'
import { PlaybackEngine } from '@/core/playback/engine'
import { ActionEngine } from '@/core/action/engine'
import { createAudioPlayer, type AudioPlayer } from '@/core/audio/audio-player'
import { StreamBuffer } from '@/core/buffer/stream-buffer'
import { getAdjacentSceneId, getSceneForPlayback } from '@/utils/playback-navigation'
import type { EngineMode } from '@/core/playback/types'

export function usePlaybackEngine() {
  const stageStore = useStageStore()
  const settingsStore = useSettingsStore()

  const mode = ref<EngineMode>('idle')
  const lectureSpeech = ref<string | null>(null)

  let audioPlayer: AudioPlayer | null = null
  let engine: PlaybackEngine | null = null
  let subtitleBuffer: StreamBuffer | null = null
  let speechCounter = 0
  let engineSceneId: string | null = null

  /** 直播/讨论中（用于 UI 显示「继续讲课」） */
  const isLive = computed(() => mode.value === 'live')

  function teardownEngine() {
    engine?.stop()
    engine = null
    engineSceneId = null
    subtitleBuffer?.dispose()
    subtitleBuffer = null
    audioPlayer?.destroy()
    audioPlayer = null
    speechCounter = 0
    lectureSpeech.value = null
    mode.value = 'idle'
  }

  function buildEngine(): PlaybackEngine | null {
    const scene = stageStore.currentScene
    if (!scene) return null
    engineSceneId = stageStore.currentSceneId

    audioPlayer = createAudioPlayer()
    audioPlayer.setPlaybackRate(settingsStore.playbackSpeed)

    subtitleBuffer = new StreamBuffer(
      {
        onTextReveal: (_messageId, _partId, revealedText) => {
          lectureSpeech.value = revealedText
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
    )
    subtitleBuffer.start()

    const actionEngine = new ActionEngine(audioPlayer)
    engine = new PlaybackEngine(
      getSceneForPlayback(stageStore.scenes, stageStore.currentSceneId),
      actionEngine,
      audioPlayer,
      {
        onModeChange: (next) => {
          mode.value = next
        },
        onSpeechStart: (text) => {
          speechCounter += 1
          const id = `lecture-${speechCounter}`
          subtitleBuffer?.pushText(id, text, 'default-1')
          subtitleBuffer?.sealText(id)
        },
        onSpeechEnd: () => {},
        getPlaybackSpeed: () => settingsStore.playbackSpeed,
        isAgentSelected: () => true,
      },
    )
    return engine
  }

  function ensureEngine(): PlaybackEngine | null {
    if (engine && engineSceneId === stageStore.currentSceneId) return engine
    teardownEngine()
    return buildEngine()
  }

  watch(
    () => stageStore.currentSceneId,
    () => {
      teardownEngine()
    },
  )

  watch(
    () => settingsStore.playbackSpeed,
    (rate) => {
      audioPlayer?.setPlaybackRate(rate)
    },
  )

  /** 播放当前场景；若刚从讨论恢复（保存了讲课位置）则 continuePlayback 而非从头 */
  function play() {
    const e = ensureEngine()
    if (!e) return
    if (e.hasLectureInterruption()) e.continuePlayback()
    else e.start()
  }

  function pause() {
    engine?.pause()
  }

  function resume() {
    engine?.resume()
  }

  function stop() {
    engine?.stop()
    lectureSpeech.value = null
  }

  /** 学生提问：打断讲课 → 进入 live（保存位置，讨论结束后恢复） */
  function interrupt(text: string) {
    engine?.handleUserInterrupt(text)
  }

  /** 讨论结束：恢复讲课位置 → idle（用户点「播放」后 continuePlayback） */
  function endDiscussion() {
    engine?.handleEndDiscussion()
  }

  function nextScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, 1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  function prevScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, -1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  onBeforeUnmount(() => {
    teardownEngine()
  })

  return {
    mode: readonly(mode),
    lectureSpeech: readonly(lectureSpeech),
    isLive,
    play,
    pause,
    resume,
    stop,
    interrupt,
    endDiscussion,
    nextScene,
    prevScene,
  }
}
