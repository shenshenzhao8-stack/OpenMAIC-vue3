# Phase 8 完成说明：互动闭环（登录用户 ↔ 老师多轮一问一答）

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（沿用）

- 互动：仅登录用户 ↔ 老师两个角色，一问一答、**可多轮**（历史逐轮累积）；
- 打断/恢复：播放中提问 → 保存讲课位置进 live → 回答 → 恢复；
- 语音：回答走浏览器 TTS 队列（T-03 未确认后台 SSE 带音频前）；
- 教学动作：speech + spotlight + laser；场景：slide / quiz / interactive。

## 一、阶段目标

1. 问答闭环：输入框发送 → agent-loop 一轮 → SSE → 打字机逐字 → 老师回答（多轮历史累积）；
2. 打断/恢复：播放中提问打断讲课，回答后恢复原位置；
3. 语音队列（Phase 7 推迟项落地）：封口入队、串行朗读、shouldHold 等语音；
4. mock 答案按提问轮数轮换（演示多轮）。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/composables/useChatSession.ts` | `components/chat/use-chat-sessions.ts` | 会话状态 + SSE→buffer + 循环 | **改写（简化）**：单会话一问一答；SSE 事件 → StreamBuffer；多轮靠 messages 历史累积 |
| `src/composables/useDiscussionTTS.ts` | `lib/hooks/use-discussion-tts.ts` | 问答语音队列 | **改写（简化）**：仅浏览器 TTS；队列/计数抽为纯模块 |
| `src/utils/tts-queue.ts` | 同上（队列部分） | 串行队列 + segmentDone | **改写（抽纯函数）**：可测 |
| `src/composables/usePlaybackEngine.ts` | `PlaybackChromeRoot.tsx` 打断接线 | 打断/恢复 | **改写（Phase 8）**：interrupt / endDiscussion / isLive；play 支持 continuePlayback |
| `src/components/chat/ChatArea.vue` | `components/chat/chat-area.tsx` | 聊天面板 | **改写（简化）**：消息列表 + 输入框 + 继续讲课按钮 |
| `src/pages/ClassroomPage.vue` | —— | 集成 | 右侧问答面板 + 打断/恢复接线 |
| `src/api/mock/chat-sse.ts` | `app/api/chat/route.ts` | SSE | **改写**：按提问轮数轮换答案 |

## 三、决策记录（规则四）

- **T-03（SSE 是否带音频）未确认**：当前 mock SSE 只推文本，故问答语音用**浏览器 TTS 队列**
  （useDiscussionTTS）实现；若后台 SSE 携带 audioUrl，届时简化为「收到 audioUrl 直接播放」（T-03）。
- **多轮**：不新增会话复杂度——messages 数组逐轮累积，每轮一次 agent-loop（单老师一轮回答）。

## 四、验证结果

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：14 个测试文件 / 60 个用例全部通过（新增 tts-queue 3 用例）；
- `npm run build`：通过（130 modules）。

## 五、范围变更记录

无新范围变更。决策：T-03 未确认前问答语音走浏览器 TTS 队列（见第三节）。

## 六、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。

## 七、问题修复记录（2026-08-12）

### 问题：多轮问答中，第二轮及以后老师回复的文字无法显示

**现象**：第一轮老师回复正常；继续提问后，新气泡不显示文字（为空）。

**根因（对照原项目）**：
1. **messageId 固定（主因）**：mock 的 SSE 每轮都发送固定 `messageId: 'm-mock-1'`；
   而原项目后端每轮生成唯一 id（`director-graph.ts` 中
   `` `assistant-${agentId}-${Date.now()}` ``）。前端 `onTextReveal` 按 messageId
   在 `messages` 里 `find` 定位气泡——第二轮同 id 时命中了**第一轮的老气泡**，
   于是新气泡永远为空、老气泡被覆盖。
2. **打字机跨轮复用（次因）**：我们复用了同一个 StreamBuffer；其 `waitUntilDrained`
   的 `_drained` 标记在首轮后粘滞，第二轮 `waitUntilDrained` 立即返回（不等排空）；
   原项目为**每轮新建 buffer**（per-iteration）。

**修复**：
1. `mock/chat-sse.ts`：每轮生成唯一 messageId（`m-${Date.now()}-${随机后缀}`），
   对齐原项目唯一 id 生成；
2. `useChatSession.ts`：`sendMessage` **每轮新建 StreamBuffer**（对齐原项目
   per-iteration buffer），消除 `_drained` 粘滞与队列残留；用户消息 id 加计数器防同毫秒冲突。

**验证**：新增测试「两次请求返回不同 agent_start messageId」；vitest 14 文件 / 61 用例全过；build 通过。

**影响范围**：`src/api/mock/chat-sse.ts`、`src/composables/useChatSession.ts`、`src/api/__tests__/client.test.ts`。
