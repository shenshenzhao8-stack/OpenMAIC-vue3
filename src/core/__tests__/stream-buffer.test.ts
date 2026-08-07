/**
 * 文件头：StreamBuffer（打字机）冒烟测试
 *
 * 对应原项目：tests/buffer 或引擎相关测试（原项目无独立文件，行为来自源码设计）
 *
 * 功能：验证打字机队列的核心行为：
 *   - 文字增量逐字揭示（onTextReveal 每 tick 更新）；
 *   - agent_end 封口时触发 onSegmentSealed（把完整句子交给 TTS）；
 *   - done 事件后 waitUntilDrained() 完成（循环据此收尾）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StreamBuffer } from '@/core/buffer/stream-buffer'

describe('StreamBuffer（打字机队列）', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('逐字揭示 + 封口触发 onSegmentSealed + done 后 drain', async () => {
    vi.useFakeTimers()

    const reveals: string[] = []
    let sealedFullText: string | null = null
    let doneCalled = false

    const buffer = new StreamBuffer(
      {
        onAgentStart: () => {},
        onAgentEnd: () => {},
        onTextReveal: (_messageId, _partId, revealedText) => {
          reveals.push(revealedText)
        },
        onActionReady: () => Promise.resolve(),
        onLiveSpeech: () => {},
        onSpeechProgress: () => {},
        onThinking: () => {},
        onCueUser: () => {},
        onDone: () => {
          doneCalled = true
        },
        onError: () => {},
        onSegmentSealed: (_messageId, _partId, fullText) => {
          sealedFullText = fullText
        },
      },
      { tickMs: 30 },
    )

    buffer.start()
    buffer.pushAgentStart({ messageId: 'm1', agentId: 'a1', agentName: 'AI 老师' })
    buffer.pushText('m1', '光反应')
    buffer.pushText('m1', '发生在这里')
    // agent_end 会先封口：onSegmentSealed 收到完整句子
    buffer.pushAgentEnd({ messageId: 'm1', agentId: 'a1' })
    buffer.pushDone({ totalActions: 0, totalAgents: 1, agentHadContent: true })

    const drained = buffer.waitUntilDrained()
    // 推进足够时间：8 个字符 × 30ms + 若干非文本 tick
    vi.advanceTimersByTime(2000)
    await Promise.resolve()
    await Promise.resolve()
    await drained

    // 封口时收到完整文本（语音「等文字写完」的入口）
    expect(sealedFullText).toBe('光反应发生在这里')
    expect(doneCalled).toBe(true)
    // 逐字揭示：最后一次揭示应是完整文本
    expect(reveals[reveals.length - 1]).toBe('光反应发生在这里')
    buffer.dispose()
  })
})
