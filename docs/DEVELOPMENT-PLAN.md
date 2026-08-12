# OpenMAIC-Vue3 开发计划（总览）

> 本文件是项目开发计划的「唯一权威入口」。日常开发对照本文件执行；
> 计划发生变更时，同步更新本文件并在对应 PHASE 文档中记录（AGENTS.md 规则二第 5 条）。
> 最后更新：2026-08-10（Phase 2 完成）。

## 一、项目概述

把 OpenMAIC（开源多智能体互动课堂平台）以 **Vue 3 技术栈**复刻为前端单应用：

- 技术栈：Vue 3 + Vite + TypeScript + Vue Router + Pinia（不用 Nuxt、不用 monorepo）
- 裁剪范围：课堂生成 / 多角色讨论 / 白板 / 编辑器 / 导出等一律不做
- AI 部分：由后台接口承接，现阶段以 mock 保证流程完整
- 原项目路径：`/Users/mac/OpenMAIC`（或本机 worktree `/Users/mac/.codex/worktrees/186c/OpenMAIC`）

## 二、当前有效范围（永久有效）

| 维度 | 范围 |
|---|---|
| 页面 | 首页（课堂入口）+ 课堂播放页 `/classroom/:id`；**无生成页 / 生成预览页** |
| 场景 | slide / quiz / interactive 三种 |
| 教学动作 | speech（讲解语音）+ spotlight（聚光） |
| 互动 | 仅登录用户 ↔ 老师两个角色，一问一答、**可多轮**（用户连续提问，对话历史逐轮累积；每轮 = 提问 → 回答）；**无多角色讨论** |
| 课堂数据 | 由 mock 提供（`mock/classroom.ts`），不做生成流程 |
| 行为一致性 | 播放引擎调度、语音文字同步、学生提问互动逻辑与原项目一致 |

## 三、已定技术决策

1. **单应用**：Vue 3 + Vite + TS + Router + Pinia，不使用 monorepo、不装 Nuxt。
2. **自建类型替代 @openmaic/dsl**：数据结构类型写在 `src/types/dsl/`，通过
   Vite alias + tsconfig paths 让 `@openmaic/dsl` 解析到本地，照搬代码无需改 import。
3. **照搬策略**：纯 TS 逻辑（播放引擎/打字机/互动循环等）原样搬入 `src/core/`，
   只改 import 路径 + 注释翻译为中文业务讲解；UI 组件用 Vue 重写。
4. **Pinia getState 兼容层**：照搬代码用 Zustand 风格 `useXxxStore.getState()`，
   在 Pinia store 导出时挂 `getState()` 转发，引擎零改动。
5. **统一接口层**：所有后端调用收口到 `src/api/client.ts`，mock → 真实后端只改该文件。
6. **注释红线**：所有注释必须为中文业务讲解（做什么/怎么做/为什么），禁止英文叙述性注释。
7. **提交控制（规则五）**：每完成一个 Phase **不自动 git 提交/推送**，由用户人工审核后自行提交。

## 四、目录结构

```
openmaic-vue3/
├─ mock/                     # mock 课堂数据（mock/classroom.ts）
├─ docs/                     # 阶段文档 + 参考手册 + 本计划
│  ├─ DEVELOPMENT-PLAN.md    # ← 本文件
│  ├─ PHASE-{x}.md           # 阶段完成说明（对照原项目）
│  └─ REFERENCE-PHASE-{x}.md # 工作参考手册（逐文件/逐方法）
├─ src/
│  ├─ types/
│  │  ├─ dsl/                # 自建类型（alias 目标）：action/slides/stage
│  │  ├─ stage.ts            # 应用侧 Scene 收口
│  │  ├─ action.ts           # 应用侧动作收口
│  │  ├─ chat.ts             # StatelessEvent/DirectorState（问答）
│  │  ├─ provider.ts         # ThinkingConfig
│  │  └─ agent.ts            # AgentConfig
│  ├─ core/                  # 照搬纯 TS（逻辑层）
│  │  ├─ playback/           # engine.ts / types.ts / action-navigation.ts
│  │  ├─ action/             # ActionEngine（裁剪：speech+spotlight）
│  │  ├─ buffer/             # StreamBuffer（打字机）
│  │  ├─ chat/               # agent-loop（一问一答循环）
│  │  ├─ choreography/       # timing.ts / cursor.ts
│  │  ├─ audio/              # audio-player / provider-enablement
│  │  ├─ quiz/               # grading.ts
│  │  └─ logger.ts
│  ├─ stores/                # Pinia：stage/canvas/settings/agent-registry
│  ├─ api/                   # 统一接口层 + mock（chat-sse/tts/quiz-grade）
│  ├─ composables/           # Phase 3+：usePlaybackEngine/useChatSession 等
│  ├─ components/            # Phase 3+：stage/scenes/chat 等
│  ├─ pages/                 # HomePage / ClassroomPage
│  └─ router/
└─ vite.config.ts / tsconfig.json
```

## 五、核心业务链路（文件位置）

**链路 A：课堂播放**

```
mock/classroom.ts → client.getClassroom() → StageStore（stage/scenes/currentSceneId）
   → PlaybackEngine（磁带机，逐条消费 actions）
   → ActionEngine（speech→音频 / spotlight→聚光）
   → AudioPlayer + CanvasStore → 界面渲染
   → Choreography（游标 + 朗读计时兜底）→ StreamBuffer（字幕节奏）
```

**链路 B：登录用户 ↔ 老师多轮问答**

```
用户提问 → useChatSession（Phase 8）→ agent-loop（每次提问一轮）
   → client.chatStream()（SSE）→ StreamBuffer（逐字+封口+等语音）
   → 界面字幕 + ActionEngine 动作 + TTS/后台音频
   → done/cue_user → 等待用户下一次提问（历史逐轮累积）
```

## 六、分阶段计划

### Phase 0 · 工程骨架 + 自建类型模块 ✅ 已完成

- 目标：Vite + Vue3 + TS 单应用；自建类型替代 @openmaic/dsl；alias 打通。
- 主要文件：`vite.config.ts`、`tsconfig.json`、`src/types/dsl/*`、`src/types/stage.ts`、`src/types/action.ts`、路由与占位页。
- 验证：vue-tsc 通过；vitest 4 用例；build 通过。
- 提交：`fda0f56`（Phase 0/1 合并提交，规则五生效前）。

### Phase 1 · 核心纯 TS 移植 ✅ 已完成

- 目标：让项目在无界面时拥有完整可测的"大脑"。
- 照搬文件：`core/playback/engine.ts`（磁带机）、`playback/types.ts`、`action-navigation.ts`、
  `choreography/timing.ts`（时序+朗读估算）、`choreography/cursor.ts`（游标）、
  `buffer/stream-buffer.ts`（打字机）、`chat/agent-loop.ts`（问答循环）、`quiz/grading.ts`。
- 改写/新建：`core/action/engine.ts`（裁剪为 speech+spotlight）、`audio/*`（简化）、
  4 个 Pinia store（含 getState 兼容层）、`types/chat|provider|agent`。
- 审计：照搬文件与原项目逐行比对（去注释/分号）差异为 0；发现并修复 1 处错误消息文案。
- 验证：vitest 8 用例；build 通过。

### Phase 2 · mock 课堂数据 + 接口层 ✅ 已完成

- 目标：课堂页真正拿到数据。
- 文件：`mock/classroom.ts`（光合作用示例课程：slide/quiz/interactive）、
  `src/api/client.ts`（统一接口层）、`src/api/mock/chat-sse.ts`（一问一答 SSE）、
  `mock/tts.ts`（静音 WAV）、`mock/quiz-grade.ts`（占位判分）、页面接线。
- 验证：vitest 12 用例；build 通过。提交：`5ba0913`（规则五生效前）。

### Phase 3 · 页面框架 / 课堂外壳 ✅ 已完成

- 目标：课堂播放的「壳」——翻页、播放控制、场景分发。
- 需求规划：
  1. `SceneRenderer.vue`：按 `scene.type` 分发到三种渲染组件（slide/quiz/interactive 先占位）；
  2. `SceneProvider`（provide/inject）：把当前场景数据提供给子组件；
  3. 播放器外壳：场景侧边栏 + 顶栏（上一页/下一页/播放/暂停）；
  4. `usePlaybackEngine` composable（组合式函数）：把 PlaybackEngine 回调接到 Vue 响应式状态；
  5. （可选）播放位置持久化（T-10，localStorage）。
- 原项目文件对照：
  - `app/classroom/[id]/page.tsx`（课堂页接线）
  - `components/stage.tsx`（舞台根）、`components/stage/scene-renderer.tsx`（分发）、
    `scene-sidebar.tsx`、`header-controls.tsx`
  - `lib/contexts/scene-context.tsx`（SceneProvider/useSceneSelector）
  - `lib/api/stage-api-navigation.ts`（翻页语义）
- 验收：进入课堂页可看到场景列表与当前场景；点上一页/下一页切换；播放/暂停能驱动引擎。

### Phase 4 · Slide 渲染器 ✅ 已完成

> 范围偏差记录（2026-08-10）：计划 MVP 含 chart，实现时 chart 与 table/line/video/code 一并归入
> FallbackElement 占位；Phase 4.1（2026-08-11）最终决策：仅补充 line，chart / table / video / code 与 latex 一并删除（见 PHASE-4.1 删除记录）。

- 目标：把 Slide 数据渲染成画面（自适应画布 + 元素 + 聚光）。
- 需求规划：
  1. `SlideView.vue`：背景层 + 内容层（1000×562.5 逻辑坐标，整体 scale）；
  2. `useViewportSize`（量容器→算 fitScale→居中）；
  3. `ScreenElement.vue` + 元素组件（text/image/shape/latex/chart 优先，其余后补）；
  4. `SpotlightOverlay.vue`（DOM 测量 + SVG mask 聚光，5 秒自动熄灭）；
  5. 背景样式 composable（组合式函数）。
- 原项目文件对照：
  - `packages/@openmaic/renderer/src/SlideCanvas.tsx`、`hooks/useViewportSize.ts`
  - `lib/hooks/use-slide-background-style.ts`、`lib/utils/geometry.ts`
  - `components/slide-renderer/Editor/ScreenElement.tsx`、`Base*Element.tsx`、`SpotlightOverlay.tsx`
- 验收：mock slide 渲染成完整画面；播放时聚光按剧本在对应元素亮起并 5 秒后熄灭。

### Phase 5 · Quiz 场景 ✅ 已完成（2026-08-11）

- 目标：测验全流程（封面 → 答题 → 复盘），**无判分**——无得分 / 无 AI 判分 / 无解析讲解。
- 需求规划：
  1. `QuizView.vue`（3 相位：not_started → answering → reviewing）；
  2. 三种题型组件（单选 / 多选 / 简答）；
  3. 复盘：选择题显示对错（✓/✗，本地比较）；简答题显示参考答案；
  4. 作答草稿 localStorage 简化；
  5. 裁剪：删除 grading.ts / client.gradeQuiz / quiz-grade mock；QuizQuestion 去掉 points / analysis / commentPrompt / hasAnswer。
- 原项目文件对照：`components/scene-renderers/quiz-view.tsx`（状态机，简化相位）、`lib/quiz/grading.ts`（仅保留对错判断）。
- 验收：封面→答题→提交→复盘；选择题对错徽标；简答题参考答案；测试 44/44。

### Phase 6 · Interactive 场景 ✅ 已完成（2026-08-11）

- 目标：AI 生成的 HTML 在沙箱 iframe 中安全渲染，切页不丢状态。
- 需求规划：
  1. 安全补丁（iframe.ts 照搬）：storage shim + error shim + CSS；
  2. 保活池（Pinia 仿写）：entries/sceneId + LRU 上限 3 + owner 可见权；
  3. 分层：InteractiveRenderer 占位（登记+认领+上报矩形）→ InteractiveIframeHost（Teleport + fixed 覆盖 + visibility 保活）；
  4. sandbox 无 allow-same-origin（隔离）；无 widget 命令（已裁剪）。
- 原项目文件对照：lib/utils/iframe.ts、lib/store/interactive-iframe-pool.ts、interactive-renderer.tsx、InteractiveIframeHost.tsx。
- 验收：交互页显示 iframe；切走再切回状态不丢；测试 52/52。

### Phase 7 · 语音文字同步 ✅ 已完成（2026-08-12）

- 目标：字幕逐字 + 语音 + 特效按剧本同步。
- 需求规划：
  1. 字幕逐字：onSpeechStart → StreamBuffer（打字机）pushText+seal → onTextReveal 逐字更新；
  2. 倍速：顶栏循环切换（0.75-2）+ AudioPlayer 实时同步；
  3. 语音：后台音频（AudioPlayer）或朗读计时/浏览器 TTS 兜底；
  4. useDiscussionTTS 推迟到 Phase 8（唯一调用方是问答 UI，避免死代码；T-03 决定形态）。
- 原项目文件对照：PlaybackChromeRoot.tsx（引擎接线）、use-discussion-tts.ts（推迟）、stream-buffer.ts（已搬）。
- 验收：字幕逐字出现、音频播完才进下一句、特效穿插；暂停/恢复/倍速可用；测试 53/53。

### Phase 8 · 互动闭环（登录用户 ↔ 老师多轮问答）

- 目标：课堂中随时提问 → 打断讲课 → 老师回答 → 恢复讲课；支持多轮。
- 需求规划：
  1. `useChatSession` composable（组合式函数）（改写自 `use-chat-sessions.ts`）：sendMessage、
     SSE→buffer 翻译器、打断补"..."；
  2. `ChatArea.vue` 消息气泡 + 输入框；
  3. 引擎接线：`handleUserInterrupt`（打断→live）、`handleEndDiscussion`（恢复）；
  4. 每轮：用户提问 → `agent-loop` 一轮 → 老师回答 → cue_user 等待下一问（多轮靠历史累积）。
- 原项目文件对照：`components/chat/use-chat-sessions.ts`、`chat-area.tsx`、
  `lib/chat/agent-loop.ts`（已搬）、`engine.ts`（已搬）。
- 验收：多轮一问一答；播放中提问能打断并恢复；T-03 确认 SSE 是否带音频后决定语音实现。

### Phase 9 · 打磨与验收

- 目标：补齐边界测试与体验细节，输出验收清单。
- 内容：
  1. 引擎边界测试（pause/resume、跳转、打断、讨论分支休眠验证）；
  2. 加载/错误/空态；移动端基础适配；
  3. Playwright 冒烟（可选）：进入课堂 → 播放 → 提问 → 回答；
  4. README 使用说明 + mock 接口清单 + 如何切真实后端；
  5. 对照需求清单逐项验收（见下节）。

## 七、验收需求清单（最终标准）

| # | 需求 | 对应阶段 |
|---|---|---|
| 1 | 课堂数据可加载（mock）并展示三种场景 | Phase 2/3 |
| 2 | slide 渲染 + 聚光按剧本执行 | Phase 4 |
| 3 | quiz 答题/判分全流程 | Phase 5 |
| 4 | interactive iframe 渲染与保活 | Phase 6 |
| 5 | 字幕逐字 + 语音 + 聚光同步 | Phase 7 |
| 6 | 登录用户 ↔ 老师多轮一问一答（含打断恢复） | Phase 8 |
| 7 | 播放引擎调度与原项目一致 | Phase 1/3 |
| 8 | AI 全走后端接口、mock 保证流程完整、可无痛切换 | Phase 2/9 |

## 八、文档交付约定（每阶段）

1. `docs/PHASE-{x}.md`：阶段完成说明（对照原项目源码，一一对应 + 裁剪记录 + 验证结果）；
2. `docs/REFERENCE-PHASE-{x}.md`：工作参考手册（逐文件、逐主要方法讲解作用与业务意义）；
3. `TODO.md` 同步：范围变更更新、落实条目回填；
4. 对话中向用户讲解；**不自动 git 提交/推送（规则五）**；
5. 注释红线自检：全中文业务注释。

## 九、风险与待确认项（详见 TODO.md）

| 关键项 | 影响 | 触发 |
|---|---|---|
| T-01 / T-03 | 后台数据自带讲解稿+音频 → TTS 链路可能简化/移除 | 后台数据结构/SSE 协议确认 |
| T-02 | 后台字段命名是否与自建类型一致 | 后台接口文档就绪 |
| T-04 | 学生语音输入（STT）是否纳入 | 需求补充 |
| T-10 | 播放位置持久化（刷新恢复） | 需求确认 |
| T-05 | interactive widget 子类型范围 | 需求确认 |
| T-14 | 音频粒度（每句 vs 整段） | 后台数据结构确认 |

## 十、进度总览

| Phase | 内容 | 状态 | Git |
|---|---|---|---|
| 0 | 工程骨架 + 自建类型 | ✅ | fda0f56 |
| 1 | 核心纯 TS 移植 | ✅ | fda0f56 |
| 2 | mock 课堂数据 + 接口层 | ✅ | 5ba0913 |
| 3 | 页面框架 / 课堂外壳 | ✅ | 待人工审核后提交（规则五：未提交） |
| 4 | Slide 渲染器 | ✅ | 待人工审核后提交（规则五：未提交） |
| 4.1 | laser 激光笔 + slide 元素收敛四类 | ✅ | 待人工审核后提交（规则五：未提交） |
| 5 | Quiz 场景 | ✅ | 待人工审核后提交（规则五：未提交） |
| 6 | Interactive 场景 | ✅ | 待人工审核后提交（规则五：未提交） |
| 7 | 语音文字同步 | ✅ | 待人工审核后提交（规则五：未提交） |
| 8 | 互动闭环 | ✅ | 待人工审核后提交（规则五：未提交） |
| 9 | 打磨验收 | ⏳ 下一步 | - |

### Phase 4.1 · laser 激光笔 + slide 元素收敛四类 ✅ 已完成（2026-08-11）

- 目标：教学动作新增 laser（激光笔）；slide 元素收敛为 text / shape / line / image 四类。
- 新增：LaserOverlay（CSS 简化，不装 motion）、geometry 工具、LineElement（对照原 BaseLineElement）。
- 删除：latex 实现与 katex 依赖、chart / table / video / code 占位与类型定义（删除记录见 PHASE-4.1.md）。
- 验收：laser 按剧本执行并 5s 自动清除；四类元素渲染；grep 无多余类型残留；测试 39/39。
- 工作量：约 1-2 天（已完成）。
