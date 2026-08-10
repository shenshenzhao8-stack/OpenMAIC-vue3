# Phase 4 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么」组织。

## 1. `src/utils/slide-style.ts` —— 幻灯片样式纯函数

**文件作用**：把 DSL 数据转 CSS 的纯逻辑（背景/阴影/滤镜），对应原项目三个 hook 的合并简化。

| 方法 | 做什么 | 为什么 |
|---|---|---|
| `resolveSlideBackgroundStyle(background)` | 背景 → CSS（纯色/图片/渐变/缺省白） | 渐变按原项目 `colors.join(',')` 拼接 |
| `resolveElementShadow(shadow)` | 阴影 → `h v blur color` 字符串 | 文本/图片阴影统一 |
| `resolveElementFilters(filters)` | 滤镜字段 → CSS filter | 图片滤镜 |

## 2. `src/utils/viewport-fit.ts` —— 视口自适应纯算法

`computeSlideViewportFit(canvasW, canvasH, viewportSize=1000, viewportRatio=0.5625, canvasPercentage=100)`：
容器相对偏高（height/width > 0.5625）→ 按宽度适配（上下留黑边）；否则按高度适配（左右留黑边）；
返回画布框像素尺寸、居中偏移与缩放比。逻辑与原项目 useViewportSize 完全一致。

## 3. `src/composables/useSlideBackgroundStyle.ts`

computed 包装 `resolveSlideBackgroundStyle`，输入响应式背景数据，输出响应式 CSS。

## 4. `src/composables/useViewportSize.ts`

- 测量容器（`clientWidth/Height`）；
- `ResizeObserver` 监听窗口/容器变化自动重算；
- 支持外部传入容器 ref（页面组件自建并绑定模板）。

## 5. `src/components/scenes/slide/SlideView.vue` —— 画布

| 部分 | 做什么 | 为什么 |
|---|---|---|
| `containerRef` + `fit` | 量容器、算适配 | 自适应任意屏幕 |
| 背景层 | `backgroundStyle` | 页面底色/图片/渐变 |
| 画布框 | 像素尺寸 + 居中 + 卡片阴影 | 视觉"卡片" |
| 内容层 | 固定 1000×562.5，`scale(fit)` | 元素坐标永远写逻辑值，整体缩放 |
| 元素层 | ScreenElement 逐个绝对定位 | 数据驱动渲染 |
| 聚光层 | SpotlightOverlay | 特效叠加 |

## 6. `src/components/scenes/slide/ScreenElement.vue` —— 元素分发

按 type 分发（text/image/latex/shape，其余 Fallback）；绝对定位（left/top/width/height/rotate/zIndex）；
**根节点 id = `screen-element-{id}`**（聚光 DOM 测量依赖）。line 元素无 height/rotate，安全访问。

## 7-10. 元素组件

| 组件 | 做什么 | 关键点 |
|---|---|---|
| `TextElement.vue` | v-html 渲染富文本 | 颜色/字体/行高/字距/阴影/透明度/竖排 |
| `ImageElement.vue` | img 渲染 | object-fit cover、圆角、翻转、滤镜 |
| `LatexElement.vue` | KaTeX 渲染公式 | 测量自然尺寸 → scale 适配元素框；支持预渲染 html |
| `ShapeElement.vue` | SVG path 渲染 | 线性渐变 defs、描边、透明度；viewBox 缩放 |

## 11. `FallbackElement.vue` —— 未实现类型占位

chart/table/line/video/code 显示类型标签，保证布局不塌（后续补充，TODO T-05）。

## 12. `src/components/scenes/slide/SpotlightOverlay.vue` —— 聚光

| 部分 | 做什么 |
|---|---|
| `measure()` | 找 `screen-element-{id}` → `.element-content` → getBoundingClientRect → 转百分比矩形 |
| watch spotlightElementId | 目标变化 → nextTick 后重测 |
| ResizeObserver | 容器缩放重测 |
| SVG mask | 白底=变暗层；黑色矩形=挖洞（目标明亮）；白边=聚焦边框 |
| `dimness` | 变暗程度（spotlightOptions.dimness ?? 0.5） |

生命周期：ActionEngine 执行聚光写 store → 本组件显示 → 5 秒后 `clearAllEffects()` → 自动消失（EFFECT_AUTO_CLEAR_MS）。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-10 | 初版：依据 Phase 4 完成后的讲解整理输出 |
