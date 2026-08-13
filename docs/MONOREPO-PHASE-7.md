# MONOREPO-PHASE-7 执行记录：代码规范收口与全仓回归

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 7 执行。
> 完成日期：2026-08-12
> 说明：Phase 6（Web 最小接入）尚未执行（用户直接进入 Phase 7），全仓验收以
> 「Web 未接入 openmaic」的基线验证不破坏仓库为准；Web 接入留待后续阶段。

## 一、目标回顾

对 `package-openmaic` 做最低必要规范适配（不重写引擎逻辑），并做全仓回归：

1. Vue SFC 块顺序统一为 template → script → style；
2. 模板组件引用 kebab-case；事件处理函数 handleXxx；
3. 单引号/分号/2 空格/120 行宽（prettier）；import 排序（eslint）；
4. 未使用变量与类型错误清零；
5. 样式通过 Stylelint；公共入口不泄漏包内 alias；
6. 全仓验收并区分「本次引入」与「仓库既有」失败。

## 二、规范收口内容

### 2.1 SFC 块顺序（23 个文件）

- 原 23 个 `.vue` 全部为 script → template → style，统一重排为 template → script → style；
- 实现：行扫描切分顶层块（compiler-sfc 的 loc 只覆盖标签内内容，直接切片会丢标签——
  首次尝试因此破坏文件，已从备份镜像恢复并改用行扫描方案，先在 /tmp 副本验证后应用）；
- 验证：23 个文件全部 template 开头；typecheck + build 通过（内容未丢失）。

### 2.2 kebab-case 组件引用

- 21 个 PascalCase 模板组件标签 → kebab（chat-area / header-controls / open-maic-classroom /
  teleport 等）；仅替换 template 块内标签，script 内泛型（OpenMaicClassroomProps 等）不受影响；
- 踩坑：多行属性组件标签（`<HeaderControls` 行尾）需前瞻 `$`，否则漏替换。

### 2.3 handleXxx 事件命名

- ChatArea：`submit` → `handleSubmit`；`toggleMic` / `retryMic` 包装为
  `handleToggleMic` / `handleRetryMic`（composable 函数名保持不变）；
- HeaderControls：`onSpeedChange` → `handleSpeedChange`（onXxx 仍用于 props）；
- MultipleChoiceQuestion：`toggle` → `handleToggle`；
- 内联表达式（`@click="phase = 'answering'"`、`emit('change', ...)`）保留（非命名函数）。

### 2.4 格式与 lint 收口

- prettier：全量通过（120/单引号/分号/2 空格，仓库配置）；
- eslint：0 违规——处理了 4 类：
  - QuizView `vue/no-deprecated-filter` 误报（TS 联合类型断言 `as string | undefined` 被
    当作 Vue 2 filter）：文件头 HTML 注释 disable（模板区）；
  - ScreenElement `ts/no-unused-vars` 误报（kebab-case 模板引用组件，eslint 不识别关联）：
    script 块内注释 disable（HTML 注释只作用于模板区，已踩坑修正）；
  - `@typescript-eslint/no-explicit-any` 旧规则名注释：改为 `ts/` 前缀后因规则已全局关闭，
    直接删除；
  - lecture-notes `antfu/consistent-chaining` 与 prettier 冲突：该行 eslint-disable 保留
    prettier 格式；
- stylelint：0 违规（自动修复规则前空行等；`word-break: break-word` 废弃关键字改为
  `overflow-wrap: break-word`）。

### 2.5 公共入口不泄漏 alias

- `src/index.ts` 只导出 `OpenMaicClassroom` + 公共类型；
- `src/types/public.ts` 内部 import 改为相对路径（`../api/client`），公共类型不依赖
  只能在包内解析的 `#/` alias。

### 2.6 引擎逻辑未重写

- 唯一涉及运行时逻辑的改动：`timing.ts` 的 CJK 正则从字面范围改为 Unicode 属性转义
  （`\p{Script=Han}` 等，行为等价且更完整），规避 regexp/no-obscure-range；
- 其余均为格式、命名、注释与误报处理。

## 三、全仓验收结果

### 3.1 package-openmaic（本次改动范围内）

| 命令 | 结果 |
|---|---|
| `pnpm --dir package-openmaic run typecheck` | 通过 |
| `pnpm --dir package-openmaic run test` | 通过（0 tests，`--passWithNoTests`，规则七） |
| `pnpm --dir package-openmaic run build` | 通过（131 modules） |
| eslint（包内） | 0 违规 |
| stylelint（包内） | 0 违规 |
| prettier（包内） | 全部通过 |
| SFC 块顺序 / kebab-case / handleXxx | 全部达标 |

### 3.2 全仓（记录既有失败，与本次无关）

| 命令 | 结果 | 归属 |
|---|---|---|
| `pnpm --dir packages-app/web run build:type` | 失败 | `packages-app/web/src/utils/upload.ts`（'res' possibly undefined，Web 既有） |
| `pnpm run lint`（全仓 eslint） | 失败 49 问题 | 全部在 `packages-app/web`（LoginMobile/operator 等，既有）；package-openmaic 0 违规 |
| `pnpm run stylelint`（全仓） | 失败 173 问题 | 全部在 `packages-app`（既有）；package-openmaic 0 违规 |

以上全仓失败均可通过 `git diff` 验证与本次改动无关（未触碰相关文件）；
Web/Mobile 完整构建（development/test/production）建议由用户按仓库发布流程执行。

## 四、已知问题与差异

- Phase 6 未执行：Web 尚未消费 `@ailearning/openmaic`，全仓 Web 构建未包含课堂页；
- prettier 与 antfu `consistent-chaining` 存在全局性格式冲突，采用行级 disable 处理
  （不影响仓库其他包）；
- 全仓 lint/stylelint/build:type 的既有失败建议由仓库维护方另行排期修复。

## 五、是否允许进入下一阶段

- 是（Phase 7 为计划最终阶段）
- 原因：包内 typecheck/test/build/lint/stylelint/prettier 全绿；规范收口完成；
  全仓既有失败已记录且与本次无关。

## 六、后续建议

1. 执行 Phase 6（Web 最小接入）：router-v2 + views/ai-classroom + `@openmaic/dsl` Web alias
   + 音频资源供应 + iframe 联调；
2. 仓库既有 lint/typecheck 失败由仓库维护方排期修复；
3. 完成 Web 接入后补跑 Web 三套构建（development/test/production）与 Mobile 构建验收。
