/**
 * 文件头：Agent 配置类型（裁剪版）
 *
 * 对应原项目：lib/orchestration/registry/types.ts
 *
 * 功能：AgentConfig —— 一个「演员」的完整配置：名字、角色、人设（喂给 LLM）、
 * 头像、颜色、允许执行的动作、发言优先级、音色。
 * 互动（Phase 8）时按此配置选择参与讨论的 agent 并拼装系统提示词。
 *
 * 裁剪说明：原项目还有 allowThinking 等扩展字段；本项目保留核心字段，
 * 按需可再补回。
 */
/** Agent 角色 */
export type AgentRole = 'teacher' | 'assistant' | 'student'

/** Agent 配置（对应原项目 AgentConfig 核心字段） */
export interface AgentConfig {
  id: string
  name: string
  role: AgentRole
  /** 人设：LLM 生成回复时的角色依据 */
  persona: string
  avatar: string
  color: string
  /** 该 agent 允许执行的动作白名单（服务端还会按场景二次过滤） */
  allowedActions: string[]
  /** 发言优先级（老师最高） */
  priority: number
  /** 是否为内置默认 agent */
  isDefault?: boolean
  createdAt?: Date
  updatedAt?: Date
}
