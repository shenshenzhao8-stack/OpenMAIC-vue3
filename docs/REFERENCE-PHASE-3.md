# Phase 3 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么」组织。

## 1. `src/utils/playback-navigation.ts` —— 播放导航纯函数

**文件作用**：算"上一页/下一页"的目标场景 id，替代原项目 StageAPI.navigation 的
next/previous 逻辑（原项目是直接改 store 的方法，本项目抽成纯函数便于测试）。

| 方法 | 做什么 | 为什么 |
|---|---|---|
| `getAdjacentSceneId(scenes, currentId, direction)` | 按当前 id 找相邻场景 id；首/尾越界或找不到返回 null | 页面组件调用后写入 stage store（翻页唯一入口） |
| `getFirstSceneId(scenes)` | 返回第一个场景 id | 进入课堂默认显示第一页 |

## 2. `src/composables/useScene.ts` —— 场景上下文（provide/inject）

**文件作用**：定义场景上下文的 key 与注入函数，对应原项目 React Context 的
useSceneSelector。Vue 用 `Symbol` 作 InjectionKey，避免跨树冲突。

| 导出 | 做什么 |
|---|---|
| `SceneKey` | provide/inject 的 key |
| `useScene()` | 注入 `{ scene: ComputedRef<Scene|null> }`；在 Provider 外调用返回空场景 |

## 3. `src/components/stage/SceneProvider.vue` —— 场景数据提供者

从 stage store 的 `currentScene`（getter：currentSceneId → scenes）派生当前场景并 provide。
上层用它包裹场景渲染区，子组件用 useScene() 取数据。

## 4. `src/components/stage/SceneRenderer.vue` —— 场景分发器

按 `scene.type` 分发：slide → SlideView；quiz → QuizView；interactive → InteractiveView；
无场景显示"未选择场景"。对应原项目 scene-renderer.tsx 的 switch。

## 5-7. 三个场景占位组件（SlideView / QuizView / InteractiveView）

**作用**：让分发链路先可用（显示场景标题 + 数量提示），Phase 4/5/6 逐个替换为真实渲染器。
占位组件接收 `Scene | null`，内部判空，避免模板类型收窄问题。

## 8. `src/composables/usePlaybackEngine.ts` —— 播放引擎接线

**文件作用**：把纯 TS 的 PlaybackEngine 接到 Vue 响应式状态，对应原项目
PlaybackChromeRoot 的引擎创建与回调接线。

| 方法/状态 | 做什么 | 为什么 |
|---|---|---|
| `mode`（ref） | 引擎状态（idle/playing/paused/live） | 顶栏按钮切换与状态展示 |
| `lectureSpeech`（ref） | 当前讲解台词 | 字幕条（Phase 7 做逐字同步） |
| `ensureEngine()`（私有） | 懒创建 AudioPlayer + ActionEngine + PlaybackEngine | 数据加载后才创建，避免空 scenes |
| `play()` | start（idle→playing） | 开始上课 |
| `pause()` / `resume()` / `stop()` | 暂停/恢复/停止 | 控制讲课节奏 |
| `nextScene()` / `prevScene()` | 手动翻页（改 stage store） | 侧边栏/顶栏翻页 |
| 回调接线 | onModeChange→mode；onSceneChange→setCurrentSceneId；onSpeechStart→字幕；getPlaybackSpeed→settings | 引擎→Vue 状态桥接 |
| `onBeforeUnmount` | stop + destroy 音频 | 防止定时器/音频泄漏 |

## 9. `src/components/stage/SceneSidebar.vue` —— 场景侧边栏

场景列表（序号 + 类型标签 + 标题），点击 → `setCurrentSceneId`（与原项目一致）。
简化掉缩略图/拖拽/生成中占位（本项目无生成流程）。

## 10. `src/components/stage/HeaderControls.vue` —— 顶栏控制

播放/暂停/继续/停止 + 上一页/下一页 + 状态徽标。行为由父组件通过 props 注入
（引擎实例唯一，避免多处创建）。

## 11. `src/pages/ClassroomPage.vue` —— 课堂外壳

| 部分 | 做什么 |
|---|---|
| `onMounted` | getClassroom → setStage/setScenes → 默认第一页 |
| 顶栏 | 课程信息 + HeaderControls（引擎接线） |
| 舞台区 | SceneSidebar + SceneProvider>SceneRenderer |
| 字幕条 | 显示 engine 当前讲解台词 |

## 12. `src/utils/__tests__/playback-navigation.test.ts` —— 导航测试

3 个用例：首页、上一页/下一页、首尾越界与空列表。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-10 | 初版：依据 Phase 3 完成后的讲解整理输出 |

| 日期 | 内容 |
|---|---|
| 2026-08-11 | 布局修复：新增全局样式重置（body margin/height、overflow-x），课堂容器 height 100% + overflow hidden，顶栏 flex-wrap + 标题 min-width:0（修复竖向滚动条与横向溢出） |
