/**
 * 文件头：settings store（Pinia）
 *
 * 对应原项目：lib/store/settings.ts（Zustand）——「观众偏好」
 *
 * 功能：用户/系统偏好设置，播放引擎与 TTS 链路按需读取：
 *   - TTS：是否启用、供应商、供应商配置、音色、语速、音量、静音；
 *   - 播放倍速；
 *   - 参与互动的 agent 列表（selectedAgentIds）。
 *
 * 为什么仿写为 Pinia：字段名与原项目一致（ttsEnabled / ttsProviderId /
 * ttsProvidersConfig / ttsSpeed / ttsMuted / ttsVolume / ttsVoice /
 * playbackSpeed / selectedAgentIds），照搬的引擎按这些名字读取。
 *
 * 兼容层说明：与 canvas store 相同，导出时挂载 getState() 转发，
 * 让照搬代码里 `useSettingsStore.getState()` 零改动可用。
 */
import { defineStore } from 'pinia'
import type { TTSEnablementConfig } from '@/core/audio/provider-enablement'

/** settings store 状态 */
interface SettingsState {
  /** 是否启用语音（TTS） */
  ttsEnabled: boolean
  /** 当前 TTS 供应商 id（默认浏览器原生） */
  ttsProviderId: string
  /** 各供应商配置（启用判断使用） */
  ttsProvidersConfig: Record<string, TTSEnablementConfig>
  /** TTS 语速（默认 1） */
  ttsSpeed: number
  /** 是否静音 */
  ttsMuted: boolean
  /** 音量（0-1） */
  ttsVolume: number
  /** 当前音色 id（浏览器原生语音 URI 或供应商音色） */
  ttsVoice: string
  /** 播放倍速 */
  playbackSpeed: number
  /** 参与互动的 agent id 列表 */
  selectedAgentIds: string[]
}

/** Pinia store 定义（不直接导出，导出带兼容层的包装） */
const settingsStoreDefinition = defineStore('settings', {
  state: (): SettingsState => ({
    ttsEnabled: true,
    ttsProviderId: 'browser-native-tts',
    ttsProvidersConfig: {
      'browser-native-tts': { enabled: true },
    },
    ttsSpeed: 1,
    ttsMuted: false,
    ttsVolume: 1,
    ttsVoice: '',
    playbackSpeed: 1,
    selectedAgentIds: ['default-1'],
  }),
  actions: {
    setTTSEnabled(enabled: boolean) {
      this.ttsEnabled = enabled
    },
    setTTSProviderId(providerId: string) {
      this.ttsProviderId = providerId
    },
    setTTSProvidersConfig(config: Record<string, TTSEnablementConfig>) {
      this.ttsProvidersConfig = config
    },
    setTTSMuted(muted: boolean) {
      this.ttsMuted = muted
    },
    setTTSVolume(volume: number) {
      this.ttsVolume = Math.max(0, Math.min(1, volume))
    },
    setPlaybackSpeed(speed: number) {
      this.playbackSpeed = speed
    },
    setSelectedAgentIds(ids: string[]) {
      this.selectedAgentIds = ids
    },
  },
})

/** store 实例类型（供兼容层返回类型使用） */
type SettingsStoreInstance = ReturnType<typeof settingsStoreDefinition>

/** 导出带兼容层的 store（用法见文件头「兼容层说明」） */
export const useSettingsStore = Object.assign(settingsStoreDefinition, {
  getState: (): SettingsStoreInstance => settingsStoreDefinition(),
})
