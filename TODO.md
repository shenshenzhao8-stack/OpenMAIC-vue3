# TODO —— 需求/变更点跟踪表

> 本文件记录「可能发生变更的需求点与改动点」，供开发过程中随时核对，避免按过期假设实现。
> 维护规则：依据当前 OpenMAIC 项目根目录 `AGENTS.md`（规则二/三）——
> ① 范围发生变更时，本表必须同步更新；② 每完成一个阶段，回到本表勾选已落实/已确认的条目。

## 当前状态（2026-08-07，Phase 1 完成）

| 编号 | 待确认 / 可能变更的点 | 当前假设（Phase 1 状态） | 涉及阶段 / 文件 | 触发条件 / 来源 | 建议处理 |
|---|---|---|---|---|---|
| T-01 | **TTS 服务可能不需要（Phase 1 遗留问题）**：后台返回的数据结构中同时包含「老师讲解稿（speech.text）」与「音频文件（audioUrl/audioId）」，前端可能无需再调用 TTS 接口 | 保留完整 TTS 链路（AudioPlayer + 浏览器 TTS + 朗读计时兜底 + useDiscussionTTS 队列，Phase 7 实现） | Phase 7 语音同步、`src/core/audio/*`、`src/api/`（mock TTS） | 用户确认：后台数据自带讲解稿与音频 | ① 播放主路径按「直接播数据里的 audioUrl」设计；② mock TTS 保留但标注「可能移除」；③ 待确认后台聊天 SSE 事件是否也携带音频（见 T-03），据此决定 useDiscussionTTS 是否简化为直接播放 |
| T-02 | 后台数据结构字段命名是否与自建类型一致（`persona`、`audioId/audioUrl`、`scene/actions`、`content.canvas` 等） | 自建类型严格对齐原项目 `@openmaic/dsl` 命名 | `src/types/dsl/*`、`src/types/stage.ts`、`mock/classroom.ts` | 后台契约确定后 | 后台接口文档就绪后做一次「字段映射核对表」，不一致处加适配层（不改自建类型，避免破坏照搬引擎） |
| T-03 | 后台聊天 SSE 事件是否携带老师回答的音频（如 `agent_end` / `text_delta` 附带 `audioUrl`） | 假设 SSE 只推文本与动作，语音走独立 TTS 队列（useDiscussionTTS） | Phase 8 互动闭环、`src/core/chat/agent-loop.ts`、`src/core/buffer/stream-buffer.ts` | 后台 SSE 协议确认 | 若事件自带音频：useDiscussionTTS 简化为「收到 audioUrl 直接播放」；若无：保留 TTS 队列 |
| T-04 | 学生语音输入（STT）是否纳入：原项目有浏览器 Web Speech API + 录音上传 `/api/transcription` 两条路径 | 暂不实现，学生用文本提问；互动逻辑与原项目一致即可 | Phase 8 后扩展、新增输入组件 | 用户需求补充 | 预留「麦克风输入」扩展点：STT 结果进入输入框后走普通文本消息通道，核心循环不动 |
| T-05 | interactive 场景的 widget 子类型范围：simulation / diagram / code / game / visualization3d / procedural-skill | 先做 iframe 渲染（html），widget 配置用 `Record<string, unknown>` 占位 | Phase 6、`src/types/stage.ts`（InteractiveContent） | 需求确认 widget 需要哪些 | 确定子类型后，补 `WidgetConfig` 联合类型（对应原 `lib/types/widgets.ts`） |
| T-06 | 教学动作是否扩展：laser / 白板 / discussion / widget 动作的恢复 | 裁剪为 speech + spotlight；ActionEngine 其他分支 no-op | `src/core/action/engine.ts`、`src/core/playback/engine.ts` | 需求变更 | 若要恢复：ActionEngine 对应分支补实现 + canvas store 补状态字段；引擎本体无需改 |
| T-07 | 课堂数据加载接口形态：`/classroom/:id` 返回一次性完整 JSON 还是分页/按场景拉取 | 计划 mock 一次性返回完整 Stage（Phase 2 `mock/classroom.ts`） | Phase 2/3、`src/api/`、`src/stores/stage.ts` | 后台接口确认 | 先按完整 JSON 实现；若后台分页，再在 `src/api/client.ts` 加聚合逻辑 |
| T-08 | 测验简答题判分：由后台 AI 判分接口承接，还是前端 mock | 计划 mock `/quiz-grade` 返回 `{ score, comment }` | Phase 5、`src/api/` | 后台确认 | 判分入参（question/userAnswer/points/commentPrompt/language）已按原项目对齐，切换时只换 client 实现 |
| T-09 | 音频缓存策略：是否需要在本地缓存音频（IndexedDB） | 当前内存 Map（`localAudioCache`） | `src/core/audio/audio-player.ts` | 实际使用中是否需要跨页面缓存 | 需要时把内存 Map 换成 IndexedDB（原项目用 Dexie） |
| T-10 | 播放位置持久化（刷新恢复）是否联动后台 | 暂未实现；原项目存本地 KV（`playback-cursor`） | Phase 3/7、`src/core/playback/cursor.ts`（未移植） | 需求确认 | 需要则移植 `playback/cursor.ts`（依赖 `@openmaic/storage` 的 KV，本项目用 localStorage 替代） |
| T-11 | 登录 / 访问码（ACCESS_CODE）是否需要 | 需求未提，暂不做 | Phase 3 课堂外壳 | 需求补充 | 需要时参考原 `app/api/access-code/*` 与守卫组件 |
| T-12 | 多语言（i18n）：原项目支持多种语言，本项目是否要 | 仅中文注释与界面文案；无 i18n 框架 | UI 阶段 | 需求确认 | 需要时引入 vue-i18n；语言资源参考原 `lib/i18n` |
| T-13 | mock → 真实后台的切换机制 | `src/api/client.ts`（Phase 2 建）统一接口签名，内部走 mock | Phase 2、`src/api/` | 后台就绪 | 只改 client 内部实现，业务代码零改动；每个接口标注「mock/真实」状态 |
| T-14 | 音频粒度：后台音频是「每句一个文件」还是「整段/整页一个文件」 | 假设每句一个（与 speech action 的 audioId/audioUrl 一一对应） | Phase 7、`src/core/playback/engine.ts` | 后台数据结构确认 | 若整段：需要「音频时间轴 ↔ 句子」对齐切分逻辑（原项目按句生成，无此问题） |
| T-15 | 倍速 / 暂停 / 恢复 / 打断重讲的交互细节是否与后台/音频格式兼容 | 引擎已按原项目实现（倍速、cancel+重讲、打断保存位置） | Phase 3/7/8 | 真实验收 | 联调时逐项验证；若后台音频不支持倍速，需要 `playbackRate` 降级方案 |

## 已落实/已关闭条目

（暂无。后续阶段完成后，将已确认的条目移到此节并注明关闭原因。）
| T-16 | 多角色讨论移除（2026-08-07 范围调整）：互动仅「登录用户 ↔ 老师」一问一答 | 类型 SessionType 裁剪为 qa；agent-registry 仅老师；agent-loop 保留（每次提问一轮问答，多轮由用户连续提问、历史逐轮累积）；无圆桌/讨论动作 | Phase 1 已调整、Phase 8 落实 | 用户确认 | 若将来要恢复多角色：恢复导演多 agent 编排、圆桌组件与 discussion 动作 |
