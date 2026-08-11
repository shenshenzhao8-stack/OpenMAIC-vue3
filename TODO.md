# TODO —— 需求/变更点跟踪表

> 本文件记录「可能发生变更的需求点与改动点」，供开发过程中随时核对，避免按过期假设实现。
> 维护规则：依据当前 OpenMAIC 项目根目录 `AGENTS.md`（规则二/三）——
> ① 范围发生变更时，本表必须同步更新；② 每完成一个阶段，回到本表勾选已落实/已确认的条目。

## 当前状态（2026-08-11，Phase 4.1 完成）

| 编号 | 待确认 / 可能变更的点 | 当前假设 | 涉及阶段 / 文件 | 触发条件 / 来源 | 建议处理 |
|---|---|---|---|---|---|
| T-01 | **TTS 服务可能不需要**：后台返回的数据结构中同时包含「老师讲解稿（speech.text）」与「音频文件（audioUrl/audioId）」，前端可能无需再调用 TTS 接口 | 保留完整 TTS 链路（AudioPlayer + 浏览器 TTS + 朗读计时兜底 + useDiscussionTTS 队列，Phase 7 实现） | Phase 7 语音同步、`src/core/audio/*`、`src/api/`（mock TTS） | 用户确认：后台数据自带讲解稿与音频 | ① 播放主路径按「直接播数据里的 audioUrl」设计；② mock TTS 保留但标注「可能移除」；③ 待确认后台聊天 SSE 事件是否也携带音频（见 T-03） |
| T-02 | 后台数据结构字段命名是否与自建类型一致（`persona`、`audioId/audioUrl`、`scene/actions`、`content.canvas` 等） | 自建类型严格对齐原项目 `@openmaic/dsl` 命名 | `src/types/dsl/*`、`src/types/stage.ts`、`mock/classroom.ts` | 后台契约确定后 | 后台接口文档就绪后做「字段映射核对表」，不一致处加适配层（不改自建类型） |
| T-03 | 后台聊天 SSE 事件是否携带老师回答的音频（如 `agent_end` / `text_delta` 附带 `audioUrl`） | 假设 SSE 只推文本与动作，语音走独立 TTS 队列（useDiscussionTTS） | Phase 8 互动闭环、`src/core/chat/agent-loop.ts`、`src/core/buffer/stream-buffer.ts` | 后台 SSE 协议确认 | 若事件自带音频：useDiscussionTTS 简化为「收到 audioUrl 直接播放」；若无：保留 TTS 队列 |
| T-04 | 学生语音输入（STT）是否纳入 | 暂不实现，学生用文本提问 | Phase 8 后扩展 | 用户需求补充 | 预留「麦克风输入」扩展点：STT 结果进入输入框后走普通文本消息通道 |
| T-05 | interactive 场景的 widget 子类型范围 | iframe 渲染已实现（Phase 6）；widget 配置仍用 `Record<string, unknown>` 占位，待子类型确认后细化 | Phase 6、`src/types/stage.ts` | 需求确认 | 确定子类型后补 `WidgetConfig` 联合类型（对应原 `lib/types/widgets.ts`） |
| T-06 | 教学动作是否扩展：白板 / discussion / widget 动作的恢复（laser 已恢复） | laser 已于 Phase 4.1 恢复；白板 / discussion / widget 仍裁剪，ActionEngine 其余分支 no-op | `src/core/action/engine.ts`、`src/core/playback/engine.ts` | 需求变更 | 若恢复白板/讨论/widget：ActionEngine 对应分支补实现 + canvas store 补状态字段；引擎本体无需改 |
| T-08 | 测验简答题判分：由后台 AI 判分接口承接，还是前端 mock | **已裁剪（2026-08-11）**：无判分业务，gradeQuiz 与 mock 已删除 | Phase 5、`src/api/` | 后台确认 | 入参已按原项目对齐，切换时只换 client 实现 |
| T-09 | 音频缓存策略：是否需要本地缓存（IndexedDB） | 当前内存 Map（`localAudioCache`） | `src/core/audio/audio-player.ts` | 实际使用需要 | 需要时换 IndexedDB（原项目用 Dexie） |
| T-10 | 播放位置持久化（刷新恢复）是否联动后台 | 暂未实现；原项目存本地 KV（`playback-cursor`） | Phase 3/7、`src/core/playback/cursor.ts`（未移植） | 需求确认 | 需要则移植（本项目用 localStorage 替代 KV） |
| T-11 | 登录 / 访问码（ACCESS_CODE）是否需要 | 需求未提，暂不做 | Phase 3 课堂外壳 | 需求补充 | 需要时参考原 `app/api/access-code/*` 与守卫组件 |
| T-12 | 多语言（i18n）是否需要 | 仅中文注释与界面文案 | UI 阶段 | 需求确认 | 需要时引入 vue-i18n |
| T-14 | 音频粒度：后台音频是「每句一个文件」还是「整段/整页一个文件」 | 假设每句一个（与 speech action 的 audioId/audioUrl 一一对应） | Phase 7、`src/core/playback/engine.ts` | 后台数据结构确认 | 若整段：需「音频时间轴 ↔ 句子」对齐切分逻辑 |
| T-15 | 倍速 / 暂停 / 恢复 / 打断重讲与后台音频格式是否兼容 | 引擎已按原项目实现 | Phase 3/7/8 | 真实验收 | 联调时逐项验证；若后台音频不支持倍速，需 `playbackRate` 降级方案 |
| T-16 | 多角色讨论移除（2026-08-07 范围调整）：互动仅「登录用户 ↔ 老师」一问一答、可多轮 | SessionType 裁剪为 qa；agent-registry 仅老师；每次提问一轮问答，多轮由用户连续提问、历史逐轮累积；无圆桌/讨论动作 | Phase 1 已调整、Phase 8 落实 | 用户确认 | 若将来要恢复多角色：恢复导演多 agent 编排、圆桌组件与 discussion 动作 |

## 已落实 / 已关闭条目

| 编号 | 结论 | 关闭原因 |
|---|---|---|
| T-07 | 已落实 | Phase 2 采用「一次性返回完整 Stage JSON」的 mock 实现（getClassroom 返回 stage+scenes）；若后台分页，在 client.ts 加聚合 |
| T-13 | 已落实（机制就绪） | Phase 2 建立统一 `src/api/client.ts`，mock/真实切换只改该文件；各函数已标注对应后端接口 |
| T-17 | 已落实（2026-08-11） | 按需求决策：slide 元素仅补充 **line**；chart / table / video / code 与 **latex**（含类型定义、实现、katex 依赖）全部删除；删除记录见 docs/PHASE-4.1.md |

| T-08 | 已落实（2026-08-11） | 按需求裁剪判分业务：无得分 / 无 AI 判分；client.gradeQuiz、quiz-grade mock、grading.ts 已删除；复盘仅选择题对错 + 简答题参考答案（见 docs/PHASE-5.md） |
