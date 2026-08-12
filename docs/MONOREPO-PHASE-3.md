# MONOREPO-PHASE-3 执行记录：隔离全局样式与资源路径

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 3 执行。
> 完成日期：2026-08-12

## 一、目标回顾

1. **全局样式拆分**：`html/body/#app` 规则移入 `src/standalone.css`，仅独立 SPA 入口
   （main.ts）引入；包公开入口与 `OpenMaicClassroom` 不得引入，避免污染宿主布局；
   课堂组件根节点明确 `width/height/min-width/min-height/overflow`。
2. **资源路径适配**：新增 `resolveAssetUrl(path, assetBaseUrl)`，mock 音频在独立应用
   保持 `/audio/*.mp3`，Web 传入资源根时拼接；完整 URL / blob / data URI 不改写。

## 二、实际改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/standalone.css` | 新增 | 独立应用专用根样式（html/body/#app + body overflow），仅 main.ts 引入 |
| `src/styles.css` | 删除 | 内容已全部移入 standalone.css，无其他引用 |
| `src/main.ts` | 小改 | `import './styles.css'` → `import './standalone.css'` |
| `src/utils/asset.ts` | 新增 | `resolveAssetUrl(path, assetBaseUrl)` 纯函数 |
| `src/utils/__tests__/asset.test.ts` | 新增 | 3 个用例：无 base 保持、有 base 拼接、完整 URL/data/blob 不改写 |
| `src/types/public.ts` | 小改 | `OpenMaicClassroomProps` 增加可选 `assetBaseUrl?: string` |
| `src/components/classroom/index.vue` | 小改 | 根样式补 width/min-width/min-height；`loadClassroom` 数据归一化（speech.audioUrl、interactive.url） |

## 三、实现要点

### 3.1 全局样式隔离

- `standalone.css` 只被 `src/main.ts` 引入（已 grep 验证入口与组件均无引用）；
- 组件根 `.classroom` 补齐 `width: 100%; min-width: 0; min-height: 0`（计划 3.1 要求），
  保证嵌入任意容器时按容器尺寸收缩，不依赖宿主根节点 100% 高度；
- 独立 SPA 产物仍包含全局根样式（main.ts 引入），布局不回退。

### 3.2 资源路径适配（数据归一化层）

- `resolveAssetUrl` 规则：
  - `https?:/blob:/data:` 开头 → 原样返回；
  - 空 base → 保持 `/xxx`（独立应用 public 根路径）；
  - 有 base → 拼接 `<base>/<path>`（双斜杠归一化）。
- 归一化时机：`OpenMaicClassroom.loadClassroom` 在 `getClassroom` 返回后、写入 stage
  store 前统一处理（speech.audioUrl、interactive content.url，仅非空值），
  **audio-player / PlaybackEngine / iframe 消费方零改动**；
- mock slide 图片为 data URI，走 resolveAssetUrl 原样返回，不受影响；
- 数据归一化后的 scenes 同时用于 store 与 `load-success` 事件负载，宿主拿到即可用。

## 四、验证结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `npx vue-tsc --noEmit` | 通过 | 公共契约扩展与归一化类型检查通过 |
| `npm run test` | 18 文件 / **80 用例**通过 | 新增 asset 3 用例；原 77 用例无回退 |
| `npm run build` | 通过（135 modules） | 独立 SPA 构建正常 |

## 五、验收对照（计划 Phase 3 验收项）

- [x] 独立应用布局不回退（根样式仍由 main.ts 引入，产物含全局规则）；
- [x] 组件嵌入宿主时不修改宿主 `html/body/#app`（入口/组件零全局样式引用）；
- [x] 非根资源 base 下 mock 音频可加载（resolveAssetUrl 拼接 + 单测覆盖）；
- [x] 完整 HTTP / blob / data URL 不被改写（单测覆盖）；
- [x] 公开入口不包含 `html/body/#app` 样式副作用（依赖链 grep 验证）。

## 六、人工回归清单（建议浏览器执行）

按固定主线回归，重点确认：

- [ ] 课堂布局无滚动条/溢出（独立应用根样式仍生效）；
- [ ] 17 段语音正常播放（/audio/*.mp3 路径未破坏）；
- [ ] slide 图片（data URI）正常显示；
- [ ] 播放/暂停/倍速/跳转/讲义/问答/quiz/interactive 保活正常。

## 七、已知问题与差异

- `loadClassroom`（可替换 loader）仍为建议项，未引入；
- Web 侧音频文件供应（web/public、COS、后端 URL）属 Phase 6，本阶段只解决路径拼接。

## 八、是否允许进入下一阶段

- 是
- 原因：typecheck / 80 用例 / build 全绿；样式隔离与资源路径机制就绪，消费方零改动。

## 九、下一步（Phase 4 预告）

生命周期清理与低成本命名空间：审计并补齐引擎/音频/SSE/麦克风/iframe/rAF/定时器/BLOB URL/
localAudioCache 的卸载清理，Store ID 加 `openmaic-` 前缀，Quiz localStorage key 加课程命名空间。
