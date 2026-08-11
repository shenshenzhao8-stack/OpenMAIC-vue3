/**
 * 文件头：播放引擎接线 hook（组合式函数）
 *
 * 对应原项目：components/edit/PlaybackChromeRoot.tsx（创建 PlaybackEngine/ActionEngine/
 * AudioPlayer 并接回调）与 components/stage.tsx（播放/编辑模式分发，本项目仅播放）。
 *
 * 功能：把纯 TS 的 PlaybackEngine 接到 Vue 响应式状态：
 *   - 状态：mode（idle/playing/paused/live）、lectureSpeech（当前讲解台词，字幕用）；
 *   - 动作：play / pause / resume / stop / nextScene / prevScene；
 *   - 回调接线：onModeChange → mode；onSceneChange → stageStore.setCurrentSceneId（翻页）；
 *     onSpeechStart → lectureSpeech（字幕）；getPlaybackSpeed → settings；
 *   - 清理：组件卸载时停止引擎并销毁音频。
 *
 * 说明（Phase 3 简化）：
 *   - 引擎在首次 play 时按当前 scenes 创建；手动「上一页/下一页」只改展示中的场景，
 *     引擎游标独立（后续 Phase 7/8 再对接 jumpToAction / 讨论打断恢复）。
 *   - 互动（学生提问打断讲课）在 Phase 8 接入 handleUserInterrupt。
 */
import { ref, readonly, onBeforeUnmount } from 'vue'
import { useStageStore } from '@/stores/stage'
import { useSettingsStore } from '@/stores/settings'
import { PlaybackEngine } from '@/core/playback/engine'
import { ActionEngine } from '@/core/action/engine'
import { createAudioPlayer, type AudioPlayer } from '@/core/audio/audio-player'
import { getAdjacentSceneId } from '@/utils/playback-navigation'
import type { EngineMode } from '@/core/playback/types'

export function usePlaybackEngine() {
  const stageStore = useStageStore()
  const settingsStore = useSettingsStore()

  // 引擎状态（响应式，供 UI 显示与按钮切换）
  const mode = ref<EngineMode>('idle')
  // 当前讲解台词（字幕；保留到下一句替换）
  const lectureSpeech = ref<string | null>(null)

  let audioPlayer: AudioPlayer | null = null
  let engine: PlaybackEngine | null = null

  /** 懒创建引擎：首次播放时按当前 scenes 创建（数据已加载的前提） */
  function ensureEngine(): PlaybackEngine | null {
    if (engine) return engine
    if (stageStore.scenes.length === 0) return null

    audioPlayer = createAudioPlayer()
    const actionEngine = new ActionEngine(audioPlayer)
    engine = new PlaybackEngine(stageStore.scenes, actionEngine, audioPlayer, {
      // 状态机变化 → 响应式 mode
      onModeChange: (next) => {
        mode.value = next
      },
      // 引擎推进到新场景 → 同步 stage store（翻页的唯一入口）
      onSceneChange: (sceneId) => {
        stageStore.setCurrentSceneId(sceneId)
      },
      // 一句台词开始 → 字幕
      onSpeechStart: (text) => {
        lectureSpeech.value = text
      },
      // 播放倍速从 settings 读取
      getPlaybackSpeed: () => settingsStore.playbackSpeed,
      // 无多角色讨论：所有讨论动作视为已选中（实际不会产出 discussion 动作）
      isAgentSelected: () => true,
    })
    return engine
  }

  /** 开始播放（idle → playing） */
  function play() {
    ensureEngine()?.start()
  }

  /** 暂停 */
  function pause() {
    engine?.pause()
  }

  /** 恢复 */
  function resume() {
    engine?.resume()
  }

  /** 停止并回到初始 */
  function stop() {
    engine?.stop()
    lectureSpeech.value = null
  }

  /** 手动翻页：下一页（仅改展示场景，见文件头说明） */
  function nextScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, 1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  /** 手动翻页：上一页 */
  function prevScene() {
    const id = getAdjacentSceneId(stageStore.scenes, stageStore.currentSceneId, -1)
    if (id) stageStore.setCurrentSceneId(id)
  }

  // 卸载清理：停止引擎、销毁音频（防止定时器/音频泄漏）
  onBeforeUnmount(() => {
    engine?.stop()
    audioPlayer?.destroy()
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
