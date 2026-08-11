# Phase 0 完成说明：工程骨架 + 自建类型模块（dsl）

> 本文件依据项目规则二（每阶段完成后对照原项目源码讲解）编写。
> 原项目路径：`/Users/mac/OpenMAIC`（或本机 worktree `/Users/mac/.codex/worktrees/186c/OpenMAIC`）。

## 当前有效范围（2026-08-07 用户确认，后续所有 PHASE-x 文档以此为准）

- 页面：只有首页（课堂入口）与课堂播放页 `/classroom/:id`，**无生成页 / 生成预览页**，主业务在课堂播放；
- 场景：slide / quiz / interactive 三种；
- 教学动作：speech（讲解）+ spotlight（聚光）；
- 课堂数据：由 mock 提供（`mock/classroom.ts`），不做生成流程；
- 播放引擎调度、语音文字同步、学生提问互动：逻辑与原项目一致；
- AI 部分：由后台接口承接，现阶段以 mock 保证流程完整。

## 一、阶段目标

1. 在 `/Users/mac/OpenMAIC-vue3` 建立单应用 Vue 3 + Vite + TypeScript 工程（不使用 monorepo）。
2. 把项目开发规则写入**当前 OpenMAIC 项目**根目录的 `AGENTS.md`（新工程不放规则文件）。
3. 以「自建类型 + alias」方式接入原项目 `@openmaic/dsl`：不装 npm 包、不 vendor 源码，
   而是把裁剪后的数据结构类型写到 `src/types/dsl/`，并通过 Vite alias / tsconfig paths
   让 `@openmaic/dsl` 解析到该目录，保证后续「照搬」的引擎代码无需修改 import。
4. 路由只保留 `/`（课堂入口）与 `/classroom/:id`（课堂播放页，主业务）。
5. 验证链路：`vue-tsc --noEmit` 类型检查通过 + vitest 冒烟测试通过 + `vite build` 通过。

## 二、文件对照表（一一对应）

### 2.1 规则文件（归属当前 OpenMAIC 项目，不在新工程）

| 文件 | 原项目对应 | 说明 |
|---|---|---|
| `AGENTS.md`（当前项目根目录） | 无直接对应文件 | 开发过程规则：中文注释规范、每阶段对照讲解、工程约束、独立判断不迎合、范围变更同步。按用户要求写入当前项目，原仓库与 worktree 各一份 |

### 2.2 新工程根配置

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `package.json` | `package.json` | 工程依赖与脚本 | 照搬形态；脚本改为 vite/vue-tsc/vitest；依赖按 Vue 生态替换 |
| `vite.config.ts` | `next.config.ts` | 构建/打包配置 | 改写；框架换成 Vite。**关键设计**：`@openmaic/dsl` 别名指向 `src/types/dsl/index.ts`，让照搬代码无需改 import |
| `tsconfig.json` | `tsconfig.json` | TypeScript 编译配置 | 改写；新增 `paths`（`@/*`、`@openmaic/dsl`）与 Vue 相关配置 |
| `vitest.config.ts` | `vitest.config.ts` | 单测配置 | 改写；补齐与 vite.config 一致的 alias，使测试里也能解析 `@openmaic/dsl` |
| `index.html` | `app/layout.tsx`（渲染根） | 页面 HTML 根 | 改写；Vue 的挂载点 `#app` |
| `.gitignore` | `.gitignore` | 忽略规则 | 照搬形态，裁剪 |

### 2.3 应用入口与路由（当前范围：无生成页）

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/main.ts` | `app/layout.tsx` 启动逻辑 | 应用启动、挂载 Provider | 改写；挂载 Pinia（对应 Zustand 体系）与 Router |
| `src/App.vue` | `app/layout.tsx` 根布局 | 根布局渲染 | 改写；仅作为路由出口 |
| `src/router/index.ts` | Next.js App Router 页面路由 | 页面路由 | 改写；**只保留 `/` 与 `/classroom/:id` 两条路由**，移除 `/generate`（范围变更） |
| `src/pages/HomePage.vue` | `app/page.tsx` | 首页 | 改写；定位为**课堂入口**（不再承担生成功能），Phase 2 接入 mock 课堂列表 |
| `src/pages/ClassroomPage.vue` | `app/classroom/[id]/page.tsx` | 课堂播放页 | 占位；Phase 3-8 实现 |
| `src/env.d.ts` | 无直接对应 | —— | Vite/TS 环境声明 + `*.vue` 模块声明 |

> 已移除文件：`src/pages/GeneratePage.vue`（对应原项目 `app/generation-preview/page.tsx`）。
> 范围变更详情见本文档「五、范围变更记录」。

### 2.4 自建类型模块（Phase 0 核心）

| 文件 | 原项目对应 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/types/dsl/action.ts` | `packages/@openmaic/dsl/src/action.ts` | 全部 Action 动作类型与常量 | 改写（自建）。**类型全量保留**（引擎 switch 引用所有类型，纯类型零运行时开销）；运行时常量保留引擎引用的部分 |
| `src/types/dsl/slides.ts` | `packages/@openmaic/dsl/src/slides.ts` | 幻灯片数据模型（Slide/PPTElement/主题/背景） | 改写（自建）。字段与原项目**逐字段对应**，供 Phase 4 渲染器使用 |
| `src/types/dsl/stage.ts` | `packages/@openmaic/dsl/src/stage.ts` | 课程骨架（Stage/Scene/SceneContent/守卫） | 改写（自建）。`SceneType` 裁剪为 slide/quiz/interactive；`SceneCore` 裁剪 `multiAgent`；保留 `Scene` 泛型判别联合与守卫机制 |
| `src/types/dsl/index.ts` | `packages/@openmaic/dsl/src/index.ts` | DSL 包出口 | 改写（自建）。统一 re-export，是 alias 的目标文件 |
| `src/types/stage.ts` | `lib/types/stage.ts` | 应用侧 Scene 组装收口 | 改写。删除 PBLContent 分支，新增 InteractiveContent（应用侧内容）；其余职责保持一致 |
| `src/types/action.ts` | `lib/types/action.ts` | 应用侧动作收口 | 改写（re-export 结构照搬） |

### 2.5 测试

| 文件 | 原项目对应 | 说明 |
|---|---|---|
| `src/types/dsl/__tests__/dsl.test.ts` | `packages/@openmaic/dsl/test/*.test.ts` | 冒烟测试：验证 alias 解析、裁剪后的场景类型与动作常量、守卫行为 |

## 三、裁剪记录

| 裁剪项 | 原项目位置 | 为什么可以删 | 恢复路径 |
|---|---|---|---|
| 生成页 / 生成预览页 | `app/generation-preview/page.tsx`、`components/generation/*`、`app/api/generate-classroom/*` | 需求：无生成流程，主业务在课堂播放；课堂数据由 mock 提供 | 若需恢复生成，按原项目整体实现（含任务轮询与大纲编辑） |
| `SceneType` 中的 `pbl` | dsl `stage.ts` | 需求 1 只保留三种场景 | 恢复枚举成员 + `src/types/stage.ts` 补 PBLContent |
| `SceneCore.multiAgent` | dsl `stage.ts` | 本范围互动由 ChatSession 承载，无白板/讨论多智能体配置 | 若恢复讨论功能，按原定义补回 |
| 白板/laser/widget/video/discussion 动作的功能实现 | `lib/action/engine.ts`（Phase 1 处理） | 需求 2 只保留 speech+spotlight；类型保留仅为编译通过 | Phase 1 裁剪执行器时明确 |
| `widgetConfig` 结构 | `lib/types/widgets.ts` | Phase 6 实现 interactive 时再细化 | Phase 6 补 `WidgetConfig` 联合 |

## 四、验证结果

- `npx vue-tsc --noEmit`：通过
- `npm run test`（vitest）：4/4 通过
- `npm run build`（vite build）：通过

## 五、范围变更记录

| 日期 | 变更 | 影响 | 关联原项目文件 |
|---|---|---|---|
| 2026-08-07 | 移除生成页/生成预览页，主业务改为课堂播放；路由只保留 `/` 与 `/classroom/:id`；首页改为课堂入口 | 删除 `GeneratePage.vue`；移除 `/generate` 路由；删除路线图 Phase 9（生成流程）；mock 只保留课堂数据（`mock/classroom.ts`） | `app/generation-preview/page.tsx`、`components/generation/*`、`app/api/generate-classroom/*` 不在范围内 |

> 依据规则二第 5 条：范围变更时，所有已完成的 PHASE-x.md 必须同步调整；本文件已按最新范围全量更新。

> 范围变更（2026-08-11，Phase 4.1）：教学动作新增 laser（激光笔）；slide 元素类型收敛为
> text / shape / line / image 四类（latex / chart / table / video / code 的类型与实现已删除，
> 含 katex 依赖）。详见 docs/PHASE-4.1.md。

> 范围变更（2026-08-11，Phase 5）：测验无判分业务——无得分 / 无 AI 判分 / 无解析讲解；
> 复盘仅「选择题显示对错、简答题显示参考答案」。详见 docs/PHASE-5.md。
