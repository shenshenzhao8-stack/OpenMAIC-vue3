/**
 * 文件头：前端驱动的多智能体互动循环（学生提问 → 老师回答）
 *
 * 对应原项目：lib/chat/agent-loop.ts（照搬，注释已翻译为中文）
 *
 * 功能：runAgentLoop —— 每次「用户消息」触发一次循环：
 *   1. 每轮都重新读取课堂状态快照（getStoreState，因为上一轮 agent 可能改了白板/场景）；
 *   2. POST /api/chat 发送完整上下文（messages + storeState + config），后端无状态；
 *   3. 逐条解析 SSE 事件流（agent_start / text_delta / action / agent_end / done），
 *      交给 onEvent 回调（前端喂给 StreamBuffer + ActionEngine）；
 *   4. onIterationEnd 读取本轮结果（导演是否结束 / 是否轮到用户发言）；
 *   5. 依据退出条件决定是否再来一轮：
 *      - cue_user（该学生发言）→ 停止；
 *      - 导演 END 且无 agent 发言 → 停止；
 *      - 连续两轮空响应 → 停止；
 *      - abort → 停止。
 *
 * 纯 TS、零框架依赖，通过回调注入（fetchChat / getStoreState / onEvent）与环境解耦，
 * 前端（Vue）与 eval 测试共用同一套循环。
 */
import type { StatelessEvent, DirectorState } from '@/types/chat'
import type { ThinkingConfig } from '@/types/provider'
import { createLogger } from '@/core/logger'

const log = createLogger('AgentLoop')

// ==================== 类型定义 ====================

/** 随每次 /api/chat 请求发送的课堂状态快照 */
export interface AgentLoopStoreState {
  stage: unknown
  scenes: unknown[]
  outlines?: unknown[]
  currentSceneId: string | null
  mode: string
  whiteboardOpen: boolean
  /**
   * 当前场景的测验提交状态（来自前端运行时；活动场景不是已提交测验时缺省）。
   */
  quizResults?: {
    sceneId: string
    answers: Record<string, string | string[]>
    results: Array<{
      questionId: string
      correct: boolean | null
      status: 'correct' | 'incorrect'
      earned: number
      aiComment?: string
    }>
  }
}

/** 请求模板：各轮迭代之间保持不变的字段 */
export interface AgentLoopRequest {
  config: {
    agentIds: string[]
    sessionType?: string
    agentConfigs?: Record<string, unknown>[]
    [key: string]: unknown
  }
  userProfile?: { nickname?: string; bio?: string }
  apiKey: string
  baseUrl?: string
  model?: string
  providerType?: string
  thinkingConfig?: ThinkingConfig
}

/** 单次迭代结果（从 done 事件提取） */
export interface AgentLoopIterationResult {
  directorState?: DirectorState
  totalAgents: number
  agentHadContent: boolean
  cueUserReceived: boolean
}

/** 调用方注入的回调（前端或 eval 测试） */
export interface AgentLoopCallbacks {
  /** 每轮获取最新课堂状态（白板/场景可能已变） */
  getStoreState: () => AgentLoopStoreState | Promise<AgentLoopStoreState>

  /** 获取当前消息历史 */
  getMessages: () => unknown[]

  /**
   * 发起 /api/chat 请求，返回带 .body ReadableStream 的 Response。
   */
  fetchChat: (body: Record<string, unknown>, signal: AbortSignal) => Promise<Response>

  /** 处理单条 SSE 事件（文本积累、动作执行、UI 更新） */
  onEvent: (event: StatelessEvent) => void

  /**
   * 一轮 SSE 流结束后调用，必须返回本轮结果（从 done 事件提取）。
   * 前端在这里等待打字机排空后再读取结果。
   */
  onIterationEnd: () => Promise<AgentLoopIterationResult | null>
}

/** 循环最终结果 */
export interface AgentLoopOutcome {
  /** 结束原因 */
  reason: 'end' | 'cue_user' | 'aborted' | 'empty_turns' | 'no_done'
  directorState?: DirectorState
  /** 已完成的轮次数 */
  turnCount: number
}

// ==================== 核心循环 ====================

/**
 * 等待异步工作完成；信号中止时立即返回「已中止」。
 */
function awaitOrAbort<T>(work: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve({ status: 'aborted' as const })
  return new Promise<{ status: 'completed'; value: T } | { status: 'aborted' }>(
    (resolve, reject) => {
      let settled = false
      const finish = (result: { status: 'completed'; value: T } | { status: 'aborted' }) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        resolve(result)
      }
      const onAbort = () => finish({ status: 'aborted' })
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) onAbort()
      void work.then(
        (value) => finish({ status: 'completed', value }),
        (error) => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', onAbort)
          reject(error)
        },
      )
    },
  )
}

/**
 * 运行互动循环（前端与 eval 共用）。
 *
 * 每次迭代：刷新状态 → POST /api/chat → 处理 SSE 事件 → 检查退出条件 → 重复，
 * 直到导演提示用户发言（cue_user）、导演结束（END）、流出错、
 * 或连续两次空 agent 响应。客户端不设轮次上限，由 LLM 导演控制对话长度。
 */
export async function runAgentLoop(
  request: AgentLoopRequest,
  callbacks: AgentLoopCallbacks,
  signal: AbortSignal,
): Promise<AgentLoopOutcome> {
  let directorState: DirectorState | undefined = undefined
  let turnCount = 0
  let consecutiveEmptyTurns = 0

  while (true) {
    if (signal.aborted) {
      return { reason: 'aborted', directorState, turnCount }
    }

    // 每轮刷新课堂状态：上一轮 agent 的动作可能改变了白板、场景或模式
    const stateRead = await awaitOrAbort(
      Promise.resolve().then(() => callbacks.getStoreState()),
      signal,
    )
    if (stateRead.status === 'aborted') {
      return { reason: 'aborted', directorState, turnCount }
    }
    const freshStoreState = stateRead.value
    const currentMessages = callbacks.getMessages()

    // 组装请求体：完整上下文 + 无状态后端
    const body: Record<string, unknown> = {
      messages: currentMessages,
      storeState: freshStoreState,
      config: request.config,
      directorState,
      userProfile: request.userProfile,
      apiKey: request.apiKey,
      baseUrl: request.baseUrl,
      model: request.model,
      providerType: request.providerType,
      thinkingConfig: request.thinkingConfig,
    }

    // 发起请求
    const response = await callbacks.fetchChat(body, signal)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    // 解析 SSE 流并处理事件
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let sseBuffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const parts = sseBuffer.split('\n\n')
        sseBuffer = parts.pop() || ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue

          try {
            const event: StatelessEvent = JSON.parse(line.slice(6))
            callbacks.onEvent(event)
          } catch {
            // 跳过格式异常的事件（心跳等）
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (signal.aborted) {
      return { reason: 'aborted', directorState, turnCount }
    }

    // 迭代结束：等待缓冲排空（前端）或收集结果（eval）
    const iterationResult = await callbacks.onIterationEnd()

    // 检查退出条件
    if (!iterationResult) {
      return { reason: 'no_done', directorState, turnCount }
    }

    // 更新累计导演状态
    directorState = iterationResult.directorState
    turnCount = directorState?.turnCount ?? turnCount + 1

    // 导演提示用户发言 → 停止循环
    if (iterationResult.cueUserReceived) {
      return { reason: 'cue_user', directorState, turnCount }
    }

    // 导演结束且无 agent 发言 → 停止
    if (iterationResult.totalAgents === 0) {
      return { reason: 'end', directorState, turnCount }
    }

    // 追踪连续空响应
    if (!iterationResult.agentHadContent) {
      consecutiveEmptyTurns++
      if (consecutiveEmptyTurns >= 2) {
        log.warn(
          `[AgentLoop] ${consecutiveEmptyTurns} consecutive empty agent responses, stopping loop`,
        )
        return { reason: 'empty_turns', directorState, turnCount }
      }
    } else {
      consecutiveEmptyTurns = 0
    }
  }
}
