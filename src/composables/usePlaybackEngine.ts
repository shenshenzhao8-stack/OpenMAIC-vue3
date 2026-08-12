/**
 * 文件头：播放引擎接线（composable）
 *
 * 对应原项目：components/edit/PlaybackChromeRoot.tsx（创建 PlaybackEngine/ActionEngine/
 * AudioPlayer 并接回调）与 components/stage.tsx（播放/编辑模式分发，本项目仅播放）。
 *
 * 功能（Phase 7 更新 + 2026-08-12 修复）：
 *   - ★ 按当前场景播放：引擎每次只接收「当前场景」单例数组（与原项目 [currentScene]
 *     一致）——每个场景独立播放，播完即停，不自动连播整堂课（问题 2 修复）；
 *   - 切场景：watch currentSceneId → 重建当前场景引擎（新场景从头播放）；
 *   - 字幕逐字：onSpeechStart → StreamBuffer 打字机 pushText + sealText → onTextReveal 逐字更新；
 *   - 语音：AudioPlayer 播放（mock 已填充模拟音频，暂停/恢复精确续播）；无音频时
 *     由引擎走朗读计时 / 浏览器 TTS 兜底（该兜底整句重讲，与原文案一致）；
 *   - 倍速：settings.playbackSpeed 变化实时同步到 AudioPlayer.playbackRate。
 *
 * 说明：
 *   - useDiscussionTTS 推迟到 Phase 8（唯一调用方是问答 UI）；
 *   - 手动翻页（nextScene/prevScene）切 currentSceneId → watcher 重建引擎。
 */
import { ref, readonly, watch, onBeforeUnmount } from 'vue'
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

  // 引擎状态（响应式，供 UI 显示与按钮切换）
  const mode = ref<EngineMode>('idle')
  // 当前讲解台词（字幕；由打字机逐字更新，保留到下一句替换）
  const lectureSpeech = ref<string | null>(null)

  let audioPlayer: AudioPlayer | null = null
  let engine: PlaybackEngine | null = null
  /** 字幕打字机（逐字揭示） */
  let subtitleBuffer: StreamBuffer | null = null
  /** 字幕消息计数（生成唯一 messageId） */
  let speechCounter = 0
  /** 当前引擎所属场景 id（用于判断是否需要重建） */
  let engineSceneId: string | null = null

  /** 销毁旧引擎及附属资源（切场景/卸载时调用） */
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

  /** 为「当前场景」创建新引擎（每次只传单场景数组，播完即停） */
  function buildEngine(): PlaybackEngine | null {
    const scene = stageStore.currentScene
    if (!scene) return null
    engineSceneId = stageStore.currentSceneId

    audioPlayer = createAudioPlayer()
    audioPlayer.setPlaybackRate(settingsStore.playbackSpeed)

    // 字幕打字机
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
    // ★ 单场景数组：当前场景的剧本独立播放（对应原项目 [currentScene]）
    engine = new PlaybackEngine(getSceneForPlayback(stageStore.scenes, stageStore.currentSceneId), actionEngine, audioPlayer, {
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
    })
    return engine
  }

  /** 确保引擎存在且对应当前场景；否则重建 */
  function ensureEngine(): PlaybackEngine | null {
    if (engine && engineSceneId === stageStore.currentSceneId) return engine
    teardownEngine()
    return buildEngine()
  }

  /** 切场景：销毁旧引擎（新场景从头播放，不自动连播） */
  watch(
    () => stageStore.currentSceneId,
    () => {
      teardownEngine()
    },
  )

  /** 倍速实时同步到 AudioPlayer（播放中立即生效） */
  watch(
    () => settingsStore.playbackSpeed,
    (rate) => {
      audioPlayer?.setPlaybackRate(rate)
    },
  )

  /** 开始播放当前场景（idle → playing） */
  function play() {
    ensureEngine()?.start()
  }

  /** 暂停（有音频：精确暂停，可续播） */
  function pause() {
    engine?.pause()
  }

  /** 恢复（有音频：从暂停处精确续播） */
  function resume() {
    engine?.resume()
  }

  /** 停止并回到初始 */
  function stop() {
    engine?.stop()
    lectureSpeech.value = null
  }

  /** 手动翻页：下一页（切 currentSceneId → watcher 重建引擎） */
  function nextScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, 1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  /** 手动翻页：上一页 */
  function prevScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, -1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  // 卸载清理
  onBeforeUnmount(() => {
    teardownEngine()
  })

  return {
    mode: readonly(mode),
    lectureSpeech: readonly(lectureSpeech),
    play,
    pause,
    resume,
    stop,
    nextScene,
    prevScene,
  }
}
