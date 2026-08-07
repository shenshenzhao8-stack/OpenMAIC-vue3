# Phase 2 完成说明：mock 课堂数据 + 接口层

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（沿用 Phase 0/1，无新变更）

- 页面：首页（课堂入口）+ 课堂播放页 /classroom/:id；无生成页；
- 场景：slide / quiz / interactive；
- 教学动作：speech + spotlight；
- 互动：登录用户 ↔ 老师多轮一问一答，无多角色讨论；
- 课堂数据由 mock 提供（本阶段落地）；AI 由后台接口承接，现阶段 mock。

## 一、阶段目标

1. 建立 `mock/classroom.ts`：一份完整示例课程（三种场景、speech+spotlight 动作）；
2. 建立统一接口层 `src/api/client.ts`（课堂加载/列表、聊天 SSE、TTS、判分的 mock 实现），
   签名与真实后端一致，便于将来无痛切换（TODO T-13）；
3. 首页接入 mock 课堂列表；课堂页真正加载数据并写入 stage store；
4. 配套测试与全部文档。

## 二、文件对照表（一一对应）

### 2.1 mock 数据

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `mock/classroom.ts` | 无直接对应文件（原项目课堂由生成管线产出）；数据形状对照 `@openmaic/dsl` 的 Stage/Scene/Slide/Quiz 类型与 `lib/server/classroom-generation.ts` 输出 | 生成课堂的结构化结果 | **新建（mock）**：需求 6 要求 AI 由后台承接、现阶段 mock 保证流程完整；本文件提供「光合作用」示例课程，含 4 个场景（slide/quiz/interactive/slide），动作仅 speech+spotlight，speech 不填音频（后台真实数据自带，TODO T-01） |

### 2.2 接口层（mock）

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/api/client.ts` | 原项目无单一文件（前端各处直接 fetch /api/*；参考 `lib/api/stage-api.ts` 的收口思想） | —— | **新建（统一收口）**：把所有后端调用集中到一个文件，函数签名对齐真实接口；切真实后端只改本文件（TODO T-13） |
| `src/api/mock/chat-sse.ts` | `app/api/chat/route.ts` | 聊天 SSE 流（StatelessEvent 协议） | **新建（行为模拟）**：按 agent_start → text_delta×N → agent_end → done 输出一问一答 SSE 流，用 ReadableStream 实现，让 agent-loop 的解析代码与真实环境一致 |
| `src/api/mock/tts.ts` | `app/api/generate/tts/route.ts` | TTS 合成返回 base64 音频 | **新建（占位）**：返回一段静音 WAV 的 data URL，让 AudioPlayer 链路可走通；若后台自带音频可整体移除（TODO T-01） |
| `src/api/mock/quiz-grade.ts` | `app/api/quiz-grade/route.ts` | 简答题 AI 判分 | **新建（占位）**：按作答长度打分，入参/出参形状对齐真实接口（Phase 5 接入） |

### 2.3 页面接线

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/pages/HomePage.vue` | `app/page.tsx` | 首页 | **改写**：接入 mock 课堂列表（listClassrooms），点击进入课堂；无生成功能 |
| `src/pages/ClassroomPage.vue` | `app/classroom/[id]/page.tsx` | 课堂页 | **改写（简化）**：加载课堂 → 写入 stage store（stage/scenes/currentSceneId）→ 展示课程信息、场景列表、当前场景动作清单（数据展示占位；真正渲染在 Phase 3-6） |

### 2.4 测试

| 文件 | 说明 |
|---|---|
| `src/api/__tests__/client.test.ts` | 4 个用例：列表、课堂数据三场景+动作白名单、未知 id 抛错、SSE 一问一答协议 |

## 三、验证结果

- `vue-tsc --noEmit`：通过
- `npm run test`（vitest）：5 个测试文件 / 12 个用例全部通过
- `npm run build`：通过（47 modules）

## 四、范围变更记录

无新变更（沿用 Phase 0/1 范围）。T-07（课堂加载接口形态）与 T-13（mock→真实切换机制）已落实，见 TODO。

## 五、红线自检

本阶段所有文件注释均为中文业务讲解（含 mock 数据的字段含义、接口对齐说明）；无英文叙述性注释。
