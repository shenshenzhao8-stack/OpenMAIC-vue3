# Phase 1 工作参考手册（逐文件 / 逐方法业务讲解）

> 本手册依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 内容定义：**逐文件说明该文件的作用与功能，并对所有主要方法/函数逐个讲解（做什么、为什么这样做）**，让读者明白每一步在干嘛。
> 手册结构约定：每个文件按「① 文件作用（业务定位）→ ② 主要方法/函数逐个（做什么 / 为什么）→ ③ 为什么照搬 / 改写」组织。
> 内容对应 `docs/PHASE-1.md` 的 2.1（照搬文件）与 2.2（改写/新建文件）。
> 维护规则：手册内容如有调整或修改，必须同步更新本文件及 `docs/README.md` 索引。

## 零、全局业务链路（文件怎么被串起来）

**链路 A：课堂播放（老师讲 → 学生看）**

```
mock 课堂 JSON
   │ ① 加载
StageStore（stores/stage.ts）        ← 舞台：剧本放这里
   │ ② 启动
PlaybackEngine（core/playback/engine.ts）   ← 磁带机：逐条消费 actions
   │ ③ 每一条动作
ActionEngine（core/action/engine.ts）← 执行者：speech→音频 / spotlight→聚光
   ├─ AudioPlayer（core/audio/audio-player.ts）   说话
   └─ CanvasStore（stores/canvas.ts）         聚光状态 → 界面自动亮
   │ ④ 节奏
Choreography（core/choreography/timing.ts、cursor.ts） ← 游标推进 + 无音频朗读计时
StreamBuffer（core/buffer/stream-buffer.ts） ← 讲课字幕也走它
```

**链路 B：登录用户提问 → 老师回答（一问一答，无多角色讨论）**

```
登录用户提问
   │ ①
互动控制器（Phase 8 接）→ AgentLoop（core/chat/agent-loop.ts）一问一答循环（每次提问一轮；多轮问答由用户连续提问、对话历史逐轮累积）
   │ ② 每轮 POST /api/chat，SSE 事件流回来
StreamBuffer（core/buffer/stream-buffer.ts）← 打字机：逐字 + 封口 + 等语音
   ├─ 文字 → 界面字幕
   ├─ 动作 → ActionEngine（聚光等）
   └─ 封口 → TTS 语音（后台音频 / useDiscussionTTS）
   │ ③ 退出判断：老师答完（cue_user）→ 停，等待用户下一次提问（多轮 = 连续提问，历史逐轮累积）
AgentRegistry（stores/agent-registry.ts）← 老师名单（一问一答固定老师）
SettingsStore（stores/settings.ts）   ← 偏好（音量/语速/选了哪些 agent）
```

---

# 一、2.1 照搬文件（9 个）

> 为什么照搬：这些文件是"逻辑本体"，需求 3/4/5 要求行为与原项目一致。
> 照搬 = 代码逐行不变，只有 import 路径换成我们的，注释改成中文业务讲解。

## 1. `src/core/playback/engine.ts` —— 播放引擎（磁带机）

**业务角色**：整个课堂播放的调度中枢。不碰 UI、不直接操作 DOM，只做"决策"：
下一步该干什么、什么时候翻页、学生提问时怎么打断和恢复。

| 方法 | 做什么 | 为什么（业务意义） |
|---|---|---|
| `start()` | 从第 1 句开始播放（idle→playing） | 用户点"开始上课" |
| `continuePlayback()` | 从当前游标继续 | 讨论结束后回到讲课 |
| `pause()` / `resume()` / `stop()` | 暂停/恢复/停止 | 暂停保存"这句还剩多少没念"（阅读计时剩余毫秒），恢复精确续上；浏览器 TTS 用 cancel+重讲（Firefox pause 不可靠） |
| `canJumpToAction(i)` / `jumpToAction(i)` | 判断/执行跳转到某句 | 用户点进度条跳转；跳转前静默重放目标之前的白板动作，保证画面状态正确 |
| `handleUserInterrupt(text)` | 登录用户提问：保存讲课位置→进入 live | **互动核心**：actionIndex 减 1，恢复时重播被打断的那句（学生可能只听了一半） |
| `confirmDiscussion()` / `skipDiscussion()` | 讨论卡片"加入/跳过" | 加入→保存位置进 live；跳过→标记已消费继续播（重播不再触发） |
| `handleEndDiscussion()` / `handleDiscussionError()` | 正常/异常结束讨论 | 恢复保存的讲课位置，从刚才那句继续 |
| `isExhausted()` | 是否全部播完 | UI 判断"课程是否完成"（已消费的讨论不算剩余） |
| `getSnapshot()` / `restoreFromSnapshot()` | 播放位置快照存取 | 刷新页面回到离开的那一句 |
| `processNext()`（私有） | **磁带机主循环**：取动作→执行→等完成信号→下一步 | 每个动作"完成信号"不同：speech 等音频 ended、spotlight 立即、讨论等用户点击；统一收敛为"完成后调 processNext" |
| `getCurrentAction()`（私有） | 用 resolvePlaybackCursor 定位当前动作 | 场景播完自动推进到下一页 |
| 浏览器 TTS 一组方法 | 无音频时用 Web Speech API 朗读 | 兜底：没预生成音频也能"出声"，按句切块规避 Chrome 15 秒截断 |

## 2. `src/core/playback/types.ts` —— 引擎的类型契约

纯类型，无逻辑。定义 `EngineMode`（idle/playing/paused/live）、`PlaybackSnapshot`（播放位置）、
`Effect`（聚光/激光特效通知）、`PlaybackEngineCallbacks`（引擎对外回调契约——字幕、翻页、特效、进度、打断）。

**为什么**：engine.ts 是"黑盒"，UI 通过回调接口感知它；类型文件就是接口说明书。

## 3. `src/core/playback/action-navigation.ts` —— 跳转安全判断

| 方法 | 做什么 |
|---|---|
| `canReconstructPrefixForAction` | 目标是否为 speech 且前缀不含"不可重建"动作（视频/讨论/widget） |
| `canJumpWithinReconstructablePrefix` | 引擎 `jumpToAction` 用的可行性判断 |
| `isWhiteboardPlaybackAction` | 是否白板动作（跳转静默重放时用） |
| `buildActionNavigationTargets` 等 4 个 | 台词行号、前后可跳转句 |

**为什么**：跳转不能乱跳——目标之前的"状态型动作"（如白板画了什么）必须能重放出来，否则画面是错的。

## 4. `src/core/choreography/timing.ts` —— 时序常量（单一事实来源）

常量：`EFFECT_AUTO_CLEAR_MS=5000`（聚光 5 秒后自动熄灭）、`DISCUSSION_TRIGGER_DELAY_MS=3000`
（讨论卡片延迟）、`DISCUSSION_AUTO_SKIP_MS=5000` 等。

函数 `estimateSpeechDurationMs(text, {speed})`：**无音频时的朗读时长估算**——中文 150ms/字、
英文 240ms/词、下限 2s、除以倍速。

**为什么**：播放引擎和（原项目）视频导出必须用同一组数字，否则节奏不一致；独立成模块即"改一处，两边同步"。

## 5. `src/core/choreography/cursor.ts` —— 播放游标解析

- `EMPTY_SCENE_DWELL`：无动作场景的"空白停留拍"（空文本 speech，约 2 秒停留）
- `resolvePlaybackCursor(scenes, sceneIndex, actionIndex)`：定位当前动作；场景 actions 耗尽自动推进到下一页；全部播完返回 null

**为什么**：没有剧本动作的页面不该瞬间闪过——应当像"老师停顿了一下"再翻页。

## 6. `src/core/choreography/index.ts` —— 出口（改写裁剪）

只 re-export timing + cursor。原项目还有 timeline/descriptors（视频导出/动画用），裁剪范围不需要。

## 7. `src/core/buffer/stream-buffer.ts` —— 打字机（互动文字节奏）

**业务角色**：登录用户提问后，老师回答的 SSE 文字在这里被"逐字吐出"，并和语音咬合（一问一答，无多角色轮次）。

| 方法 | 做什么 | 为什么（业务意义） |
|---|---|---|
| `pushText` | 文字增量入队（同句未封口就追加） | SSE 一段段来，先攒着 |
| `sealText` / `sealLastText` | 封口 = 这句话说完了 | **触发 `onSegmentSealed`，把完整句子交给 TTS**（语音只在文字写完才合成——"语音等文字"） |
| `tick()`（私有） | 每 30ms 揭示 1 字符 | 打字机效果的唯一来源 |
| `shouldHoldAfterReveal`（回调） | 文字显示完后，语音还在播就停住 | **"文字等语音"**：气泡停在当前句，直到该段音频播完（segmentDone 计数变化）才放行 |
| `pushAction` / `startAction` / `trackAction` | 动作排在文字之后执行 | 保证"先看到这句话，再看到聚光" |
| `pushAgentStart/End` / `pushDone` | 发言切换/本轮结束 | 单老师一问一答（发言切换仅一次）；done 后 `waitUntilDrained()` 完成，互动循环据此收尾 |
| `flush()` | 一次性揭示全部 | 恢复持久化会话时跳过打字机 |
| `pause/resume/dispose/shutdown` | 暂停/释放 | 用户暂停阅读时冻结节奏 |

## 8. `src/core/chat/agent-loop.ts` —— 互动循环

`runAgentLoop(request, callbacks, signal)`：登录用户每次提问触发一次一问一答循环——名单只有老师，一次循环内老师回答一次（一轮）；**多轮问答 = 用户连续多次提问，对话历史（messages）逐轮累积**——

1. `getStoreState()` 每轮刷新课堂快照（上轮 agent 可能改了白板/场景）；
2. `fetchChat()` POST `/api/chat`（完整上下文，后端无状态）；
3. 解析 SSE（`data: {...}` 按 `\n\n` 切分），每条 `onEvent()`；
4. `onIterationEnd()` 读本轮结果；
5. 退出条件：`cue_user`（该学生发言）→ 停；导演 END 无 agent 发言 → 停；连续两轮空 → 停；abort → 停。

**为什么照搬**：学生互动逻辑必须与原项目一致；通过回调注入与 Vue 解耦，前端和测试共用一套。

## 9. `src/core/quiz/grading.ts` —— 选择题本地判分

- `arraysEqual`：排序后比对（多选答案顺序无关）
- `toArray`：单值/数组归一化
- `isShortAnswer`：是否简答题（简答走 AI 判分）
- `gradeChoiceQuestions`：逐题判分，返回 `{ correct, status, earned }`

**为什么照搬**：判分规则必须和原项目一致。

---

# 二、2.2 改写/新建文件（11 个）

> 为什么改写：要么因为裁剪（只留 speech+spotlight），要么因为依赖简化（去掉 IndexedDB/供应商注册表），
> 要么是 Zustand→Pinia 的框架翻译。**共同原则：字段名、方法名、行为语义与原项目一致**。

## 10. `src/core/action/engine.ts` —— 动作执行器（裁剪版）

**业务角色**：引擎说"执行"，它真的去做。原项目支持 20 多种动作；我们裁剪为两种，其余 no-op。

| 方法 | 做什么 | 为什么 |
|---|---|---|
| `execute(action, {silent})` | 分发动作：spotlight 立即执行；speech 返回 Promise（播完才 resolve）；其余 no-op | 裁剪范围只保留聚光+语音；no-op 让照搬引擎里未使用的分支永不真执行 |
| `executeSpotlight` | 写 canvas store（setSpotlight）+ 安排 5 秒自动清除 | 引擎→store→组件：执行器不碰 DOM |
| `executeSpeech` | 挂 onEnded → audioPlayer.play()，播完 resolve | 引擎据此走下一步（语音文字同步的执行端） |
| `clearEffects()` / `resetPlaybackVisualState()` | 清特效/重置视觉状态 | 引擎翻页、跳转前调用 |
| `dispose()` | 清理定时器 | 防内存泄漏 |

## 11. `src/core/audio/audio-player.ts` —— 音频播放器（简化版）

| 方法 | 做什么 |
|---|---|
| `play(audioId, audioUrl)` | 优先播 audioUrl（后台/mock 音频）；无 URL 查本地缓存；都没有返回 false（引擎转阅读计时） |
| `onEnded(cb)` | 播完回调（引擎走下一步的信号） |
| `pause/resume/stop` | 暂停/恢复/停止；内部 requestToken 令牌防止旧播放回调干扰新播放 |
| `setPlaybackRate/setVolume/setMuted` | 倍速/音量/静音，实时作用于当前音频 |
| `cacheAudio` | 写入内存缓存（原项目 IndexedDB，mock 阶段简化） |

**为什么改写**：原项目用 Dexie/IndexedDB 存客户端 TTS；mock 阶段音频走 URL，内存缓存够用，接口一致，将来可换回 IndexedDB（TODO T-09）。

## 12. `src/core/audio/provider-enablement.ts` —— TTS 可用性判断（简化版）

`isTTSProviderConfigured`（有无凭据）、`isTTSProviderEnabled`（configured 且未被禁用）、
`hasAnyEnabledTTSProvider`、`listEnabledTTSProviderIds`。

**为什么改写**：原项目有完整供应商注册表；我们只有 browser-native，简化成"browser-native 永远可用，其他需 apiKey/baseUrl"。引擎判断"能否用浏览器 TTS 兜底"靠它。

## 13. `src/core/logger.ts` —— 日志（新建）

`createLogger(module)` 返回带前缀的 debug/info/warn/error。替换原项目自定义 logger，让照搬代码里的 `log.warn(...)` 能跑。

## 14. `src/types/chat.ts` —— 互动类型（裁剪）

`StatelessEvent`（SSE 事件联合：agent_start/text_delta/action/agent_end/done/...）、
`DirectorState`（导演记账本：轮次+已发言+白板台账）、`ParsedAction`、`SessionType`（裁剪为 qa）/`Status`/`Config`（Phase 8 预留）。

**为什么**：打字机和互动循环的编译前提；字段与原项目一致，将来接后台 SSE 协议不用改类型。

## 15. `src/types/provider.ts` —— ThinkingConfig（裁剪）

传给后台的思考配置（模式/努力程度/预算 token）。字段语义一致、枚举简化；只做透传。

## 16. `src/types/agent.ts` —— AgentConfig（裁剪）

`AgentConfig`：id/name/role/persona/avatar/color/allowedActions/priority。
`persona` 字段名沿用原项目契约（含义是角色人设）。

## 17. `src/stores/canvas.ts` —— 灯光控制台（Zustand→Pinia）

**业务角色**：所有"表演状态"（聚光、高亮、激光、缩放、白板开关、视频播放、画布视口），但不存幻灯片数据本身。

方法：`setSpotlight`（聚光目标+变暗度）、`clearAllEffects`（全清）、
`setWhiteboardOpen/setWhiteboardClearing`（无白板功能，仅供引擎状态保持）、
`pauseVideo/playVideo`、`setHighlight/setLaser/setZoom`（类型保留）。

**关键设计**：导出时挂 `getState()` 兼容层——Pinia 的 store 是函数，而照搬引擎用 Zustand 风格
`useCanvasStore.getState()`，兼容层让引擎零改动。

## 18. `src/stores/settings.ts` —— 偏好（Zustand→Pinia）

状态：`ttsEnabled/ttsProviderId/ttsProvidersConfig/ttsSpeed/ttsMuted/ttsVolume/ttsVoice/playbackSpeed/selectedAgentIds`。
引擎读它判断浏览器 TTS 兜底、读取语速；Phase 8 一问一答固定老师（selectedAgentIds 仅含 default-1）。同样带 `getState()` 兼容层。

## 19. `src/stores/stage.ts` —— 舞台（Zustand→Pinia）

**业务角色**：课堂数据的"唯一真相源"：`stage`（课程元信息）、`scenes`（全部剧本）、
`currentSceneId`（当前第几页）、`mode`。

方法：`setStage/setScenes`（加载课堂）、`setCurrentSceneId`（**翻页的唯一入口**）、
`updateScene`、`getSceneById`、`currentScene`（getter）、`clearStore`（切换课程清理）。

## 20. `src/stores/agent-registry.ts` —— 演员名单（Zustand→Pinia）

`agents` 字典 + `addAgent/updateAgent/getAgent/listAgents`；默认内置"AI 老师"（default-1，
allowedActions 只有 spotlight+speech，与裁剪范围一致）。一问一答固定由老师（default-1）回答；名单仅含老师。

---

# 三、总结：为什么这样分工

| 层面 | 文件 | 职责一句话 |
|---|---|---|
| 调度 | engine.ts | 决定"下一步干什么" |
| 执行 | action/engine.ts + audio-player.ts | 真的去做（说话/聚光） |
| 节奏 | stream-buffer.ts + timing.ts | 决定"多快、多慢、何时等" |
| 状态 | 4 个 Pinia store | 数据与表演状态的"唯一真相源" |
| 循环 | agent-loop.ts | 学生提问的循环骨架 |
| 契约 | 3 个 types | 让所有模块按同一套结构对话 |

**核心心法**：调度层只做决策、执行层只改 store、组件只读 store——所以引擎可以"原样照搬"，
框架差异（Zustand→Pinia）全部收在兼容层里。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-07 | 初版：依据 Phase 1 完成后的讲解整理输出 |
| 2026-08-07（二）| 范围调整：互动仅「登录用户 ↔ 老师」一问一答，移除多角色讨论；手册同步更新 |
| 2026-08-07（三）| 理解修正：互动为「用户 ↔ 老师」**多轮问答**（每轮 = 提问 → 回答），非单轮；手册措辞同步修正 |
