# Phase 9 工作参考手册（逐文件、逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。

## 1. `src/utils/lecture-notes.ts` —— 讲义构建纯函数（新增）

对应原项目 `lib/chat/lecture-notes.ts`（照搬），并携带原 `lib/types/chat.ts` 的
`LectureNoteItem` / `LectureNoteEntry` 类型定义。

| 方法/类型 | 做什么 |
|---|---|
| `buildLectureNotes(scenes)` | 遍历全部场景：过滤无动作场景 → 每个场景把动作按顺序映射为讲义条目（speech 保留文本、spotlight/laser 生成徽章条目、其余动作类型过滤）→ 按 `sceneOrder` 排序。返回值直接喂给讲义 tab 渲染 |
| `getLectureActionLabel(type)` | 动作类型 → 中文徽章文案（spotlight→聚光、laser→激光、未知→空串），供 UI 显示行内徽章 |
| `LectureNoteItem` | 讲义条目联合：`kind: 'speech'`（讲解文本）或 `kind: 'action'`（动作徽章）；均携带 `actionIndex` / `actionId` 供跳转与高亮 |
| `LectureNoteEntry` | 一个场景的讲义分组：场景信息 + 有序条目列表 |

裁剪说明：原项目动作类型集合含 play_video/discussion/widget_*，本项目仅三种教学动作，
已在文件头记录；将来恢复动作需同步加回。

## 2. `src/components/chat/ChatArea.vue` —— 讲义 + 问答双 tab（重写）

对应原项目 `chat-area.tsx`（双 tab）+ `lecture-notes-view.tsx`（讲义渲染）。

| 部分 | 做什么 |
|---|---|
| `activeTab` | 当前 tab（`lecture` 默认 / `chat`），对齐原项目默认讲义页 |
| `notes`（computed） | `buildLectureNotes(props.scenes)` 的缓存结果，场景切换/数据变化自动重算 |
| `buildRows(items)` | 把条目组织成渲染行：聚光/激光徽章并入下一条 speech 行首，末尾无 speech 的徽章独立成行（对齐原项目 Row 构建，去掉 discussion 分支） |
| `handleJump(note, row)` | 点击讲义行跳转：仅当前场景的 speech 行、且 `canJumpToAction` 通过时调用 `onJumpToAction(actionIndex)` |
| 讲义模板 | 场景卡片（当前场景高亮 + 「当前页」徽章）、行内徽章、当前句高亮、可跳转行 hover 提示 |
| 问答模板 | 保留 Phase 8 全部能力：消息列表、发送、STT 麦克风（权限预检/音量条/重试） |

## 3. `src/composables/usePlaybackEngine.ts` —— 进度接线与打断恢复修复（修改）

对应原项目 `PlaybackChromeRoot.tsx`。

| 方法/状态 | 做什么 |
|---|---|
| `currentActionIndex` | `onProgress` 驱动的响应式动作游标（进度条已播格、讲义当前句高亮）；`teardownEngine`/`stop` 重置为 null |
| `totalActions` | 当前场景动作总数（进度条分格数） |
| `createSubtitleBuffer()` | 抽出的打字机工厂：跳转后需要替换打字机，避免旧字幕任务向新位置推字 |
| `canJumpToAction(i)` | 转发引擎判定（live 讨论中禁止跳转） |
| `jumpToAction(i)` | 对齐原项目 `handleJumpToAction`：`engine.jumpToAction`（内部静默重放目标前白板动作）→ 更新游标 → 替换打字机 → 目标为 speech 时直接填入字幕文本；返回是否成功 |
| `pendingLectureResume` | **Phase 8 遗留 bug 修复**：`endDiscussion()` 在 `handleEndDiscussion()` 之前读取 `hasLectureInterruption()` 缓存（原项目注释明确要求此顺序，因为该调用会清空保存位置）；`play()` 据此走 `continuePlayback()`（恢复位置）而非 `start()`（从头） |
| `endDiscussion()` | 先缓存打断标志，再恢复讲课位置 → idle |

## 4. `src/components/stage/HeaderControls.vue` —— 播放控制 + 进度条（修改）

| 部分 | 做什么 |
|---|---|
| `progress-track` | 按 `totalActions` 分格渲染，`currentActionIndex` 之前的格高亮（已播） |
| `progress-seg` 点击 | `onSeek(i-1)` → ClassroomPage → `jumpToAction` |
| `progress-label` | `n / total` 计数（未播放显示 0 / total） |

## 5. `src/pages/ClassroomPage.vue` —— 页面集成（修改）

| 部分 | 做什么 |
|---|---|
| `handleSeek(i)` | 进度条/讲义跳转的统一入口：调用 `jumpToAction` |
| ChatArea props | 传入 `scenes` / `currentSceneId` / `currentActionIndex` / `canJumpToAction` / `onJumpToAction`（讲义渲染与跳转） |
| HeaderControls props | 传入进度状态与 `onSeek` |
| 空态 | `scenes.length === 0` 显示「该课程暂无内容」 |

## 6. 测试文件

- `src/core/__tests__/playback-engine.test.ts`：新增 5 个引擎边界用例（暂停/恢复、跳转、
  live 禁跳、打断恢复、讨论挂起恢复），覆盖 Phase 9 计划的「pause/resume、跳转、打断、
  讨论分支休眠验证」；
- `src/utils/__tests__/lecture-notes.test.ts`：讲义纯函数 4 个用例（分组排序、条目类型、
  动作过滤、徽章文案）。

## 7. `README.md`

新增「快速开始」「mock 接口清单与切换真实后端」：三个接口函数 → mock 来源 → 原项目后端
路径一一对应；说明切换只需改 `src/api/client.ts`，并列出 T-02/T-01/T-03 对接点。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-12 | 初版：Phase 9 完成说明配套工作参考手册（T-18/T-19 补回、进度跳转、讲义双 tab、打断恢复 bug 修复、边界测试） |
