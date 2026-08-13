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
 *   （TTS 合成 /api/generate/tts 已移除：mock 数据直接提供 mp3 audioUrl，
 *     2026-08-12；后台数据自带音频方向落地，见 TODO T-01）
 *
 * 切换说明：真实后端就绪后，仅需把本文件内各函数改为 fetch 真实地址，
 * 业务代码（页面/组件）零改动。
 */
import type { Scene, Stage } from '#/types/stage';

import { mockClassroomScenes, mockClassroomsSummary, mockClassroomStage } from '../../mock/classroom';
import { createMockChatResponse } from './mock/chat-sse';

/** 课堂列表项（首页入口展示用） */
export interface ClassroomSummary {
  id: string;
  name: string;
  description: string;
  scenesCount: number;
}

/** 课堂加载结果：课程元信息 + 全部场景（剧本） */
export interface ClassroomData {
  stage: Stage;
  scenes: Scene[];
}

/** 课堂列表（mock：返回示例课程） */
export async function listClassrooms(): Promise<ClassroomSummary[]> {
  return mockClassroomsSummary.map((item) => ({ ...item }));
}

/**
 * 加载课堂：按 id 返回课程数据；不存在时抛错（课堂页展示错误态）。
 * mock：仅支持 'demo'。
 *
 * 2026-08-12：speech 动作的 audioUrl 直接来自 mock 数据（/audio/<id>.mp3，
 * 由用户按动作 id 准备的真实语音），不再由前端生成模拟音频。
 */
export async function getClassroom(id: string): Promise<ClassroomData> {
  if (id !== mockClassroomStage.id) {
    throw new Error(`课堂不存在：${id}（mock 阶段仅提供 "${mockClassroomStage.id}"）`);
  }
  // 浅拷贝场景与动作（避免页面改动污染 mock 源数据）
  const scenes: Scene[] = mockClassroomScenes.map((scene) => ({
    ...scene,
    actions: scene.actions?.map((action) => ({ ...action })),
  }));
  return {
    stage: { ...mockClassroomStage },
    scenes,
  };
}

/**
 * 聊天 SSE：发送完整上下文，返回 SSE 事件流（agent-loop 直接消费）。
 * mock：返回固定回答（见 mock/chat-sse.ts）。
 */
export async function chatStream(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
  return createMockChatResponse(body, signal);
}
