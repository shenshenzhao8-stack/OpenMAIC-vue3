# OpenMAIC-Vue3

OpenMAIC（开源多智能体互动课堂平台）的 Vue 3 复刻版。

## 裁剪范围

- 场景：slide / quiz / interactive 三种；
- 教学动作：speech（讲解）+ spotlight（聚光）+ laser（激光笔）；
- slide 元素类型：仅 text / shape / line / image 四类；
- 测验：无判分业务（选择题复盘显示对错、简答题显示参考答案）；
- 页面：只有首页（课堂入口）与课堂播放页 `/classroom/:id`，**无生成页 / 生成预览页**，主业务在课堂播放；
- 课堂数据：由 mock 提供（`mock/classroom.ts`），不做生成流程；
- 互动：仅登录用户与老师两个角色，一问一答、可多轮（用户连续提问，对话历史累积），无多角色讨论；播放引擎调度、语音文字同步与学生提问互动：逻辑与原项目一致；
- 互动输入：学生除文本外，支持麦克风语音输入（STT）提问——浏览器 Web Speech API + getUserMedia 权限预检（可靠拉起授权弹窗，错误按无设备/权限被拒/非安全上下文/环境不支持/其他分类，其他分支透出具体错误名，支持重试与 requesting 过程反馈）+ 实时音量指示，识别结果追加到输入框后走普通文本消息通道（对齐原项目 `PromptInputSpeechButton` 与设置页 `asr-settings.tsx`）；
- AI 部分：由后台接口承接，现阶段以 mock 保证流程完整。

## 开发规则

开发过程规则（中文注释规范、每阶段对照原项目讲解、独立判断等）统一维护在
OpenMAIC 项目根目录的 `AGENTS.md`，本仓库不再单独复制规则文件，避免多源漂移。
其中 **规则六：功能保留与回归检查**（2026-08-12 新增）为防功能丢失红线：未明确裁剪的原项目
功能必须保留；每个版本交付需输出功能基线清单并按清单回归验收。

## 阶段状态

- [x] Phase 0：工程骨架 + 自建类型模块（dsl）
- [x] Phase 1：核心纯 TS 移植（播放引擎 / 动作引擎 / 打字机 / 互动循环 / Pinia store）
- [x] Phase 2：mock 课堂数据 + 接口层（课堂页可加载数据）
- [x] Phase 3：页面框架 / 课堂外壳（播放控制/翻页/场景分发）
- [x] Phase 4：Slide 渲染器（画布/元素/聚光）
- [x] Phase 5：Quiz 场景（无判分）
- [x] Phase 6：Interactive 场景（iframe 安全渲染 + 保活池）
- [x] Phase 7：语音文字同步（字幕逐字 + 倍速）
- [x] Phase 8：互动闭环（登录用户 ↔ 老师多轮一问一答）
- [x] Phase 8 补充：学生麦克风语音输入（STT，能力检测 + getUserMedia 权限预检 + 音量调试）
- [x] Phase 9：打磨与验收（T-18 讲义视图、T-19 进度跳转、边界测试、空态/错误态、文档）

## 快速开始

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173（支持 IP 访问）
```

进入首页后点击「光合作用」课程卡片 → `/classroom/demo` 课堂播放页。

验收要点（按播放顺序）：

1. **播放控制**：播放 / 暂停 / 继续 / 停止 / 上一页 / 下一页 / 倍速下拉框（0.75~2 实时生效）；
2. **进度条**：顶栏按动作数分格，已播格高亮，点击任意格跳转到对应动作；
3. **字幕**：讲稿逐字揭示，语音与文字同步，暂停后从暂停处精确续播；
4. **教学动作**：聚光（spotlight）与激光笔（laser）随讲解穿插；
5. **讲义**：右侧默认「讲义」tab——按场景分组的逐字稿，聚光/激光徽章标注，点击当前场景
   讲解行可跳转到对应位置；「问答」tab 为师生互动；
6. **问答**：任意时刻提问 → 打断讲课 → 老师回答（流式文字 + 语音）→ 「继续讲课」恢复
   原位置；可多轮；支持麦克风语音输入（STT）；
7. **场景**：slide（含长讲解）→ quiz（作答 + 复盘）→ interactive（iframe 模拟实验，
   切走切回不丢状态）。

## mock 接口清单与切换真实后端

接口统一收口在 `src/api/client.ts`，业务代码不直接 fetch。

| 本文件函数 | mock 数据来源 | 对应后端接口（原项目） | 说明 |
|---|---|---|---|
| `listClassrooms()` | `mock/classroom.ts` 的 `mockClassroomsSummary` | 无原接口（本项目首页需要） | 首页课堂入口列表 |
| `getClassroom(id)` | `mock/classroom.ts` 的 `mockClassroomScenes` | `/classroom/[id]` | 返回 stage + scenes（含 speech 动作的 `audioUrl` 指向 `public/audio/*.mp3`） |
| `chatStream(body, signal)` | `src/api/mock/chat-sse.ts` | `/api/chat` | 师生一问一答 SSE 流（`agent_start` → `text_delta` → `agent_end` → `done`） |

切换真实后端：后端就绪后，仅修改 `src/api/client.ts` 中三个函数为真实
`fetch('/classroom/' + id)`、`fetch('/api/chat', ...)` 等，页面与组件零改动。
需要注意的对接点（详见 TODO.md）：

- 后台课堂 JSON 的字段命名需与自建类型一致（`persona`、`scene/actions`、`content.canvas` 等），
  不一致时在 client.ts 加适配层（T-02）；
- 后台数据需自带讲解稿与音频（T-01）；若聊天 SSE 携带回答音频则简化语音链路（T-03）；
- 语音识别（STT）当前用浏览器 Web Speech API；若后台提供 HTTP 式 STT 接口，替换
  `src/composables/useSpeechRecognition.ts` 内部实现即可，UI 零改动。
