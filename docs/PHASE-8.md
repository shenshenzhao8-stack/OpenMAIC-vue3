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

## 八、功能补充记录：学生麦克风语音输入（STT）（2026-08-12）

### 背景与需求

原项目允许学生用麦克风输入语音转问题，并具备「能力检测 + 权限访问」能力
（`components/ai-elements/prompt-input.tsx` 的 `PromptInputSpeechButton`）。核对新项目后确认
此前未移植该能力，本补充使其对齐原项目行为：**语音识别结果进入输入框后，走普通文本消息通道
发送**，不改变互动模型（仍是登录用户 ↔ 老师一问一答、可多轮）。

### 新增 / 修改文件对照表

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/utils/speech-recognition.ts`（新增） | `prompt-input.tsx` 内 `SpeechRecognition` 接口与能力检测表达式 + `asr-settings.tsx` 的 getUserMedia 申请 | 能力检测 / 识别接口声明 / 麦克风权限申请 | **改写（抽纯函数）**：`isSpeechRecognitionSupported` 抽离便于单测；`requestMicrophoneAccess` 用 getUserMedia 显式申请麦克风权限（对齐原设置页）；`getMicrophoneErrorType` 把无设备 / 权限被拒 / 其他分开，避免误报 |
| `src/composables/useSpeechRecognition.ts`（新增） | `prompt-input.tsx` 的 `PromptInputSpeechButton` + `asr-settings.tsx` 的权限预检 | React 组件内维护识别生命周期 + 设置页麦克风测试 | **改写（React → Vue composable）**：`toggle` 先做 getUserMedia 权限预检（可靠拉起浏览器授权弹窗），通过后再 `recognition.start()`；`micLevel` 用预检流做实时音量指示（可调试反馈）；`retry` 重新申请权限；`onresult` 仅取 `isFinal` 片段；`onBeforeUnmount` 停止识别并释放流 |
| `src/components/chat/ChatArea.vue`（修改） | 同上 + `chat-area.tsx` | 输入框挂麦克风按钮 | **改写（简化）**：新增 🎤 按钮（能力不支持则隐藏）、监听中脉冲动画、音量指示条、错误提示条 + 重试按钮；final 片段追加到 textarea 已有内容之后（`已有内容 + ' ' + 新片段`，对齐原项目拼接逻辑） |
| `src/utils/__tests__/speech-recognition.test.ts`（新增） | —— | —— | 工具函数单测：能力检测、错误码映射、getUserMedia 错误分类、权限预检可用/不可用路径 |

### 与原项目的行为对照与差异说明

1. **能力检测**：一致——`'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`；
   node / SSR 环境（无 window）直接判定不支持。
2. **识别参数**：`continuous = true`、`interimResults = true` 与原项目一致；
   语言原项目写死 `'en-US'`，本项目默认 `zh-CN`（可选项注入），因为课堂语言是中文，
   这是有意差异并在代码注释中说明。
3. **结果处理**：一致——只取 `isFinal` 的识别片段按顺序拼接，追加到输入框已有内容之后，
   **不展示临时（interim）结果**，避免输入框被半成品文字抖动。
4. **字段名差异**：原项目把识别文本字段声明为 `script`（`SpeechRecognitionAlternative.script`），
   这是笔误（浏览器标准字段为 `transcript`），本项目按标准使用 `transcript`，代码注释已说明。
5. **权限申请与错误处理**（2026-08-12 修复后）：
   - 原项目聊天输入口直接 `recognition.start()`，权限弹窗完全依赖浏览器兜底；真正具备
     「显式权限申请 + 麦克风可调试」能力的是原项目**设置页** `asr-settings.tsx`（getUserMedia +
     录音测试）。新项目裁剪了设置页，导致聊天麦克风既没有显式权限申请，也没有可调试反馈。
   - 修复后本项目 `toggle` 先走 `getUserMedia` 预检（可靠拉起浏览器授权弹窗，对齐原设置页），
     失败按「无设备 / 权限被拒 / 其他」分类提示并附「重试」按钮；识别阶段再报权限类错误时
     改为「识别服务不可用」提示（此时权限已通过预检，not-allowed 更可能源于服务/环境受限）。
6. **UI 差异**：原项目按钮常驻（禁用态表示不支持）；本项目 `v-if="micSupported"` 直接隐藏，
   避免不支持语音识别的浏览器（如 Firefox / Safari 部分版本）出现无效按钮；另增加音量指示条
   （识别期间随麦克风输入起伏）作为「麦克风可用」的调试反馈，弥补设置页裁剪后的可调试能力。

### 浏览器兼容性说明（如实记录，规则四）

Web Speech API 的 `SpeechRecognition` 目前主要由 **Chrome / Edge（Chromium 系）** 提供，
Firefox 与 Safari 普遍不支持或实现不全。本项目已做能力检测：不支持时按钮不显示，
不会影响文本提问主链路。若后台将来提供 HTTP 式 STT 接口，可在此 composable 内替换实现，
UI 层无需改动（`supported` 由检测函数返回）。

### 验证结果（补充后全量重跑）

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：15 个测试文件 / 66 个用例全部通过（新增 speech-recognition 5 用例）；
- `npm run build`：通过。

### 范围变更影响

互动范围新增「麦克风语音输入」，已同步：

- `AGENTS.md`（`/Users/mac/OpenMAIC/AGENTS.md` 及 worktree 副本）规则三「互动输入」条目；
- `README.md` 裁剪范围、`docs/DEVELOPMENT-PLAN.md`（Phase 8 需求规划与验收清单）、`TODO.md`（T-04 关闭）。

## 九、问题修复记录：麦克风权限弹窗不出现 / 误报权限被拒绝（2026-08-12）

### 现象

点击聊天区麦克风按钮后，本项目直接提示「麦克风权限被拒绝，请在浏览器设置中允许麦克风后重试」，
浏览器没有弹出授权申请；而原项目能够拉起浏览器麦克风权限申请，并支持麦克风调试。

### 根因（对照原项目逐一核对）

1. **原项目聊天输入口与设置页是两套逻辑，复刻时只搬了前者**：
   - `components/ai-elements/prompt-input.tsx` 的 `PromptInputSpeechButton`：直接
     `recognition.start()`，**没有任何 getUserMedia 权限申请**，权限弹窗完全依赖 Chrome 对
     SpeechRecognition 的内置处理；
   - `components/settings/asr-settings.tsx`：显式 `navigator.mediaDevices.getUserMedia({ audio: true })`
     申请权限 + MediaRecorder 录音测试，**这才是「弹权限窗、可调试麦克风」能力的来源**。
   - 新项目裁剪了设置页，只移植了聊天输入口，于是「显式权限申请 + 麦克风可调试」整体缺失。
2. **错误处理差异放大了问题**：SpeechRecognition 在权限曾被拒、无麦克风设备或受限浏览器环境中
   会以 `not-allowed` / `service-not-allowed` 直接失败且不弹窗；原项目仅 `log.error`（用户无感知），
   本项目上一版把这类错误一律映射为「权限被拒绝」的醒目提示，造成「好像项目坏了」的观感。
3. **环境提示**：若在应用内嵌浏览器（受限环境）或此前在地址栏拒过该站点麦克风权限，`start()`
   会立即失败。getUserMedia 是标准权限申请入口，能可靠拉起授权弹窗，因此用它做预检是正解。

### 修复方案

1. `requestMicrophoneAccess()`：点击麦克风先执行 `getUserMedia({ audio: true })` 权限预检，
   让浏览器可靠弹出授权弹窗（对齐原项目 `asr-settings.tsx` 的申请路径）；返回的流交给音量指示。
2. `getMicrophoneErrorType()`：把预检失败按 `NotFoundError`（无设备）/ `NotAllowedError`
   （权限被拒）/ 其他分类，分别给出可操作的提示；避免把所有失败误报为权限问题。
3. `useSpeechRecognition`：`toggle` 先预检再 `start()`；`retry` 可重新申请；
   `micLevel`（AnalyserNode + rAF）在识别期间显示实时音量，作为「麦克风有声音」的调试反馈，
   弥补设置页裁剪后的可调试能力；`onBeforeUnmount` 释放流与 AudioContext。
4. `ChatArea.vue`：错误提示条附「重试」按钮；监听中显示音量条（宽度随 micLevel 变化）。

### 边界说明（如实记录，规则四）

- 若浏览器**已永久拒绝**该站点麦克风（地址栏权限图标为禁止），getUserMedia 也会失败——
  此时提示明确指向「地址栏权限图标 / 浏览器设置」并给出重试按钮，用户按提示授权后即可恢复。
- Web Speech API 仅 Chromium 系完整支持，且识别依赖在线服务；预检只能验证「麦克风可用」，
  不能保证识别服务可达。识别阶段再报权限类错误时，本项目显示「识别服务不可用」而非权限提示。
- 若在无麦克风的测试环境（如部分内嵌浏览器 / 虚拟机）验收，请改用真实 Chrome + 实体麦克风。

### 影响范围与验证

涉及 `src/utils/speech-recognition.ts`、`src/composables/useSpeechRecognition.ts`、
`src/components/chat/ChatArea.vue`、`src/utils/__tests__/speech-recognition.test.ts`；
`vue-tsc --noEmit`、vitest 15 文件 / 66 用例、`npm run build` 全部通过。
本修复已同步至 `README.md`、`docs/DEVELOPMENT-PLAN.md`、`TODO.md` 与
`AGENTS.md`（两份）「互动输入」条目（由「权限处理」明确为「getUserMedia 权限预检 + 错误分类」）。

### 二次修复：报「无法访问麦克风」且重试无反应（2026-08-12）

**现象**：应用上述修复后，点击麦克风仍提示「无法访问麦克风，请检查系统录音权限或浏览器设置后
重试」，点「重试」看似无反应。

**根因分析**：
1. 该文案对应错误分类的「other」分支——说明 `getUserMedia` 抛出的错误既不是
   `NotFoundError`（无设备）、也不是 `NotAllowedError`（权限被拒），而是其他类型
   （常见如 `SecurityError` 非安全上下文、`NotSupportedError`/mediaDevices 缺失的受限环境，
   或内嵌浏览器自定义错误）。上一版文案没有透出具体错误名，用户无法判断是哪一层问题。
2. 「重试没反应」不是按钮失效，而是 `retry()` 重新执行了同一预检，在同一受限环境中
   以同样的错误**瞬时失败**，错误条几乎瞬间恢复原样，观感上像没反应；且上一版没有
   「请求中」状态，点击后没有任何过程反馈。

**修复**：
1. `getMicrophoneErrorType` 新增 `insecure-context`（SecurityError）与
   `unsupported`（NotSupportedError/TypeError，常见于 mediaDevices 缺失）两类；
2. `describeMicError` 在「other」分支**透出浏览器返回的具体错误名**（如
   `无法访问麦克风（SecurityError）：…`），让提示指向真实问题层（系统权限 / 安全上下文 /
   环境不支持），而非笼统建议；
3. `useSpeechRecognition` 新增 `requesting` 状态：点击后按钮显示「…」并禁用，重试按钮显示
   「请求中…」，给用户明确的过程反馈；同时 `console.error` 保留原始错误，便于联调；
4. `toggle` 增加 `recognition` 为 null 时的兜底提示（「语音识别初始化失败」），避免静默无反应。

**验证**：`vue-tsc --noEmit`、vitest 15 文件 / 66 用例、`npm run build` 全部通过。

**验收提示（规则四，如实说明）**：若在**应用内嵌浏览器**或非 HTTPS（如 http://IP:5173）下测试，
麦克风能力本身可能不可用，这是浏览器/环境限制而非代码缺陷。请使用**真实 Chrome**、
以 `localhost` 或 `https` 访问，并确认 macOS「系统设置 → 隐私与安全 → 麦克风」已允许 Chrome；
若仍失败，把页面提示中的**具体错误名**反馈回来即可进一步定位。

## 十、功能保留审查记录（2026-08-12，规则六新增依据）

### 背景

用户反馈：Phase 7 / Phase 8 两个版本验收时多次发现功能丢失；在无刻意裁剪需求时，应最大限度
保留原项目所有功能点。本审查对「课堂播放」范围内的原项目功能与新工程代码逐项对照，定位丢失
点与系统性根因，并新增 AGENTS.md 规则六防复发。

### 审查方法

1. `git diff` 回放 Phase 7 / Phase 8 及未提交的 STT 三次迭代，检查每个版本的删除项与行为变更；
2. 对照原项目 `PlaybackChromeRoot.tsx`、`chat-area.tsx`、`lecture-notes-view.tsx`、
   `lib/chat/lecture-notes.ts`、`header-controls.tsx` 与引擎回调契约，核对新工程接线；
3. 用 `rg` 检索新工程是否实现对应功能（讲义、onProgress、jumpToAction、进度等关键词）。

### 确认的功能丢失（无意识丢失，文档未记录裁剪）

| 丢失功能 | 原项目实现 | 新工程现状 | 处置 |
|---|---|---|---|
| 讲义视图（Lecture Notes） | 聊天区双 tab（lecture/chat，**默认讲义页**）：`lib/chat/lecture-notes.ts` 的 `buildLectureNotes(scenes)` 纯函数把 speech/spotlight/laser 等动作构造成讲义条目，`lecture-notes-view.tsx` 渲染；`onSpeechStart`/`onEffectFire` 还会把实时讲解追加进讲义会话 | `ChatArea.vue` 仅问答面板，无讲义 tab、无 buildLectureNotes 移植 | 登记 T-18 待补：照搬纯函数 + ChatArea 双 tab |
| 播放进度 / 进度跳转 | `PlaybackChromeRoot.tsx` 接 `onProgress` 更新 `currentPlaybackActionIndex`；引擎 `jumpToAction(i)`/`canJumpToAction(i)` 供进度条跳转 | 引擎已支持 `onProgress`（types.ts:88）与 `jumpToAction`，但 `usePlaybackEngine` 未接线、UI 无进度条 | 登记 T-19 待补：接 onProgress 暴露进度状态 + 进度条 UI |

### 已核对未丢失项（排除嫌疑）

- 倍速：原为循环切换，用户明确要求改为下拉框（Phase 7，非丢失）；
- 暂停/恢复/停止/翻页：Phase 8 重构后全部保留；
- 按场景独立播放（不自动连播）：原项目 `PlaybackChromeRoot.tsx:676` 本来就是
  `new PlaybackEngine([currentScene], ...)`，新工程与其一致（Phase 7 是对齐而非阉割）；
- TTS mock 删除：用户明确要求（mock 改直接提供 mp3），有记录；
- 位置持久化（刷新恢复）：TODO T-10 已记录「暂未实现」，属已知待办（onProgress 未接的
  一部分），本审查将其拆分为「进度接线 T-19」与「持久化 T-10」分别跟踪；
- STT 三次迭代（能力检测→权限预检→错误名透出）：为行为演进，无功能删除。

### 系统性根因（为什么开发工程中会丢失）

1. **没有功能基线清单**：无「原项目功能点 → 本项目状态」对照表，改版时无法做全量回归，
   验收才发现缺口；
2. **裁剪未按三要素记录**：讲义视图等简化没有任何裁剪记录（违反规则二第 4 条执行不到位），
   与「用户明确裁剪」的功能混在一起，事后无法区分；
3. **修复/重构只做点对点验证**：Phase 7/8 验证仅单测 + build，未按功能清单做 UI 回归；
   测试覆盖引擎核心，但接线缺口（onProgress）与 UI 功能（讲义 tab）无覆盖；
4. **回调契约未逐项核对**：接线时没有对照 `PlaybackEngineCallbacks` 全部回调项逐项确认，
   引擎支持但没接的能力被静默跳过；
5. **「简化版」表述掩盖了删除**：文件头标「简化版」却不列简化掉了什么，导致后续开发
   误以为功能本来就不在范围内。

### 处置（已执行）

1. 新增 AGENTS.md **规则六：功能保留与回归检查**（未明确裁剪=保留；裁剪三要素；功能基线清单；
   修复不改无关行为；重构保行为；回调契约逐项核对；回归验收；新需求先盘点原能力；丢失事故复盘）；
2. TODO 登记 T-18（讲义视图）、T-19（播放进度接线/进度跳转）为待补项；
3. 本记录同步 README（开发规则提规则六）与 DEVELOPMENT-PLAN（验收清单加功能保留回归项）。

### 待用户确认

T-18 / T-19 是否在下一版本补回（建议补回，工作量小、收益明确：讲义视图可直接照搬纯函数，
进度条可复用引擎已实现的 jumpToAction）。补回方案按规则六执行并输出对应文档。
