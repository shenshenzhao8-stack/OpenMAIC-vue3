/**
 * 文件头：统一接口层（当前为 mock 实现）
 *
 * 对应原项目：无单一对应文件——原项目前端在组件/hook 中直接 fetch /api/*；
 * 本项目把接口调用统一收口到本文件，以便「mock → 真实后端」无痛切换（TODO T-13）。
 *
 * 涉及的后端接口（原项目路径 → 本文件函数）：
 *   - 课堂加载   /classroom/[id]（原 app/api/classroom/...）   → getClassroom()
 *   - 课堂列表   无原接口（原项目无列表页；本项目首页需要）      → listClassrooms()
 *   - 聊天 SSE   /api/chat                                     → chatStream()
 *   - TTS 合成   /api/generate/tts                             → synthesizeTts()
 *   - 简答判分   /api/quiz-grade                               → gradeQuiz()
 *
 * 切换说明：真实后端就绪后，仅需把本文件内各函数改为 fetch 真实地址，
 * 业务代码（页面/组件）零改动。
 */
import type { Stage, Scene } from '@/types/stage'
import { mockClassroomStage, mockClassroomScenes, mockClassroomsSummary } from '../../mock/classroom'
import { createMockChatResponse } from './mock/chat-sse'
import { mockSynthesizeTts } from './mock/tts'
import { mockGradeQuiz } from './mock/quiz-grade'

/** 课堂列表项（首页入口展示用） */
export interface ClassroomSummary {
  id: string
  name: string
  description: string
  scenesCount: number
}

/** 课堂加载结果：课程元信息 + 全部场景（剧本） */
export interface ClassroomData {
  stage: Stage
  scenes: Scene[]
}

/** TTS 合成结果 */
export interface TtsResult {
  format: string
  /** 可直接播放的音频 URL（真实后端可为 https URL 或 base64 data URL） */
  audioUrl: string
}

/** 课堂列表（mock：返回示例课程） */
export async function listClassrooms(): Promise<ClassroomSummary[]> {
  return mockClassroomsSummary.map((item) => ({ ...item }))
}

/**
 * 加载课堂：按 id 返回课程数据；不存在时抛错（课堂页展示错误态）。
 * mock：仅支持 'demo'。
 */
export async function getClassroom(id: string): Promise<ClassroomData> {
  if (id !== mockClassroomStage.id) {
    throw new Error(`课堂不存在：${id}（mock 阶段仅提供 "${mockClassroomStage.id}"）`)
  }
  return {
    stage: { ...mockClassroomStage },
    scenes: mockClassroomScenes.map((scene) => ({ ...scene })),
  }
}

/**
 * 聊天 SSE：发送完整上下文，返回 SSE 事件流（agent-loop 直接消费）。
 * mock：返回固定回答（见 mock/chat-sse.ts）。
 */
export async function chatStream(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  return createMockChatResponse(body, signal)
}

/** TTS 合成：mock 返回静音音频（见 mock/tts.ts） */
export async function synthesizeTts(input: { text: string; voice?: string; speed?: number }): Promise<TtsResult> {
  return mockSynthesizeTts(input)
}

/** 简答题 AI 判分：mock 返回按长度打分（见 mock/quiz-grade.ts） */
export async function gradeQuiz(input: {
  question: string
  userAnswer: string
  points: number
  commentPrompt?: string
  language?: string
}): Promise<{ score: number; comment: string }> {
  return mockGradeQuiz(input)
}
