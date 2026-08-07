# Phase 2 工作参考手册（逐文件 / 逐方法业务讲解）

> 本手册依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 内容定义：逐文件说明文件作用与功能，并对所有主要方法/函数逐个讲解（做什么、为什么这样做）。
> 手册结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么照搬/改写/新建」组织。

## 1. `mock/classroom.ts` —— 示例课堂数据

**文件作用**：给整个课堂播放提供一份"假数据剧本"。原项目的课堂由 AI 生成管线产出，
本项目无生成功能（已裁剪），因此用这份固定数据代替，让课堂页、播放引擎、
互动循环都能拿到真实结构的数据（需求 6 的 mock 落地）。

**主要导出/内容**：

| 导出 | 做什么 | 为什么 |
|---|---|---|
| `MOCK_CLASSROOM_ID = 'demo'` | 示例课程 id | 课堂路由 `/classroom/demo` 用它 |
| `mockClassroomStage` | 课程元信息（name/languageDirective/agentIds...） | Stage 契约；languageDirective 决定老师用什么语言讲解 |
| `mockClassroomScenes` | 4 个场景：slide（封面）→ quiz（测验）→ interactive（模拟实验）→ slide（总结） | 覆盖三种场景类型；每页 actions 只含 speech+spotlight（裁剪范围） |
| `mockClassroomsSummary` | 首页列表项 | HomePage 展示入口用 |

**为什么新建**：无原文件可搬（生成管线在服务端）；数据结构严格对照 DSL 类型，
保证渲染器/引擎能直接消费。

## 2. `src/api/client.ts` —— 统一接口层

**文件作用**：所有后端调用的"唯一出口"。原项目前端散落 fetch，本项目收口到一个文件，
将来接真实后端时**只改这里**（TODO T-13）。

| 方法 | 做什么 | 为什么 |
|---|---|---|
| `listClassrooms()` | 返回课堂列表（mock：1 条） | 首页入口；原项目无列表页，这是本项目新增的最小接口 |
| `getClassroom(id)` | 按 id 返回 `{ stage, scenes }`；未知 id 抛错 | 课堂页加载；返回结构即 DSL 的 Stage+Scene |
| `chatStream(body, signal)` | 返回 SSE 事件流（一问一答） | 互动循环（agent-loop）的 fetchChat 入口；签名与真实 `/api/chat` 一致 |
| `synthesizeTts({text,...})` | 返回音频 URL（mock：静音 WAV） | 语音播放链路的占位（TODO T-01） |
| `gradeQuiz({question,userAnswer,...})` | 返回 `{ score, comment }` | 简答题判分占位（Phase 5 接入） |

## 3. `src/api/mock/chat-sse.ts` —— mock 聊天 SSE

**文件作用**：模拟后端 `/api/chat` 的 SSE 输出，让 agent-loop 的解析逻辑（getReader +
`\n\n` 切分 + `data: ` 剥除）在 mock 阶段就跑真实代码路径。

| 方法 | 做什么 |
|---|---|
| `chunkText(text, size)` | 把回答切成 8 字一段，模拟网络分片 |
| `createMockChatResponse(_body, _signal)` | 组装事件数组 → 编码成 SSE 文本流 → 返回 Response |

**为什么**：事件协议（agent_start/text_delta/agent_end/done）与 `lib/types/chat.ts` 的
StatelessEvent 完全一致；将来切真实后端，解析代码零改动。

## 4. `src/api/mock/tts.ts` —— mock TTS

**文件作用**：占位 TTS，返回一段**静音 WAV** 的 data URL，让 AudioPlayer 能真正播放并触发
`onEnded`（否则音频链路是断的）。

| 方法 | 做什么 |
|---|---|
| `buildSilenceWavDataUrl(durationSeconds)` | 手工构造 WAV 头 + 静音采样，base64 编码 |
| `writeAscii(view, offset, text)` | 往 DataView 写 ASCII（RIFF/WAVE 头） |
| `mockSynthesizeTts(input)` | 按文本长度估算时长，返回 `{ format:'wav', audioUrl }` |

**为什么新建**：临时占位；后台若自带音频，本文件可整体移除（TODO T-01）。

## 5. `src/api/mock/quiz-grade.ts` —— mock 简答判分

`mockGradeQuiz(input)`：非空作答给 90% 分 + 评语，空作答 0 分。出参 `{ score, comment }`
对齐真实 `/api/quiz-grade`（Phase 5 接入）。

## 6. `src/pages/HomePage.vue` —— 课堂入口

onMounted 调 `listClassrooms()` → 渲染课堂卡片列表 → 点击进 `/classroom/:id`。
loading / error 三态齐全。对应原 `app/page.tsx`（无生成功能）。

## 7. `src/pages/ClassroomPage.vue` —— 课堂页（数据链路打通）

**文件作用**：进入课堂页后真正把 mock 数据写进 stage store，证明「页面 → 接口 → store」链路已通。

| 部分 | 做什么 | 为什么 |
|---|---|---|
| `onMounted` | `getClassroom(id)` → `setStage` + `setScenes` + `setCurrentSceneId(第一页)` | 数据写入唯一真相源（stage store） |
| `currentScene`（computed） | 由 `currentSceneId` 派生当前场景 | 后续所有渲染器都从这里取数据 |
| 场景列表（模板） | 点击切换 `setCurrentSceneId` | 翻页入口（Phase 3 起由播放引擎接管） |
| 动作清单展示 | 把 speech/spotlight 显示成可读文本 | Phase 3 前的数据展示占位 |

## 8. `src/api/__tests__/client.test.ts` —— 接口层测试

4 个用例：列表、课堂数据（三场景 + 动作白名单 speech/spotlight）、未知 id 抛错、
SSE 一问一答协议（agent_start 开头、done 结尾）。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-07 | 初版：依据 Phase 2 完成后的讲解整理输出 |
