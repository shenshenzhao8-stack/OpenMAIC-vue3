/**
 * 文件头：语音队列纯逻辑测试
 *
 * 功能：验证串行播放、segmentDone 计数、shouldHold 状态机、reset。
 */
import { describe, it, expect } from 'vitest'
import { createTtsQueue, type TtsQueueItem } from '#/utils/tts-queue'

describe('createTtsQueue（语音队列）', () => {
  it('串行播放：一段播完才播下一段', () => {
    const spoken: TtsQueueItem[] = []
    const queue = createTtsQueue({
      speak: (item) => {
        spoken.push(item)
        queue.onSegmentFinished()
      },
    })
    queue.enqueue({ partId: 'p1', text: '第一句', agentId: 'a' })
    queue.enqueue({ partId: 'p2', text: '第二句', agentId: 'a' })
    expect(spoken.map((i) => i.partId)).toEqual(['p1', 'p2'])
    expect(queue.shouldHold()).toEqual({ holding: false, segmentDone: 2 })
  })

  it('shouldHold：播放中/队列非空时为 holding，段播完 segmentDone 变化', () => {
    let finish: (() => void) | null = null
    const queue = createTtsQueue({
      speak: () => {
        finish = queue.onSegmentFinished
      },
    })
    queue.enqueue({ partId: 'p1', text: '一句', agentId: null })
    // 正在播：holding=true，segmentDone=0
    expect(queue.shouldHold()).toEqual({ holding: true, segmentDone: 0 })
    // 播完：holding=false，segmentDone=1
    finish!()
    expect(queue.shouldHold()).toEqual({ holding: false, segmentDone: 1 })
  })

  it('reset 清空队列与计数', () => {
    const queue = createTtsQueue({ speak: () => queue.onSegmentFinished() })
    queue.enqueue({ partId: 'p1', text: 'x', agentId: null })
    queue.reset()
    expect(queue.shouldHold()).toEqual({ holding: false, segmentDone: 0 })
  })
})
