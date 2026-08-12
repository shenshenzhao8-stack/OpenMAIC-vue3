# MONOREPO-PHASE-5 执行记录：迁入目标 pnpm workspace

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 5 执行。
> 完成日期：2026-08-12
> 本文件所在位置即「唯一真源」：`package-openmaic/`（源目录 `/Users/mac/OpenMAIC-vue3` 退役）。

## 一、目标回顾

1. 在目标仓库 `ai-learning-practice-web` 创建独立 workspace 包 `package-openmaic`，
   包名 `@ailearning/openmaic`，保留独立 dev/build/test 能力；
2. 全量迁移 src/mock/public/audio/docs/测试/配置（不含 node_modules/dist/lockfile/git）；
3. Pinia 降级 `~2.1.7` 对齐 Web（硬前置）；
4. 根级最小改动：pnpm-workspace、stylelint 范围、start-app.mjs；
5. 记录根 tsconfig references 暂缓与 overrides 版本差异；
6. 源目录退役，monorepo 为唯一真源。

## 二、迁移清单

### 2.1 已迁移（复制）

| 内容 | 说明 |
|---|---|
| `src/` | 全部源码（含测试） |
| `mock/` | mock 课堂数据 |
| `public/` | 独立 demo 音频（17 段 mp3）+ 资源 |
| `index.html` | 独立 SPA 入口 |
| `vite.config.ts` / `vitest.config.ts` / `tsconfig.json` | 构建/类型配置（含 `#/*` 与 `@openmaic/dsl` alias） |
| `package.json` | 改造后（见 2.3） |
| `README.md` / `TODO.md` / `docs/` | 项目文档与全部 PHASE/REFERENCE/MONOREPO 记录 |

### 2.2 未迁移（排除）

`node_modules/`、`dist/`、`package-lock.json`（npm 锁文件）、`.git/`、`.DS_Store`。

### 2.3 包内改造（package-openmaic/package.json）

| 项 | 值 | 说明 |
|---|---|---|
| `name` | `@ailearning/openmaic` | 与 @ailearning/share、@ailearning/request 命名一致 |
| `pinia` | `~2.1.7` | 对齐 Web（硬前置），已验证解析版本为 2.1.7 |
| `scripts.clear` | `rm -fr node_modules && rm -fr dist` | 配合根 clear filter（`./package-**/`） |
| main/exports/imports | 保留 Phase 2 配置 | 源码入口 + `#/*` 映射 |

## 三、根级改动（目标仓库，最小改动）

| 文件 | 改动 |
|---|---|
| `pnpm-workspace.yaml` | packages 增加 `'package-openmaic'` |
| 根 `package.json` | stylelint / stylelint:fix 范围增加 `"package-openmaic/**/*.{html,vue,css,sass,less}"` |
| `scripts/start-app.mjs` | `extraTargetDirs = ['package-share', 'package-openmaic']`（根 `pnpm dev` 可选启动独立 demo） |
| 根 `tsconfig.json` | **暂缓加入 references**：包 tsconfig 为单文件非 composite 结构，直接加入会破坏根 `vue-tsc --build`；待 Phase 7 规范收口时调整为 references 风格后再评估（记录原因，不让新包阻断整仓） |

## 四、版本与差异记录（计划 Phase 5.14）

- Pinia：包内解析 **2.1.7**（Web 同版本，无双实例）；
- vue-tsc：包内声明 `^3.3.9`，根 `pnpm.overrides` 强制 `^3.2.5` → 实际安装 **3.2.6**；
  typecheck 通过，差异不等于回归（记录在案）；
- TypeScript：根 override `~5.9.3`，与包声明一致；
- esbuild 等依赖构建脚本被 pnpm 10 默认忽略（Ignored build scripts），vite build 实际可运行
  （平台二进制经 optionalDependencies 正常安装），无需 approve-builds。

## 五、验证结果（pnpm --dir package-openmaic）

| 命令 | 结果 | 备注 |
|---|---|---|
| `pnpm install` | 成功（+75 包） | workspace 关联 + Pinia 2.1.7 |
| `pnpm --dir package-openmaic run typecheck` | 通过 | **Pinia 2.1.7 下 getState 兼容层与全部代码类型正常** |
| `pnpm --dir package-openmaic run test` | 18 文件 / **80 用例**通过 | 与源目录基线一致，无回退 |
| `pnpm --dir package-openmaic run build` | 通过（131 modules） | 独立 SPA 构建正常 |

## 六、验收对照（计划 Phase 5 验收项）

- [x] `pnpm install`、typecheck、test、build 全部通过；
- [x] 独立运行入口保留（`pnpm --dir package-openmaic run dev`）；
- [x] Pinia 2.1.7 降级生效且无兼容问题；
- [x] 根 stylelint 范围覆盖新包；start-app.mjs 可选择启动；
- [x] 未复用 Web outDir（包内 dist）；
- [x] 根 clear filter（`./package-**/`）覆盖新包（含 clear 脚本）；
- [ ] Web/Mobile 原构建回归（建议验收时执行，本阶段未改动其配置）；
- [x] 根 tsconfig references 暂缓原因已记录。

## 七、已知问题与差异

- lint/stylelint 对 package-openmaic 的收口留待 Phase 7（计划明确「先以包内问题修复完成为前提」）；
- 源目录 `/Users/mac/OpenMAIC-vue3` 退役：后续开发以本包为准；其现有工作区改动不再维护；
- Web 消费 `@ailearning/openmaic` 的联调属 Phase 6。

## 八、是否允许进入下一阶段

- 是
- 原因：typecheck / 80 用例 / build 全绿；Pinia 单版本；workspace 注册与根级改动就绪。

## 九、下一步（Phase 6 预告）

Web 最小接入：`router-v2` 独立布局 + `views/ai-classroom` 包装页 + workspace 依赖
`@ailearning/openmaic: workspace:^` + `@openmaic/dsl` Web alias + 音频资源供应 + iframe
Teleport 联调验证。
