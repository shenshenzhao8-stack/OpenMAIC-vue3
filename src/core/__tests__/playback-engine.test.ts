/**
 * 文件头：播放引擎冒烟测试
 *
 * 对应原项目：tests/playback/*.test.ts（原项目的引擎测试）
 *
 * 功能：验证 PlaybackEngine 的「磁带机」行为：
 *   - 按剧本顺序消费 [speech, spotlight, speech, spotlight]；
 *   - speech 等音频播完（onEnded）才走下一步；
 *   - spotlight 立即执行不阻塞；
 *   - 全部播完进入 idle 并触发 onComplete。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Scene } from '@/types/stage'
import type { AudioPlayer } from '@/core/audio/audio-player'
import { PlaybackEngine } from '@/core/playback/engine'
import { ActionEngine } from '@/core/action/engine'

/**
 * 模拟音频播放器：实现 AudioPlayer 全部接口；
 * play() 立即成功并在微任务中触发 onEnded（模拟「音频播完」信号）。
 */
class MockAudioPlayer implements AudioPlayer {
  onEndedCb: (() => void) | null = null
  play = vi.fn(() => {
    queueMicrotask(() => this.onEndedCb?.())
    return Promise.resolve(true)
  })
  onEnded(cb: () => void) {
    this.onEndedCb = cb
  }
  stop = vi.fn()
  pause = vi.fn()
  resume = vi.fn()
  isPlaying = () => false
  hasActiveAudio = () => false
  getCurrentTime = () => 0
  getDuration = () => 0
  setMuted = vi.fn()
  setVolume = vi.fn()
  setPlaybackRate = vi.fn()
  destroy = vi.fn()
  cacheAudio = vi.fn()
}

/** 构造一个 slide 场景（actions 只含 speech + spotlight） */
function makeSlideScene(id: string, order: number, actions: Scene['actions']): Scene {
  return {
    id,
    stageId: 's1',
    title: `场景 ${order}`,
    order,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: `canvas-${id}`,
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#ffffff',
          themeColors: [],
          fontColor: '#333333',
          fontName: 'Microsoft YaHei',
        },
        elements: [],
      },
    },
    actions,
  }
}

/** 等待所有微任务/定时器排空 */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 20))
}

describe('PlaybackEngine（播放引擎）', () => {
  beforeEach(() => {
    // 引擎内部使用 Pinia store（canvas/settings），测试前必须激活 Pinia 实例
    setActivePinia(createPinia())
  })

  it('按顺序消费 [speech, spotlight, speech, spotlight] 并触发 onComplete', async () => {
    const scene = makeSlideScene('sc1', 1, [
      { id: 'a1', type: 'speech', text: '同学们好，今天学习光合作用。' },
      { id: 'a2', type: 'spotlight', elementId: 'img_1', dimOpacity: 0.5 },
      { id: 'a3', type: 'speech', text: '请看这张图。' },
      { id: 'a4', type: 'spotlight', elementId: 'img_2' },
    ])

    const audioPlayer = new MockAudioPlayer()
    const actionEngine = new ActionEngine(audioPlayer)
    const events: string[] = []
    const engine = new PlaybackEngine([scene], actionEngine, audioPlayer, {
      onSpeechStart: (text) => events.push(`speech:${text.slice(0, 4)}`),
      onEffectFire: (effect) => events.push(`effect:${effect.kind}:${effect.targetId}`),
      onComplete: () => events.push('complete'),
      getPlaybackSpeed: () => 1,
      isAgentSelected: () => true,
    })

    engine.start()
    await flush()

    expect(events).toEqual([
      'speech:同学们好',
      'effect:spotlight:img_1',
      'speech:请看这张',
      'effect:spotlight:img_2',
      'complete',
    ])
    expect(engine.getMode()).toBe('idle')
    expect(engine.isExhausted()).toBe(true)
  })

  it('播放结束后状态回到 idle（重复 start 被忽略）', async () => {
    const scene = makeSlideScene('sc1', 1, [
      { id: 'a1', type: 'speech', text: '第一句' },
      { id: 'a2', type: 'speech', text: '第二句' },
    ])
    const audioPlayer = new MockAudioPlayer()
    const actionEngine = new ActionEngine(audioPlayer)
    let completed = false
    const engine = new PlaybackEngine([scene], actionEngine, audioPlayer, {
      onComplete: () => {
        completed = true
      },
      getPlaybackSpeed: () => 1,
      isAgentSelected: () => true,
    })

    engine.start()
    await flush()
    expect(completed).toBe(true)
    expect(engine.getMode()).toBe('idle')
    // 结束态再 start 会被忽略（非 idle）
    engine.start()
    await flush()
    expect(engine.getMode()).toBe('idle')
  })
})

describe('PlaybackEngine（激光笔）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('laser 火速动作触发 onEffectFire kind=laser 并继续播放', async () => {
    const scene = makeSlideScene('sc1', 1, [
      { id: 'a1', type: 'speech', text: '第一句' },
      { id: 'a2', type: 'laser', elementId: 'img_1', color: '#00ff00' },
    ])
    const audioPlayer = new MockAudioPlayer()
    const actionEngine = new ActionEngine(audioPlayer)
    const events: string[] = []
    const engine = new PlaybackEngine([scene], actionEngine, audioPlayer, {
      onSpeechStart: (text) => events.push(`speech:${text}`),
      onEffectFire: (effect) => events.push(`effect:${effect.kind}:${effect.targetId}`),
      onComplete: () => events.push('complete'),
      getPlaybackSpeed: () => 1,
      isAgentSelected: () => true,
    })

    engine.start()
    await flush()

    expect(events).toEqual(['speech:第一句', 'effect:laser:img_1', 'complete'])
    expect(engine.getMode()).toBe('idle')
  })
})
