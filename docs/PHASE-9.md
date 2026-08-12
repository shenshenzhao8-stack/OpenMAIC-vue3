# Phase 9 完成说明：打磨与验收（2026-08-12）

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）与规则六
> （功能保留与回归检查）编写。

## 当前有效范围（沿用）

- 页面：首页 + 课堂播放页 `/classroom/:id`；
- 场景：slide / quiz / interactive；
- 教学动作：speech + spotlight + laser；
- 互动：登录用户 ↔ 老师一问一答（可多轮、含 STT 麦克风输入）；
- 课堂数据：mock（`mock/classroom.ts`，8 个场景、17 段语音）。

## 一、阶段目标

1. **补回功能丢失（规则六落实）**：T-19 播放进度接线与进度跳转、T-18 讲义视图；
2. 引擎边界测试（暂停/恢复、跳转、打断恢复、讨论休眠）；
3. 空态 / 错误态与移动端基础适配；
4. README 使用说明 + mock 接口清单 + 切真实后端指南；
5. 输出验收清单并全量验证。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/utils/lecture-notes.ts`（新增） | `lib/chat/lecture-notes.ts` + `lib/types/chat.ts`（LectureNoteItem / LectureNoteEntry） | 从场景构建讲义条目 | **照搬 + 适配**：逻辑逐行一致；动作类型收敛为本项目三种（speech/spotlight/laser），discussion/play_video/widget_* 随动作裁剪移除（文件头有裁剪记录） |
| `src/components/chat/ChatArea.vue`（重写） | `components/chat/chat-area.tsx`（双 tab）+ `lecture-notes-view.tsx`（讲义渲染与跳转） | 聊天区：讲义默认页 + 对话页 | **改写（Vue）**：双 tab（讲义默认）；讲义按场景分组、当前场景高亮、聚光/激光徽章、点击当前场景讲解行跳转；保留 Phase 8 问答与 Phase 8.1 麦克风全部能力 |
| `src/composables/usePlaybackEngine.ts`（修改） | `components/edit/PlaybackChromeRoot.tsx`（onProgress / jumpToAction / 打断恢复） | 引擎接线 | **改写**：接 `onProgress` → `currentActionIndex`；暴露 `totalActions` / `jumpToAction` / `canJumpToAction`；**修复讨论后恢复从头播 bug**（见第五节） |
| `src/components/stage/HeaderControls.vue`（修改） | `header-controls.tsx` + PlaybackChromeRoot 的进度状态 | 播放控制 + 进度 | **改写**：新增动作进度条（按动作数分格、已播高亮、点击跳转）与 `n/total` 计数 |
| `src/pages/ClassroomPage.vue`（修改） | PlaybackChromeRoot 接线 | 页面集成 | 进度/讲义 props 接线；空态（无场景提示） |
| `src/core/__tests__/playback-engine.test.ts`（修改） | 原项目 `tests/playback/*.test.ts` | 引擎测试 | 新增 Phase 9 边界用例：pause/resume、jumpToAction、live 禁跳、打断恢复、讨论挂起恢复 |
| `src/utils/__tests__/lecture-notes.test.ts`（新增） | —— | —— | 讲义纯函数测试：分组/排序/徽章/过滤/文案 |
| `README.md`（修改） | —— | —— | 快速开始、验收要点、mock 接口清单、切真实后端指南 |

## 三、功能丢失补回记录（规则六第 9 条）

本阶段按 PHASE-8 第十节审查结论补回两处无意识丢失：

| 编号 | 丢失功能 | 补回方式 | 验收点 |
|---|---|---|---|
| T-19 | 播放进度 / 进度跳转 | `onProgress` → `currentActionIndex`；顶栏分格进度条点击 → `engine.jumpToAction` | 播放时进度格高亮递增；点击任意格跳转并从该处继续 |
| T-18 | 讲义视图（Lecture Notes） | `buildLectureNotes` 纯函数照搬 + ChatArea 讲义/问答双 tab（默认讲义） | 右侧默认展示讲义；当前场景高亮；聚光/激光徽章；点击讲解行跳转 |

## 四、范围变更记录

无新裁剪。本阶段仅补回功能与打磨。动作进度条与讲义视图对齐原项目实现（原项目即通过
`currentActionIndex` + `onJumpToAction` 驱动，无新增裁剪面）。

## 五、问题修复记录：讨论结束后「播放」从头开始（Phase 8 遗留 bug）

**现象**：播放中提问 → 老师回答 → 点「继续讲课」→ 再点顶栏「播放」，从第一句重新播放，
而不是从被打断的位置继续。

**根因（对照原项目）**：原项目 `PlaybackChromeRoot.tsx` 的 `handleSessionStop` 注释明确写着：

> `hadLectureInterruption MUST be read before doSessionCleanup(), because
> handleEndDiscussion() restores and clears the saved lecture position.`

即 `handleEndDiscussion()` 会把保存的讲课位置恢复到引擎游标并**清空**
`savedSceneIndex / savedActionIndex`；而 `hasLectureInterruption()` 正是读这两个字段。
本项目 Phase 8 的 `play()` 在用户点「播放」时才调用 `hasLectureInterruption()`，
此时标志已被清空 → 恒走 `start()` 从头播放。

**修复**：`usePlaybackEngine` 增加 `pendingLectureResume` 标志：`endDiscussion()`
在调用 `engine.handleEndDiscussion()` **之前**先读取 `hasLectureInterruption()` 缓存；
`play()` 依据该标志决定 `continuePlayback()`（恢复位置续播）或 `start()`（从头），
续播后清除标志；`teardownEngine` 一并重置。

**验证**：引擎边界测试「打断保存位置 → endDiscussion 恢复游标 → continuePlayback 重播被打断句」
通过；`getSnapshot().actionIndex` 断言恢复位置正确。

## 六、边界测试清单（新增 9 个用例）

1. pause 后进入 paused，resume 恢复并继续播完；
2. jumpToAction 跳转到目标动作（onProgress 更新游标）并自动播放；
3. live 模式（讨论中）禁止跳转；
4. 播放中提问打断保存位置，endDiscussion 后 continuePlayback 恢复被打断句；
5. live 模式 pause 挂起讨论（paused + pending），resume 恢复 live；
6. 讲义按场景分组、按 sceneOrder 排序、空动作场景过滤；
7. 讲义 speech/action 条目与顺序保持；
8. 非本项目动作类型（discussion）被过滤；
9. 动作徽章文案映射（聚光/激光/未知）。

## 七、空态 / 错误态 / 移动端

- 空态：课堂无场景时显示「该课程暂无内容」（`ClassroomPage`）；
- 错误态：加载失败显示错误信息（原有）；
- 移动端：`≤900px` 下聊天面板收窄（320→260px）、气泡/讲义字号减小、顶栏隐藏课程描述、
  字幕条字号减小。

## 八、文档交付

- `README.md`：快速开始、验收要点、mock 接口清单（listClassrooms / getClassroom /
  chatStream → 对应后端接口）、切换真实后端指南（T-02/T-01/T-03 对接点）；
- `docs/REFERENCE-PHASE-9.md`：工作参考手册（逐文件、逐方法讲解）；
- `TODO.md`：T-18 / T-19 关闭，其余待确认项保持。

## 九、验收清单（对照需求逐项）

| # | 验收项 | 通过条件 |
|---|---|---|
| 1 | 首页 → 课堂播放 | 进入 `/classroom/demo`，8 个场景按序出现 |
| 2 | 播放控制 | 播放/暂停/继续/停止/上一页/下一页可用 |
| 3 | 倍速 | 下拉框 0.75~2 实时生效 |
| 4 | 进度条 | 分格高亮随播放递增；点击格跳转并从该处继续 |
| 5 | 字幕 | 长讲稿逐字揭示，语音文字同步；暂停后精确续播 |
| 6 | 教学动作 | 聚光/激光随讲解穿插显示 |
| 7 | 讲义 | 默认讲义 tab；当前场景高亮；徽章正确；点击讲解行跳转 |
| 8 | 问答 | 提问打断 → 回答（文字+语音）→ 继续讲课恢复位置；多轮 |
| 9 | 麦克风 | 权限预检、错误分类、重试、音量指示（真实 Chrome） |
| 10 | quiz | 作答 + 复盘（对错 / 参考答案） |
| 11 | interactive | iframe 渲染、滑块交互、切走切回保活 |
| 12 | 空态/错误态 | 无场景提示、加载失败提示 |

## 十、验证结果

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：16 个测试文件 / 75 个用例全部通过；
- `npm run build`：通过（133 modules）。

## 十一、红线自检

本阶段所有新增/修改文件注释为中文业务讲解；照搬的讲义逻辑保持逐行一致，仅动作类型集合
按裁剪范围收敛并记录；无英文叙述性注释。
