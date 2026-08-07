/**
 * 文件头：mock 聊天 SSE 流生成器
 *
 * 对应原项目：app/api/chat/route.ts（后端 /api/chat 的 SSE 输出行为）
 *
 * 功能：模拟后端「一问一答」：收到完整请求体后，按 StatelessEvent 协议
 * （agent_start → text_delta×N → agent_end → done）输出一条 SSE 流，
 * 回答为固定示例文本（老师讲解光反应）。
 *
 * 为什么用 ReadableStream 实现：agent-loop 通过 response.body.getReader() 解析 SSE，
 * 与真实后端交互方式完全一致；将来切换真实后端时只替换 client.chatStream() 的实现，
 * 解析代码零改动（见 TODO T-03/T-13）。
 */
import type { StatelessEvent } from '@/types/chat'

/** 把一段文本按固定字符数切块（模拟网络分片到达） */
function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

/**
 * 生成一条 mock SSE 响应（一问一答，固定回答内容）。
 * @param body 请求体（messages/storeState/config），mock 阶段不解析，仅保证签名与真实一致
 * @param signal 中止信号（mock 阶段不中断，保留参数以对齐真实接口）
 */
export function createMockChatResponse(
  _body: Record<string, unknown>,
  _signal: AbortSignal,
): Response {
  // 示例回答（老师口吻，中文）
  const answer =
    '光反应发生在叶绿体的类囊体薄膜上，水在光下分解产生氧气、H+ 和电子，同时生成 ATP 与 NADPH。'

  const events: StatelessEvent[] = [
    {
      type: 'agent_start',
      data: { messageId: 'm-mock-1', agentId: 'default-1', agentName: 'AI 老师' },
    },
    ...chunkText(answer, 8).map((content) => ({
      type: 'text_delta' as const,
      data: { content, messageId: 'm-mock-1' },
    })),
    { type: 'agent_end', data: { messageId: 'm-mock-1', agentId: 'default-1' } },
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

  // 把事件数组编码为 SSE 文本流（`data: {json}\n\n`）
  const bodyStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })

  return { ok: true, body: bodyStream } as unknown as Response
}
