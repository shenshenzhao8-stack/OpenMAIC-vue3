# MONOREPO-PHASE-2 执行记录：分离独立应用入口与包入口

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 2 执行。
> 完成日期：2026-08-12

## 一、目标回顾

1. 新增 `src/index.ts` 包公开入口：只导出 `OpenMaicClassroom` 与公共类型，
   确保导入包入口不会创建应用、安装 Router 或挂载 `#app`；
2. `package.json` 增加 workspace 源码入口（main/exports）与 `#/*` imports 映射；
3. 全部内部 `@/` 引用迁移为包私有 `#/*` 映射（约 130 处，vite/vitest/tsconfig 三处同步）；
4. 保留 `@openmaic/dsl` 独立别名（与 `@/` 是不同 alias，严禁一并替换）；
5. 独立应用仍可启动、构建；最小测试入口可导入包入口。

## 二、实际改动文件

### 2.1 新增

| 文件 | 说明 |
|---|---|
| `src/index.ts` | 包公开入口：导出 `OpenMaicClassroom` + `ClassroomData` / `OpenMaicClassroomProps`；不导入 main.ts / router / App.vue / 全局样式 |
| `src/types/public.ts` | 公共类型：`OpenMaicClassroomProps`（首期 classroomId）、`ClassroomData`（load-success 负载） |
| `src/__tests__/package-entry.test.ts` | 入口测试：导入 `#/index` 断言组件导出存在（导入阶段即验证不执行 createApp） |

### 2.2 修改

| 文件 | 改动 |
|---|---|
| `package.json` | 增加 `main` / `exports["."]`（源码入口）+ `imports: { "#/*": "./src/*" }` |
| `tsconfig.json` | paths：移除 `@/*`，增加 `#/* → src/*`（移除 `@` 使遗漏的 `@/` 引用在 typecheck 即报错） |
| `vite.config.ts` | alias：`@` → `/^#\//` 正则（replacement 带尾斜杠）；保留 `@openmaic/dsl` |
| `vitest.config.ts` | 同上 alias + 增加 `@vitejs/plugin-vue` 插件（支持 entry 测试导入 SFC） |
| 全部 `src/**/*.ts` / `*.vue` / `mock/*.ts` | 132 处 `from '@/` / `import '@/` → `#/`（perl 批量 + typecheck 兜底） |
| 注释残留 | 4 个文件（action.ts / engine.ts / classroom index.vue / vite.config.ts）中的旧 `@/` 说明更新为 `#/` |

## 三、关键技术决策与踩坑记录

1. **alias 匹配必须用正则且 replacement 带尾斜杠**：`@rollup/plugin-alias` 对字符串 find
   只做「精确或加斜杠」前缀匹配，`'#/'` 无法命中 `#/stores/stage`；改用 `/^#\//` 后，
   替换逻辑是 `importee.replace(find, replacement)`，replacement 不带尾斜杠会把
   `#/pages/ClassroomPage.vue` 替换成 `srcpages/ClassroomPage.vue`（缺 `/`）。
   最终：`find: /^#\//` + `replacement: '<abs>/src/'`。
2. **移除 `@` alias 作为迁移完整性检查器**：tsconfig paths 去掉 `@/*` 后，任何遗漏的
   `@/` 引用都会在 `vue-tsc` 直接报错——替换完成后 typecheck 通过即证明 0 遗漏。
3. **`@openmaic/dsl` 与 `@/` 是不同 alias**：批量替换只匹配 `'@/'`（@ 后紧跟斜杠），
   不会误伤 `@openmaic/dsl`；其 Web 侧解析方案（Web vite alias）留待 Phase 5/6 落地。
4. **mock 目录在包根、不在 src/**：`#/* → src/*` 只映射 src；mock 内部对 `#/types/...`
   的引用解析到 src 类型（正确）；client.ts 对 `../../mock/classroom` 的相对导入保持不动。
5. **vitest 增加 vue 插件**：为了入口测试能导入 `.vue` SFC（此前测试全是纯 TS）。

## 四、验证结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `npx vue-tsc --noEmit` | 通过 | `#/*` paths 生效；无 `@/` 遗漏 |
| `npm run test` | 17 文件 / **77 用例**通过 | 新增 package-entry 2 用例；原 75 用例无回退 |
| `npm run build` | 通过（135 modules） | 独立 SPA 全量编译 |
| `npm run dev` | vite ready | 配置加载与依赖优化正常（沙箱网络无法 curl，以 build 结果为准） |

## 五、验收对照（计划 Phase 2 验收项）

- [x] 独立应用仍可启动和构建（dev ready + build 通过）；
- [x] 最小测试入口仅导入 `src/index.ts` 即可获取组件（package-entry.test.ts 通过）；
- [x] 导入包入口不会执行 `createApp()` / `app.mount()`（import 阶段无副作用，测试可证）；
- [x] 包公开入口只导出 `OpenMaicClassroom` + `ClassroomData` / `OpenMaicClassroomProps`，
      不导出内部 Store / 引擎 / 场景组件；
- [x] 内部 `@/` 引用 0 残留（grep 验证 + typecheck 兜底）。

## 六、人工回归（建议在浏览器执行）

按固定主线回归一遍（与 Phase 1 相同）：进课堂 → 播放/暂停/倍速/跳转 → 讲义跳转 →
问答 → quiz → interactive 保活 → 离开 → 再进。本次改动为全局 import 路径迁移，
重点确认：页面能加载、无 `Cannot find module` 报错、音频与图片正常。

## 七、已知问题与差异

- `assetBaseUrl`（资源根适配）属 Phase 3，未引入；
- `loadClassroom`（可替换 loader）属计划 3.2 建议项，未引入；
- 工作区 `docs/MIGRATION-GUIDE.md` 删除为用户已有改动，未触碰。

## 八、是否允许进入下一阶段

- 是
- 原因：typecheck / 77 用例 / build 全绿；`#/*` 映射三处同步完成；入口导入无副作用。

## 九、下一步（Phase 3 预告）

隔离全局样式（`styles.css` → `standalone.css`）与资源路径适配（`resolveAssetUrl` +
`assetBaseUrl` prop），保证嵌入宿主时不污染 `html/body/#app`、音频在非根 base 下可加载。
