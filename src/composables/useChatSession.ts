/**
 * 文件头：问答会话（登录用户 ↔ 老师多轮一问一答）
 *
 * 对应原项目：components/chat/use-chat-sessions.ts（改写简化）+ lib/chat/agent-loop.ts（已搬）
 *
 * 功能：
 *   - messages：完整对话历史（多轮累积，随每轮请求发送）；
 *   - sendMessage：每次提问触发一次 agent-loop（单老师一轮回答）→ SSE → 打字机逐字显示；
 *   - ★ 每轮新建打字机（对齐原项目 per-iteration buffer）：避免 StreamBuffer 的
 *     _drained 粘滞（waitUntilDrained 第二轮立即返回）与队列残留；
 *   - 语音：封口时完整句子交给 useDiscussionTTS 朗读，shouldHold 等语音；
 *   - 打断/恢复讲课由 ClassroomPage 协调（engine.interrupt / endDiscussion）。
 */
import { ref, computed } from 'vue'
import { useStageStore } from '@/stores/stage'
import { useCanvasStore } from '@/stores/canvas'
import { runAgentLoop, type AgentLoopStoreState } from '@/core/chat/agent-loop'
import { StreamBuffer } from '@/core/buffer/stream-buffer'
import { chatStream } from '@/api/client'
import type { DirectorState } from '@/types/chat'
import { useDiscussionTTS } from '@/composables/useDiscussionTTS'

/** 聊天消息（简化：文本消息） */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  agentId?: string
  agentName?: string
}

export function useChatSession() {
  const stageStore = useStageStore()
  const canvasStore = useCanvasStore()
  const tts = useDiscussionTTS()

  /** 对话历史（多轮累积） */
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)

  /** 用户消息计数（避免同毫秒 id 冲突） */
  let userCounter = 0

  /** 发送一条用户消息（多轮：历史累积，每轮一次一问一答） */
  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || isStreaming.value) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${userCounter++}`,
      role: 'user',
      text,
    }
    messages.value.push(userMessage)
    isStreaming.value = true

    // ★ 每轮独立打字机：避免 _drained 粘滞与队列残留
    const buf = new StreamBuffer(
      {
        onTextReveal: (messageId, _partId, revealedText) => {
          const m = messages.value.find((x) => x.id === messageId)
          if (m && m.role === 'assistant') m.text = revealedText
        },
        onSegmentSealed: (messageId, partId, fullText, agentId) => {
          tts.handleSegmentSealed(messageId, partId, fullText, agentId)
        },
        shouldHoldAfterReveal: () => tts.shouldHold(),
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
    buf.start()

    let doneData: {
      directorState?: DirectorState
      totalAgents: number
      agentHadContent: boolean
      cueUserReceived: boolean
    } | null = null

    try {
      await runAgentLoop(
        { config: { agentIds: ['default-1'] }, apiKey: '' },
        {
          getStoreState: async (): Promise<AgentLoopStoreState> => ({
            stage: stageStore.stage,
            scenes: stageStore.scenes,
            currentSceneId: stageStore.currentSceneId,
            mode: stageStore.mode,
            whiteboardOpen: canvasStore.whiteboardOpen,
          }),
          getMessages: () =>
            messages.value.map((m) => ({ id: m.id, role: m.role, content: m.text })),
          fetchChat: (body, signal) => chatStream(body, signal),
          onEvent: (event) => {
            switch (event.type) {
              case 'agent_start': {
                const id = event.data.messageId
                messages.value.push({
                  id,
                  role: 'assistant',
                  text: '',
                  agentId: event.data.agentId,
                  agentName: event.data.agentName,
                })
                buf.pushAgentStart({
                  messageId: id,
                  agentId: event.data.agentId,
                  agentName: event.data.agentName,
                })
                break
              }
              case 'text_delta': {
                const target =
                  event.data.messageId ??
                  [...messages.value].reverse().find((m) => m.role === 'assistant')?.id
                if (target) buf.pushText(target, event.data.content)
                break
              }
              case 'agent_end':
                buf.pushAgentEnd({ messageId: event.data.messageId, agentId: event.data.agentId })
                break
              case 'done':
                doneData = {
                  directorState: event.data.directorState,
                  totalAgents: event.data.totalAgents,
                  agentHadContent: event.data.agentHadContent ?? true,
                  cueUserReceived: event.data.cueUserReceived ?? false,
                }
                buf.pushDone({
                  totalActions: event.data.totalActions,
                  totalAgents: event.data.totalAgents,
                  agentHadContent: event.data.agentHadContent,
                  cueUserReceived: event.data.cueUserReceived,
                  directorState: event.data.directorState,
                })
                break
            }
          },
          onIterationEnd: async () => {
            // 等打字机排空（含「文字等语音」hold）
            await buf.waitUntilDrained()
            const d = doneData
            doneData = null
            return d
              ? {
                  directorState: d.directorState,
                  totalAgents: d.totalAgents,
                  agentHadContent: d.agentHadContent,
                  cueUserReceived: d.cueUserReceived,
                }
              : null
          },
        },
        new AbortController().signal,
      )
    } finally {
      buf.dispose()
      isStreaming.value = false
    }
  }

  /** 清空问答会话（课程切换时调用，MONOREPO Phase 1）：
   *  - 清空对话历史（避免上一课程的问答残留到下一课程）；
   *  - 复位流式状态与消息计数器；
   *  - 复位语音队列（未播完的上一课程回答不再继续朗读）。 */
  function reset() {
    messages.value = []
    isStreaming.value = false
    userCounter = 0
    tts.reset()
  }

  return {
    messages,
    isStreaming,
    sendMessage,
    reset,
    speakingAgentId: computed(() => tts.speakingAgentId.value),
  }
}
