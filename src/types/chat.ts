/**
 * 文件头：聊天 / 互动类型（裁剪版）
 *
 * 对应原项目：lib/types/chat.ts
 *
 * 功能：
 *   - StatelessEvent：无状态聊天 API（POST /api/chat）返回的 SSE 事件联合类型，
 *     互动前端按事件类型驱动打字机与动作执行；
 *   - DirectorState：导演记账本（轮次 + 已发言 agent + 白板动作台账），
 *     由前端在各轮请求间维护并随请求发送（后端无状态）。
 *
 * 裁剪说明：
 *   1. 范围调整（2026-08-07）：互动仅「登录用户 ↔ 老师」一问一答，**无多角色讨论**，
 *      因此 SessionType 裁剪为 'qa'（删除 discussion / lecture）；
 *   2. 原项目还包含 ChatSession / UIMessage 元数据 / Pi 会话等类型，
 *      与后续「聊天会话 UI」（Phase 8）相关，届时按需补回；
 *   3. 白板动作台账字段保留（导演状态结构的一部分，虽无白板功能）。
 */
import type { ThinkingConfig } from './provider'

/** 白板动作台账条目（导演状态的一部分） */
export interface WhiteboardActionRecord {
  actionName: string
  agentId: string
  agentName: string
  params: Record<string, unknown>
}

/** 单个 agent 本轮发言摘要（导演状态的一部分） */
export interface AgentTurnSummary {
  agentId: string
  contentPreview: string
  actionCount: number
  whiteboardActions: WhiteboardActionRecord[]
}

/** 导演压缩痕迹（原项目 Pi 会话使用；本项目保留类型占位） */
export interface DirectorCompactionTrace {
  /** 裁剪：字段未使用，保留类型占位 */
}

/** 导演工具调用痕迹（原项目 Pi 会话使用；本项目保留类型占位） */
export interface DirectorToolTraceEntry {
  /** 裁剪：字段未使用，保留类型占位 */
}

/** 导演记账本：客户端在每轮请求之间维护并随请求发送 */
export interface DirectorState {
  turnCount: number
  agentResponses: AgentTurnSummary[]
  whiteboardLedger: WhiteboardActionRecord[]
}

/** 无状态聊天 API 的 SSE 事件联合类型（对应原项目 StatelessEvent） */
export type StatelessEvent =
  | {
      type: 'agent_start'
      data: {
        messageId: string
        agentId: string
        agentName: string
        agentAvatar?: string
        agentColor?: string
      }
    }
  | { type: 'agent_end'; data: { messageId: string; agentId: string } }
  | { type: 'text_delta'; data: { content: string; messageId?: string } }
  | {
      type: 'action'
      data: {
        actionId: string
        actionName: string
        params: Record<string, unknown>
        agentId: string
        messageId?: string
      }
    }
  | {
      type: 'thinking'
      data: { stage: 'director' | 'agent_loading'; agentId?: string }
    }
  | { type: 'cue_user'; data: { fromAgentId?: string; prompt?: string } }
  | {
      type: 'done'
      data: {
        totalActions: number
        totalAgents: number
        agentHadContent?: boolean
        cueUserReceived?: boolean
        sessionClosed?: boolean
        endReason?: string
        directorCompaction?: DirectorCompactionTrace
        directorToolTrace?: DirectorToolTraceEntry[]
        directorState?: DirectorState
      }
    }
  | { type: 'error'; data: { message: string } }

/** 解析后的动作（服务端结构化输出解析结果，原项目 ParsedAction） */
export interface ParsedAction {
  actionId: string
  actionName: string
  params: Record<string, unknown>
}

/**
 * 会话类型：裁剪后仅保留 'qa'（问答）。
 * 问答可多轮：用户连续提问、对话历史逐轮累积，每轮 = 用户提问 → 老师回答；
 * 角色仅登录用户与老师。原项目还有 'discussion'（多角色讨论）与 'lecture'（讲课），
 * 范围调整（2026-08-07）后不再使用。
 */
export type SessionType = 'qa'

/** 会话状态（Phase 8 聊天 UI 使用；先定义枚举） */
export type SessionStatus = 'idle' | 'active' | 'completed' | 'error'

/** 会话配置（Phase 8 使用；一问一答固定老师） */
export interface SessionConfig {
  agentIds: string[]
  triggerAgentId?: string
  defaultAgentId?: string
}

/** 思考配置类型（供 ThinkingConfig 引用） */
export type { ThinkingConfig }
