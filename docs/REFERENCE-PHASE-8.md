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

## 8. `src/utils/speech-recognition.ts` —— 语音识别（STT）纯函数（2026-08-12 补充）

对应原项目 `components/ai-elements/prompt-input.tsx` 的能力检测与接口声明，
以及 `components/settings/asr-settings.tsx` 的 getUserMedia 权限申请，抽为可测纯函数：

| 函数 | 做什么 |
|---|---|
| `isSpeechRecognitionSupported()` | 检测浏览器是否提供 Web Speech API（`SpeechRecognition` / `webkitSpeechRecognition`）；node/SSR 环境（无 window）返回 false，保证服务端渲染与单测不崩 |
| `isPermissionDeniedError(error)` | 把识别错误码 `not-allowed` / `service-not-allowed` 统一映射为「权限被拒绝」，用于给用户友好提示；其他错误（如 `no-speech`）不视为权限问题 |
| `requestMicrophoneAccess()` | 用 `getUserMedia({ audio: true })` 显式申请麦克风权限并返回音频流——这是可靠拉起浏览器授权弹窗的标准入口（SpeechRecognition.start() 在权限曾被拒/无设备/受限环境会不弹窗直接失败）；对齐原项目 asr-settings.tsx 的申请路径 |
| `getMicrophoneErrorType(error)` | 把 getUserMedia 失败分类为「no-device（NotFoundError）/ denied（NotAllowedError）/ insecure-context（SecurityError）/ unsupported（NotSupportedError·TypeError，常见 mediaDevices 缺失）/ other」，避免把所有失败都误报成权限问题 |

## 9. `src/composables/useSpeechRecognition.ts` —— 麦克风语音输入 composable（2026-08-12 补充）

对应原项目 `PromptInputSpeechButton`（React → Vue 改写）+ asr-settings.tsx 权限预检，维护识别生命周期：

| 部分 | 做什么 |
|---|---|
| `supported` | 响应式能力检测结果（false 时 ChatArea 隐藏 🎤 按钮，避免出现无效按钮） |
| `toggle()` | 点击切换：**先 getUserMedia 权限预检**（可靠拉起浏览器授权弹窗，对齐原设置页），通过后用预检流做音量指示并 `recognition.start()`；预检失败按错误类型给出可操作提示 |
| `retry()` | 清除错误并重新走一遍权限预检 + 启动（用户在地址栏允许后点「重试」即可恢复）；同一受限环境会再次瞬时失败，这是环境限制而非按钮失效 |
| `requesting` | 预检进行中状态：按钮显示「…」并禁用，防止重复点击，也给用户明确的过程反馈 |
| `micLevel` | 识别期间实时音量 0~1：预检流接 AnalyserNode，rAF 采样中频段强度归一化，UI 音量条随讲话起伏，作为「麦克风有声音」的调试反馈 |
| `describeMicError(error)` | 按错误类型生成中文提示：无设备 → 请连接麦克风；权限被拒 → 指引地址栏权限图标/浏览器设置；非安全上下文 → 需 https/localhost；环境不支持 → 改用真实 Chrome；其他 → **透出具体错误名**（如 SecurityError），指向真实问题层 |
| `onresult` | 只收集 `isFinal` 最终识别片段，按序拼接后经 `onFinalTranscript` 追加进输入框；不展示 interim 半成品，避免输入框抖动 |
| `onerror` | 权限已在预检通过，此时再报权限类错误多为识别服务/环境受限，显示「识别服务不可用」；其他错误展示错误码；同时复位 listening 并停止音量指示 |
| `onBeforeUnmount` | 卸载时 `recognition.stop()` + 停止音量指示并释放音频流/AudioContext，对齐原项目 useEffect 清理逻辑，防止组件销毁后仍在录音或泄漏流 |
| `lang` | 默认 `zh-CN`（原项目写死 `en-US`，课堂为中文故有意调整，注释已说明） |

说明：原项目把识别文本字段声明为 `script`（浏览器标准为 `transcript`），属笔误，本项目按标准
使用 `transcript`。

## 10. `src/components/chat/ChatArea.vue`（2026-08-12 补充）

新增麦克风输入区：能力检测通过才渲染 🎤 按钮；监听中加脉冲动画（对齐原项目 `animate-pulse`）
并显示音量指示条（宽度随 micLevel 起伏）；识别结果以「已有内容 + 空格 + 新片段」方式追加到
textarea（对齐原项目拼接逻辑）；预检失败的错误以红色提示条展示在输入区下方，附「重试」按钮
（重新申请权限）。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-12 | 初版：依据 Phase 8 完成后的讲解整理输出 |

| 日期 | 内容 |
|---|---|
| 2026-08-12（二） | 问题修复：多轮第二轮起文字不显示——mock 每轮唯一 messageId（对齐原项目唯一 id 生成）+ 每轮新建打字机（消除 _drained 粘滞）。详见 PHASE-8.md 第七节 |
| 2026-08-12（三） | 功能补充：学生麦克风语音输入（STT）——新增 `speech-recognition.ts`、`useSpeechRecognition.ts`、对应单测；`ChatArea.vue` 增加 🎤 按钮与权限提示。对照原项目 `PromptInputSpeechButton`。详见 PHASE-8.md 第八节 |
| 2026-08-12（四） | 问题修复：麦克风权限弹窗不出现/误报——新增 getUserMedia 权限预检（`requestMicrophoneAccess`，对齐原设置页 asr-settings.tsx）、错误分类（`getMicrophoneErrorType`）、重试按钮与音量指示条；识别阶段权限类错误改为「服务不可用」提示。详见 PHASE-8.md 第九节 |
| 2026-08-12（五） | 二次修复：报「无法访问麦克风」且重试无反应——新增 insecure-context / unsupported 错误分类；other 分支透出具体错误名；新增 requesting 状态与按钮禁用反馈；recognition 为空时兜底提示。详见 PHASE-8.md 第九节「二次修复」 |
| 2026-08-12（六） | 功能保留审查：确认两处无意识丢失（讲义视图 Lecture Notes / onProgress 进度接线与进度跳转），登记 TODO T-18/T-19；新增 AGENTS.md 规则六（功能保留与回归检查）。详见 PHASE-8.md 第十节 |
