/**
 * 文件头：agent registry store（Pinia）——「演员名单」
 *
 * 对应原项目：lib/orchestration/registry/store.ts（Zustand + localStorage 持久化）
 *
 * 功能：管理所有可用 agent 的配置（名字/角色/人设/头像/颜色/动作白名单）。
 * 默认内置一名「AI 老师」（default-1）；学生提问互动（Phase 8）从名单中
 * 选择参与讨论的 agent。
 *
 * 为什么仿写为 Pinia：原项目用 Zustand + persist 中间件做 localStorage 持久化；
 * 本项目裁剪为纯内存 store（老师固定存在，无需持久化），字段保持原样。
 */
import { defineStore } from 'pinia';

import type { AgentConfig } from '#/types/agent';

/** 默认老师：与课堂讲解/回答使用同一角色配置 */
const DEFAULT_TEACHER: AgentConfig = {
  id: 'default-1',
  name: 'AI 老师',
  role: 'teacher',
  persona:
    '你是本课堂的主讲老师。讲解清晰、有耐心，会结合例子循序渐进地授课；' + '学生提问时先正面回答，再补充必要的背景。',
  avatar: '/avatars/teacher.png',
  color: '#3b82f6',
  // 裁剪范围允许的动作：聚光 + 讲解语音（speech 由引擎/语音链路处理）
  allowedActions: ['spotlight', 'speech'],
  priority: 10,
  isDefault: true,
};

/** agent registry store 状态 */
interface AgentRegistryState {
  /** agentId → 配置 */
  agents: Record<string, AgentConfig>;
}

export const useAgentRegistry = defineStore('openmaic-agent-registry', {
  state: (): AgentRegistryState => ({
    agents: { 'default-1': DEFAULT_TEACHER },
  }),
  actions: {
    /** 注册/覆盖一个 agent（生成课堂的 LLM 阵容也走这里） */
    addAgent(agent: AgentConfig) {
      this.agents[agent.id] = agent;
    },
    updateAgent(id: string, updates: Partial<AgentConfig>) {
      if (this.agents[id]) {
        this.agents[id] = { ...this.agents[id], ...updates };
      }
    },
    getAgent(id: string): AgentConfig | undefined {
      return this.agents[id];
    },
    listAgents(): AgentConfig[] {
      return Object.values(this.agents);
    },
  },
});
