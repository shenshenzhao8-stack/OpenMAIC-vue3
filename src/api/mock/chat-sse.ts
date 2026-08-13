/**
 * 文件头：mock 聊天 SSE 流生成器
 *
 * 对应原项目：app/api/chat/route.ts（后端 /api/chat 的 SSE 输出行为）
 *
 * 功能：模拟后端「一问一答」：收到完整请求体后，按 StatelessEvent 协议
 * （agent_start → text_delta×N → agent_end → done）输出一条 SSE 流。
 * 多轮演示：按「用户已提问次数」轮换两套答案（体现多轮历史累积）。
 *
 * ★ 每轮唯一 messageId：对齐原项目 director-graph.ts 的 `assistant-${agentId}-${Date.now()}`；
 * 固定 id 会导致前端多轮时按 id 定位消息命中旧气泡（2026-08-12 问题修复记录）。
 */
import type { StatelessEvent } from '#/types/chat';

/** 把一段文本按固定字符数切块（模拟网络分片到达） */
function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

/**
 * 生成一条 mock SSE 响应（一问一答）。
 * @param _body 请求体（messages/storeState/config）；mock 只读取 messages 统计提问轮数
 * @param _signal 中止信号（mock 阶段不中断，保留参数以对齐真实接口）
 */
export function createMockChatResponse(_body: Record<string, unknown>, _signal: AbortSignal): Response {
  // 多轮演示：按「用户已提问次数」轮换两套答案
  const rawMessages = Array.isArray(_body.messages) ? (_body.messages as Array<{ role?: string }>) : [];
  const userCount = rawMessages.filter((m) => m.role === 'user').length;
  const answers = [
    '光反应发生在叶绿体的类囊体薄膜上，水在光下分解产生氧气、H+ 和电子。',
    '暗反应在基质中进行，利用 ATP 与 NADPH 把二氧化碳合成为有机物。',
  ];
  const answer = answers[userCount % answers.length];

  // ★ 每轮唯一 messageId（时间戳 + 随机后缀）
  const messageId = `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const events: StatelessEvent[] = [
    {
      type: 'agent_start',
      data: { messageId, agentId: 'default-1', agentName: 'AI 老师' },
    },
    ...chunkText(answer, 8).map((content) => ({
      type: 'text_delta' as const,
      data: { content, messageId },
    })),
    { type: 'agent_end', data: { messageId, agentId: 'default-1' } },
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
  ];

  // 把事件数组编码为 SSE 文本流（`data: {json}\n\n`）
  const bodyStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });

  return { ok: true, body: bodyStream } as unknown as Response;
}
