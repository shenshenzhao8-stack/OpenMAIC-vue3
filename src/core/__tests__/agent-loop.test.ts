/**
 * 文件头：agent-loop（互动循环）冒烟测试
 *
 * 对应原项目：tests/ 中与 agent-loop 相关的测试（原项目前端 hook 与 eval 共用该循环）
 *
 * 功能：验证 runAgentLoop 的最简链路：
 *   - 调用方提供 fetchChat（返回 SSE 流）与 onEvent / onIterationEnd；
 *   - 解析 SSE 事件并逐个交给 onEvent；
 *   - 根据 onIterationEnd 的结果（cue_user）正确终止循环。
 */
import { describe, it, expect } from 'vitest'
import { runAgentLoop, type AgentLoopStoreState } from '@/core/chat/agent-loop'
import type { StatelessEvent } from '@/types/chat'

/** 构造一个 SSE 格式的 ReadableStream（模拟后端 /api/chat 响应体） */
function sseResponse(events: StatelessEvent[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })
  return { ok: true, body } as unknown as Response
}

describe('runAgentLoop（互动循环）', () => {
  it('一轮 SSE 流后收到 cue_user 正确结束', async () => {
    const streamEvents: StatelessEvent[] = [
      {
        type: 'agent_start',
        data: { messageId: 'm1', agentId: 'default-1', agentName: 'AI 老师' },
      },
      { type: 'text_delta', data: { content: '光反应发生在', messageId: 'm1' } },
      { type: 'text_delta', data: { content: '类囊体薄膜上。', messageId: 'm1' } },
      { type: 'agent_end', data: { messageId: 'm1', agentId: 'default-1' } },
      {
        type: 'done',
        data: {
          totalActions: 0,
          totalAgents: 1,
          agentHadContent: true,
          cueUserReceived: true,
          directorState: { turnCount: 1, agentResponses: [], whiteboardLedger: [] },
        },
      },
    ]

    const received: string[] = []
    const controller = new AbortController()

    const outcome = await runAgentLoop(
      {
        config: { agentIds: ['default-1'] },
        apiKey: '',
      },
      {
        getStoreState: async (): Promise<AgentLoopStoreState> => ({
          stage: null,
          scenes: [],
          currentSceneId: null,
          mode: 'playback',
          whiteboardOpen: false,
        }),
        getMessages: () => [],
        fetchChat: () => Promise.resolve(sseResponse(streamEvents)),
        onEvent: (event) => {
          received.push(event.type)
        },
        onIterationEnd: async () => ({
          directorState: { turnCount: 1, agentResponses: [], whiteboardLedger: [] },
          totalAgents: 1,
          agentHadContent: true,
          cueUserReceived: true,
        }),
      },
      controller.signal,
    )

    // 5 个事件全部被 onEvent 消费
    expect(received).toEqual(['agent_start', 'text_delta', 'text_delta', 'agent_end', 'done'])
    // 导演让用户发言（cue_user）→ 循环正确结束
    expect(outcome.reason).toBe('cue_user')
    expect(outcome.turnCount).toBe(1)
  })
})
