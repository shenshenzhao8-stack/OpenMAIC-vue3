/**
 * 文件头：模型 / 思考配置类型（裁剪版）
 *
 * 对应原项目：lib/types/provider.ts
 *
 * 功能：ThinkingConfig —— 传给 LLM 的统一「思考配置」。
 * 原项目用它在服务端映射各家供应商（OpenAI/Anthropic/Gemini）的思考参数；
 * 本项目后端承接 AI，前端只把它透传进聊天请求体（agent-loop 引用该类型）。
 *
 * 裁剪说明：枚举取值做了简化（原项目取值更细），字段名与语义保持一致。
 */
/** 思考模式 */
export type ThinkingMode = 'auto' | 'enabled' | 'disabled'
/** 推理努力程度 */
export type ThinkingEffort = 'low' | 'medium' | 'high'
/** 思考级别（Gemini 风格） */
export type ThinkingLevel = 'low' | 'medium' | 'high'

/** 统一的思考配置（透传给后台接口） */
export interface ThinkingConfig {
  mode?: ThinkingMode
  effort?: ThinkingEffort
  level?: ThinkingLevel
  /** true=启用；false=禁用；undefined=按模型默认 */
  enabled?: boolean
  /** 思考 token 预算（启用时生效） */
  budgetTokens?: number
  /** 是否从响应中剔除推理过程文本 */
  excludeReasoningOutput?: boolean
}
