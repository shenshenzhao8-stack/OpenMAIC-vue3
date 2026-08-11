# Phase 4.1 完成说明：laser 激光笔 + slide 元素收敛四类

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（2026-08-11 更新）

- 页面：首页（课堂入口）+ 课堂播放页 /classroom/:id；
- 场景：slide / quiz / interactive；
- 教学动作：speech（讲解）+ spotlight（聚光）+ **laser（激光笔）**；
- slide 元素类型：**仅 text / shape / line / image 四类**（其余类型与实现已删除）；
- 互动：登录用户 ↔ 老师多轮一问一答（Phase 8）；
- 课堂数据 mock；播放引擎调度逻辑与原项目一致。

## 一、阶段目标

1. 新增 laser 激光笔教学动作（执行层 + 渲染层 + 几何工具 + 引擎测试）；
2. slide 元素收敛为 text / shape / line / image：新增 line，删除 latex（实现+依赖）与 chart/table/video/code（占位+类型定义）；
3. 全量文档与范围同步（规则二.5）。

## 二、需求一：laser 激光笔（对照原项目）

| 环节 | 原项目文件 | 本项目实现 |
|---|---|---|
| 动作类型 | `@openmaic/dsl` action.ts `LaserAction` | 类型已有，保留 |
| 执行 | `lib/action/engine.ts` `executeLaser` | `src/core/action/engine.ts` 恢复 `executeLaser`（setLaser + 5s 自动清除） |
| 引擎 | `lib/playback/engine.ts`（case spotlight/laser） | 照搬保留，无需改动 |
| 状态 | `lib/store/canvas.ts`（laserElementId/laserOptions/setLaser） | 已有，保留 |
| 渲染 | `components/slide-renderer/Editor/LaserOverlay.tsx`（motion + laser.v1 描述符） | `LaserOverlay.vue`：**CSS 简化版**（用户确认不引入 motion）；从最近角落飞入（中心>50 从 105、否则 -5）+ 光圈脉冲 + 光晕，行为语义一致 |
| 几何 | `lib/utils/geometry.ts` | `src/utils/geometry.ts` 照搬纯函数（getElementPercentageGeometry / findElementGeometry / findNearestCorner） |

## 三、需求二：slide 元素收敛四类（含完整删除记录）

### 新增

| 文件 | 对照原项目 | 说明 |
|---|---|---|
| `src/utils/line-path.ts` | `lib/utils/element.ts` 的 getLineElementPath | 照搬纯函数（直线/折线/双折线/二次/三次曲线） |
| `src/components/scenes/slide/elements/LineElement.vue` | `BaseLineElement.tsx` + `LinePointMarker.tsx` | SVG 线条渲染（颜色/线宽/虚线/点线/端点箭头）；**line 的 width 字段语义是线宽**（已按原文处理） |

### 删除记录（含原因与恢复路径）

| 删除项 | 类型 | 原因 | 恢复路径 |
|---|---|---|---|
| `elements/LatexElement.vue` | 实现 | 超出四类范围 | 恢复公式元素时重写 + 装回 katex |
| `elements/FallbackElement.vue` | 实现 | 四类全部实现，不再需要占位 | —— |
| `package.json` katex / @types/katex | 依赖 | latex 删除后无引用 | 同上 |
| `slides.ts`：PPTLatexElement / PPTChartElement / PPTTableElement / PPTVideoElement / PPTAudioElement / PPTCodeElement | 类型定义 | 收敛四类，避免死代码 | 需要时按原 dsl 补回 |
| `slides.ts`：ChartType/ChartOptions/ChartData、TableCell/TableCellStyle/TableCellBorder/TableTheme/TextAlign、CodeLine | 辅助类型 | 随被删类型一并删除 | 同上 |
| `ElementTypes` 枚举：LATEX/CHART/TABLE/VIDEO/AUDIO/CODE | 枚举 | 同上 | 同上 |
| `mock/classroom.ts` 的 latex 元素（eq_1） | 数据 | 替换为 line 元素 | —— |

### 保留说明

- `playingVideoElementId`（canvas store）：是播放引擎 `pauseVideo()` 依赖的状态，**保留**（与视频元素渲染无关）；
- `PPTAnimation`、背景/主题等幻灯片级结构：保留；
- ImageElementFilters / ShapeText / Gradient / LinePoint 等四类元素的辅助类型：保留。

## 四、验证结果

- 残留检查：src/mock 下无 latex/katex/chart/table/video/code 元素类型引用；
- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：10 个测试文件 / 39 个用例全部通过（新增 geometry 6、line-path 5、引擎 laser 1）；
- `npm run build`：通过（108 modules；移除 katex 后 JS 由 393KB 降至 138KB）。

## 五、范围变更记录（2026-08-11）

| 变更 | 影响 | 关联原项目 |
|---|---|---|
| 教学动作新增 laser | ActionEngine 恢复执行；LaserOverlay 渲染；mock 补 laser 动作 | lib/action/engine.ts、LaserOverlay.tsx、geometry.ts |
| slide 元素收敛为 text/shape/line/image | 新增 line；删除 latex（含 katex）与 chart/table/video/code（类型+占位） | @openmaic/dsl slides.ts、BaseLineElement.tsx 等 |

## 六、红线自检

本阶段全部文件注释为中文业务讲解；删除代码不留残余注释；无英文叙述性注释。

> 范围变更（2026-08-11，Phase 5）：测验无判分业务——无得分 / 无 AI 判分 / 无解析讲解；
> 复盘仅「选择题显示对错、简答题显示参考答案」。详见 docs/PHASE-5.md。
