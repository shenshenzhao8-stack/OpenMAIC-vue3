# Phase 1 完成说明：核心纯 TS 移植（整个项目的地基）

> 本文件依据项目规则二（每阶段完成后对照原项目源码讲解）编写。
> 原项目路径：`/Users/mac/OpenMAIC`（或本机 worktree `/Users/mac/.codex/worktrees/186c/OpenMAIC`）。

## 当前有效范围（与 Phase 0 一致，无新变更）

- 页面：只有首页（课堂入口）与课堂播放页 `/classroom/:id`，无生成页 / 生成预览页，主业务在课堂播放；
- 场景：slide / quiz / interactive 三种；
- 教学动作：speech（讲解）+ spotlight（聚光）；
- 课堂数据由 mock 提供，不做生成流程；
- 互动：仅登录用户与老师两个角色的一问一答、**可多轮**（用户连续提问，对话历史逐轮累积；每轮 = 用户提问 → 老师回答），无多角色讨论（导演多 agent 编排、圆桌、讨论动作不在范围）；播放引擎调度、语音文字同步与学生提问互动逻辑与原项目一致；
- AI 部分由后台接口承接，现阶段以 mock 保证流程完整。

## 一、阶段目标

把「播放、互动、语音同步」的**纯逻辑层**全部搬进 Vue 工程，使项目在没有任何界面时
就拥有完整可测的"大脑"：
1. 照搬播放引擎（磁带机）与配套（游标解析、导航判断、时序常量）；
2. 照搬打字机（StreamBuffer）与互动循环（agent-loop）；
3. 裁剪版动作执行器（speech + spotlight）；
4. 简化版音频播放器与 TTS 启用判断；
5. Pinia 状态仓库（canvas / settings / stage / agent-registry）；
6. 三个冒烟测试验证核心链路。

## 二、文件对照表（一一对应）

### 2.1 照搬文件（代码逻辑与原项目一致，含少量无分号/类型注解等风格差异；仅改 import 路径 + 文件头中文说明）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/core/playback/engine.ts`（940 行） | `lib/playback/engine.ts`（899 行） | 播放引擎：状态机 + processNext 磁带机 + 讨论/打断 | **照搬**。需求 3 要求调度逻辑与项目一致；sed 只改 10 处 import 路径（@/lib/* → @/core/* / @/types/* / @/stores/*），逻辑零改动；文件头新增中文总述与方法功能一览 |
| `src/core/playback/types.ts` | `lib/playback/types.ts` | 引擎类型（状态机/快照/回调） | **照搬**（纯类型，无依赖） |
| `src/core/playback/action-navigation.ts` | `lib/playback/action-navigation.ts` | 可跳转性判断（引擎 jumpToAction 依赖） | **照搬**；仅改 import '@/lib/types/action' → '@/types/action' |
| `src/core/choreography/timing.ts` | `lib/choreography/timing.ts` | 时序常量 + 无音频朗读时长估算 | **照搬**（纯 TS 零依赖） |
| `src/core/choreography/cursor.ts` | `lib/choreography/cursor.ts` | 播放游标解析 resolvePlaybackCursor | **照搬**；`@openmaic/dsl` 由 alias 解析 |
| `src/core/choreography/index.ts` | `lib/choreography/index.ts` | 模块出口 | **改写（裁剪）**：去掉 timeline/descriptors（无视频导出/动画），只导出 timing + cursor |
| `src/core/buffer/stream-buffer.ts`（770 行） | `lib/buffer/stream-buffer.ts`（749 行） | 打字机：逐字揭示、封口、等语音 | **照搬**；仅改 import '@/lib/types/chat' → '@/types/chat' |
| `src/core/chat/agent-loop.ts`（294 行） | `lib/chat/agent-loop.ts`（272 行） | 互动循环：发请求→读 SSE→判断是否再来一轮 | **照搬**；仅改 3 处 import 路径 |
| `src/core/quiz/grading.ts` | `lib/quiz/grading.ts` | 选择题本地判分 | **照搬**；仅改 import '@/lib/types/stage' → '@/types/stage' |

### 2.2 改写/新建文件（因裁剪或依赖简化，重写并全中文注释）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/core/action/engine.ts` | `lib/action/engine.ts`（约 900 行） | 动作统一执行层 | **改写（裁剪）**：只实现 spotlight + speech；laser/白板/视频/widget 分支 no-op。原因：需求 2 只保留聚光 + 讲解语音；保留 execute/clearEffects/resetPlaybackVisualState/dispose 接口供照搬引擎调用 |
| `src/core/audio/audio-player.ts` | `lib/utils/audio-player.ts` | HTMLAudio 封装 | **改写（简化）**：原项目用 Dexie/IndexedDB 缓存音频，本项目 mock 阶段音频走 URL，本地缓存先用内存 Map，接口保持一致 |
| `src/core/audio/provider-enablement.ts` | `lib/audio/provider-enablement.ts` | TTS 供应商启用判断 | **改写（简化）**：去掉 TTS_PROVIDERS 注册表与自定义供应商逻辑，保留 browser-native + 通用凭据规则 |
| `src/core/logger.ts` | `lib/logger.ts` | 日志工具 | **改写（简化）**：带模块前缀的 console 封装 |
| `src/types/chat.ts` | `lib/types/chat.ts` | StatelessEvent / DirectorState 等互动类型 | **改写（裁剪）**：只保留 stream-buffer 与 agent-loop 依赖的类型 |
| `src/types/provider.ts` | `lib/types/provider.ts` | ThinkingConfig | **改写（裁剪）**：枚举简化，字段语义一致 |
| `src/types/agent.ts` | `lib/orchestration/registry/types.ts` | AgentConfig | **改写（裁剪）**：保留核心字段 |
| `src/stores/canvas.ts` | `lib/store/canvas.ts`（Zustand） | 表演状态（聚光/白板/视频/视口） | **改写为 Pinia**：字段/action 名一致；导出时挂 `getState()` 兼容层，让照搬代码 `useCanvasStore.getState()` 零改动 |
| `src/stores/settings.ts` | `lib/store/settings.ts`（Zustand） | 偏好（TTS/倍速/选人） | **改写为 Pinia**：同上，带 getState 兼容层 |
| `src/stores/stage.ts` | `lib/store/stage.ts`（Zustand） | 舞台数据（stage/scenes/currentSceneId/mode） | **改写为 Pinia**：裁剪掉生成/大纲/聊天持久化；保留播放必需字段与 action |
| `src/stores/agent-registry.ts` | `lib/orchestration/registry/store.ts`（Zustand） | Agent 名单 | **改写为 Pinia**：默认内置 AI 老师（default-1），纯内存 |

### 2.3 测试

| 新工程文件 | 原项目对应 | 功能 |
|---|---|---|
| `src/core/__tests__/playback-engine.test.ts` | `tests/playback/*.test.ts` | 引擎按顺序消费 [speech, spotlight, speech, spotlight]；播完 idle |
| `src/core/__tests__/stream-buffer.test.ts` | 原项目无独立文件（行为来自源码设计） | 逐字揭示、封口触发 onSegmentSealed、done 后 drain |
| `src/core/__tests__/agent-loop.test.ts` | 原项目前端 hook 与 eval 共用该循环 | 一轮 SSE 流 → cue_user 正确结束 |

## 三、关键设计决策

1. **照搬保真策略（cp + sed + 中文头注释）**：能原样复制的文件直接 `cp`，用 sed 只替换 import 路径，
   逻辑零改动；文件头新增详细中文说明与方法功能一览（满足规则一第 5 条）。比手打重写更可靠，不会引入笔误。
2. **Pinia getState 兼容层**：原项目引擎用 Zustand 的 `useXxxStore.getState()`，Pinia 的 store 是函数。
   在 store 导出时 `Object.assign` 挂 `getState()` 转发到实例，照搬代码一行不用改（这是 Phase 1 遇到并解决的关键适配）。
3. **裁剪集中在「执行层与依赖」**：ActionEngine 只留 speech+spotlight；AudioPlayer 去掉 IndexedDB；
   provider-enablement 去掉供应商注册表。播放引擎本体零裁剪（需求 3）。
4. **类型先行**：chat/provider/agent 类型是打字机与循环的编译前提，字段与原项目保持一致。

## 四、遇到的问题与处理

| 问题 | 原因 | 处理 |
|---|---|---|
| `useCanvasStore.getState is not a function` | Zustand 与 Pinia API 差异 | store 导出加 getState 兼容层（见关键决策 2） |
| `updateScene` 判别联合类型报错 | Scene 是判别联合，Partial 展开丢失判别信息 | 显式 `as Scene` 断言并加注释 |
| 引擎测试断言字符截取笔误 | `slice(0,4)` 取 4 字符，期望写了 5 字符 | 修正断言 |

## 五、验证结果

- `npx vue-tsc --noEmit`：通过
- `npm run test`（vitest）：4 个测试文件 / 8 个用例全部通过
- `npm run build`（vite build）：通过

## 六、范围变更记录

2026-08-07（二）：互动范围调整——仅保留「登录用户 ↔ 老师」两个角色的问答，**可多轮**（用户连续提问，对话历史逐轮累积；每轮 = 用户提问 → 老师回答），移除多角色讨论。影响：SessionType 裁剪为 qa；agent-registry 仅老师；每次提问触发一次 agent-loop（单老师一次回答）；圆桌/讨论动作不实现。关联原项目：lib/orchestration（导演图）、components/roundtable、discussion 动作。

## 七、下一步

Phase 2（mock 课堂数据与接口层）：`mock/classroom.ts`（含 slide/quiz/interactive 三种场景、
speech+spotlight 动作的完整课程 JSON）、`src/api/` 接口层（chat SSE / tts / quiz-grade 的 mock 实现），
以及课堂加载逻辑，让课堂播放页能真正拿到数据。

## 八、红线修正记录（2026-08-07）

用户人工审核发现：Phase 1 照搬文件中存在大量英文注释，违反「代码注释必须为详尽中文」红线。

### 整改内容

1. **规则修正**（`/Users/mac/OpenMAIC/AGENTS.md` 规则一第 5 条，两份同步）：
   取消「照搬文件可保留原英文注释」的例外，改为红线规定——所有注释必须为中文；
   照搬文件的原英文注释必须翻译为中文，同时保持代码逻辑逐行不变；
   英文仅允许出现在代码标识符、字符串字面量、URL 中。
2. **代码修正**：对 Phase 1 全部照搬文件做了「中文业务注释重写」，注释不是机械英译中，
   而是结合代码逻辑与业务场景讲解（如 StreamBuffer 的封口→TTS 入队→等语音播完，
   引擎的打断讲课→保存位置→讨论结束恢复）：
   - `src/core/playback/engine.ts`（916 行）
   - `src/core/playback/types.ts`
   - `src/core/playback/action-navigation.ts`
   - `src/core/buffer/stream-buffer.ts`（760 行）
   - `src/core/chat/agent-loop.ts`
   - `src/core/choreography/timing.ts`、`cursor.ts`
   - `src/core/quiz/grading.ts`
3. **红线扫描**：`rg "^\s*(//|\*)\s*[A-Za-z]"` 全量检查 src——残留的「英文字母开头」行
   均为中文注释以标识符/缩写开头（TTS/SSE/Chrome/Pinia 等），无英文叙述性注释；
   工具指令 `// eslint-disable-*` 属规则允许范畴。
4. **验证**：`vue-tsc --noEmit` 通过；vitest 4 文件 8 用例通过；`vite build` 通过。
   说明：重写过程中保持代码逻辑逐行不变，测试全绿即为逻辑未变的佐证。

## 九、代码对照审计记录（2026-08-07）

对 8 个「照搬文件」与原项目做了自动化逐行比对（先去注释、去 import、去行尾分号，再 diff）：

| 文件 | 差异行数（去分号后） | 差异性质 |
|---|---|---|
| engine.ts | 修复前 9 实质差异 / 修复后 0（另 2 处为无分号风格导致的伪差异） | 7 处缺显式类型注解 + 2 处尾随空格（已修复） |
| stream-buffer.ts | 修复前 10 实质差异（1 文案 + 9 尾随空格）/ 修复后 0；另 9 处为无分号风格导致的伪差异 | 1 处错误消息文案 `'Buffer disposed'`→`'Buffer already disposed'`（已修复）+ 9 处尾随空格（已清理） |
| playback/types.ts / action-navigation.ts / timing.ts / cursor.ts / agent-loop.ts / grading.ts | 0 | 无差异 |

结论：
1. **8 个照搬文件逻辑一致**（去风格差异后 diff 为 0）；
2. 修复前存在两类偏差：① 行尾分号（全局风格差异，功能等价，保留本项目无分号风格）；② 上述 19 处细节（已全部修复）；
3. 措辞修正：此前文档写「逐行一致」不精确，应为「代码逻辑一致，存在无分号等风格差异」。

> 范围变更（2026-08-11，Phase 4.1）：教学动作新增 laser（激光笔）；slide 元素类型收敛为
> text / shape / line / image 四类（latex / chart / table / video / code 的类型与实现已删除，
> 含 katex 依赖）。详见 docs/PHASE-4.1.md。

> 范围变更（2026-08-11，Phase 5）：测验无判分业务——无得分 / 无 AI 判分 / 无解析讲解；
> 复盘仅「选择题显示对错、简答题显示参考答案」。详见 docs/PHASE-5.md。
