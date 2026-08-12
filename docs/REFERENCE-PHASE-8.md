# Phase 8 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。

## 1. `src/utils/tts-queue.ts` —— 语音队列纯逻辑

| 方法 | 做什么 |
|---|---|
| `enqueue(item)` | 入队；空闲即播，否则排队（一次一句） |
| `processNext()` | 取队首交给 handlers.speak |
| `onSegmentFinished()` | 当前句播完：segmentDone+1 → 播下一句 |
| `shouldHold()` | `{ holding, segmentDone }`——打字机「文字等语音」判断 |
| `reset()` | 清空队列与计数 |

## 2. `src/composables/useDiscussionTTS.ts` —— 问答语音（浏览器 TTS）

| 部分 | 做什么 |
|---|---|
| `handleSegmentSealed` | 封口回调：完整句子入队（语音只在文字写完才合成） |
| `speak`（内部） | speechSynthesis 朗读；onend/onerror → onSegmentFinished |
| `speakingAgentId` | 当前说话 agent（面板指示器） |

## 3. `src/composables/useChatSession.ts` —— 问答会话

| 部分 | 做什么 |
|---|---|
| `messages` | 完整对话历史（多轮累积，每轮随请求发送） |
| `sendMessage(text)` | 一次 agent-loop：getStoreState/getMessages/fetchChat/onEvent/onIterationEnd |
| `onEvent` | agent_start 建消息；text_delta → pushText；agent_end → 封口；done → pushDone |
| `onIterationEnd` | await buffer.waitUntilDrained（含等语音 hold）后返回本轮结果 |
| `speakingAgentId` | 透传 TTS 指示器 |

## 4. `src/composables/usePlaybackEngine.ts`（Phase 8 新增）

| 方法 | 做什么 |
|---|---|
| `interrupt(text)` | 学生提问：handleUserInterrupt（保存讲课位置 → live） |
| `endDiscussion()` | 恢复讲课位置 → idle |
| `isLive` | live 模式（显示「继续讲课」） |
| `play()` | 若刚从讨论恢复（hasLectureInterruption）→ continuePlayback；否则 start |

## 5. `src/components/chat/ChatArea.vue` —— 问答面板

消息列表（用户右/老师左）+ 输入框 + 发送 + 「老师正在说话…」指示 + live 时「继续讲课」。

## 6. `src/pages/ClassroomPage.vue`

右侧问答面板；handleSend：播放中先 interrupt → chat.sendMessage；handleContinue → endDiscussion。

## 7. `src/api/mock/chat-sse.ts`

按 `messages` 中用户提问次数轮换两套答案（演示多轮历史）。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-12 | 初版：依据 Phase 8 完成后的讲解整理输出 |

| 日期 | 内容 |
|---|---|
| 2026-08-12（二） | 问题修复：多轮第二轮起文字不显示——mock 每轮唯一 messageId（对齐原项目唯一 id 生成）+ 每轮新建打字机（消除 _drained 粘滞）。详见 PHASE-8.md 第七节 |
