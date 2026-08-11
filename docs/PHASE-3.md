# Phase 3 完成说明：页面框架 / 课堂外壳

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（沿用，无新变更）

- 页面：首页（课堂入口）+ 课堂播放页 /classroom/:id；
- 场景：slide / quiz / interactive（本阶段渲染为占位，Phase 4/5/6 替换）；
- 教学动作：speech + spotlight；
- 互动：登录用户 ↔ 老师多轮一问一答（本阶段未接入，Phase 8）；
- 课堂数据 mock；播放引擎调度逻辑与原项目一致。

## 一、阶段目标

1. 搭建课堂播放的「外壳」：顶栏控制、场景侧边栏、场景渲染分发；
2. 用 provide/inject 实现场景上下文（对应原 React Context）；
3. 编写 `usePlaybackEngine` composable（组合式函数），把纯 TS 引擎接到 Vue 响应式状态；
4. 播放/暂停/翻页可用；字幕条显示当前讲解台词；
5. 配套纯函数测试与全部文档。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/utils/playback-navigation.ts` | `lib/api/stage-api-navigation.ts` | StageAPI.navigation 的 next/previous/goTo | **改写**：把"算目标场景 id"抽成纯函数（便于测试），页面组件调用后写入 stage store |
| `src/composables/useScene.ts` | `lib/contexts/scene-context.tsx` | SceneContext + useSceneSelector | **改写**：React Context → Vue provide/inject + computed |
| `src/components/stage/SceneProvider.vue` | `lib/contexts/scene-context.tsx` 的 SceneProvider | 把当前场景提供给子树 | **改写**：从 stage store 派生 currentScene 并 provide |
| `src/components/stage/SceneRenderer.vue` | `components/stage/scene-renderer.tsx` | 按 scene.type 分发渲染器 | **改写**：v-if 分发到 slide/quiz/interactive 三个组件 |
| `src/components/scenes/slide/SlideView.vue` | `components/slide-renderer/**` | 幻灯片渲染 | **占位**：Phase 4 实现真实渲染 |
| `src/components/scenes/quiz/QuizView.vue` | `components/scene-renderers/quiz-view.tsx` | 测验状态机 | **占位**：Phase 5 实现 |
| `src/components/scenes/interactive/InteractiveView.vue` | `components/scene-renderers/interactive-renderer.tsx` | iframe 渲染 | **占位**：Phase 6 实现 |
| `src/composables/usePlaybackEngine.ts` | `components/edit/PlaybackChromeRoot.tsx` | 创建引擎并接回调 | **改写（简化）**：mode/lectureSpeech 响应式；play/pause/resume/stop/翻页；onSceneChange → setCurrentSceneId |
| `src/components/stage/SceneSidebar.vue` | `components/stage/scene-sidebar.tsx` | 场景列表/缩略图/拖拽 | **改写（简化）**：保留列表+点击切换，去掉缩略图/拖拽/生成中占位 |
| `src/components/stage/HeaderControls.vue` | `components/stage/header-controls.tsx` | 顶栏控制（导出/设置/主题/播放） | **改写（简化）**：仅保留播放/暂停/停止/上一页/下一页与状态展示 |
| `src/pages/ClassroomPage.vue` | `app/classroom/[id]/page.tsx` + `components/stage.tsx` | 课堂加载 + 舞台根 | **改写**：加载 mock 数据 → 外壳布局（顶栏/侧边栏/主区/字幕条）→ 引擎接线 |
| `src/utils/__tests__/playback-navigation.test.ts` | 原项目无直接对应（导航 API 测试） | —— | **新增**：首/尾越界、上一页/下一页、空列表 |

## 三、验证结果

- `vue-tsc --noEmit`：通过
- `npm run test`（vitest）：6 个测试文件 / 15 个用例全部通过
- `npm run build`：通过（81 modules）

## 四、范围变更记录

无新变更。本阶段存在两处「计划内简化」，记录如下：

1. **手动翻页与引擎游标独立**：Phase 3 的上一页/下一页只改展示中的场景（stage store），
   引擎播放进度由引擎游标管理；后续 Phase 7/8 再对接 jumpToAction / 讨论恢复语义。
2. **播放位置持久化未做**（TODO T-10，可选）：刷新恢复播放位置留待后续按需实现。

## 五、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。

> 范围变更（2026-08-11，Phase 4.1）：教学动作新增 laser（激光笔）；slide 元素类型收敛为
> text / shape / line / image 四类（latex / chart / table / video / code 的类型与实现已删除，
> 含 katex 依赖）。详见 docs/PHASE-4.1.md。

> 范围变更（2026-08-11，Phase 5）：测验无判分业务——无得分 / 无 AI 判分 / 无解析讲解；
> 复盘仅「选择题显示对错、简答题显示参考答案」。详见 docs/PHASE-5.md。
