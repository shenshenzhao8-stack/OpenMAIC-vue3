# Phase 4 完成说明：Slide 渲染器

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（沿用，无新变更）

- 场景：slide / quiz / interactive；本阶段实现 slide 真实渲染；
- 教学动作：speech + spotlight（本阶段实现聚光效果）；
- 互动：登录用户 ↔ 老师多轮一问一答（Phase 8）；
- 课堂数据 mock。

## 一、阶段目标

1. 把 Slide 数据渲染成画面：背景层 + 自适应画布 + 元素层 + 聚光特效；
2. 元素渲染：text / image / latex / shape（chart/table/line/video/code 走占位，后续补）；
3. 聚光：DOM 测量 + SVG mask（5 秒自动熄灭，由 ActionEngine 驱动）；
4. 纯算法抽离（背景样式/视口适配）并配套测试。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/utils/slide-style.ts` | `lib/hooks/use-slide-background-style.ts`、`useElementShadow.ts`、`useFilter.ts` | 背景/阴影/滤镜 → CSS | **改写（抽纯函数）**：逻辑一致，便于测试 |
| `src/utils/viewport-fit.ts` | `packages/@openmaic/renderer/src/hooks/useViewportSize.ts` | 量容器→算适配 | **改写（抽纯算法）**：逻辑一致（偏高按宽度、偏宽按高度） |
| `src/composables/useSlideBackgroundStyle.ts` | `lib/hooks/use-slide-background-style.ts` | 背景响应式样式 | **改写**：computed 包装纯函数 |
| `src/composables/useViewportSize.ts` | `packages/@openmaic/renderer/src/hooks/useViewportSize.ts` | 容器测量 + ResizeObserver | **改写**：支持外部传入容器 ref |
| `src/components/scenes/slide/SlideView.vue` | `packages/@openmaic/renderer/src/SlideCanvas.tsx` | 画布渲染（背景/内容层/特效层） | **改写**：结构照抄（容器→画布框→背景→1000×562.5 内容层→聚光） |
| `src/components/scenes/slide/ScreenElement.vue` | `components/slide-renderer/Editor/ScreenElement.tsx` | 元素分发 + 定位 + id 约定 | **改写**：id 固定 `screen-element-{id}`（聚光定位依赖） |
| `elements/TextElement.vue` | `.../TextElement/BaseTextElement.tsx` | 文本渲染（v-html） | **改写**：样式字段一致 |
| `elements/ImageElement.vue` | `.../ImageElement/BaseImageElement.tsx` | 图片渲染 | **改写（简化）**：去媒体生成占位/重试，直接显示 src |
| `elements/LatexElement.vue` | `.../LatexElement/BaseLatexElement.tsx` | KaTeX 公式渲染 + 缩放适配 | **改写**：逻辑一致（测量自然尺寸→scale） |
| `elements/ShapeElement.vue` | `.../ShapeElement/BaseShapeElement.tsx` | SVG 形状 | **改写（简化）**：viewBox + preserveAspectRatio 替代 transform scale；未实现 pattern |
| `elements/FallbackElement.vue` | 无（未实现类型） | —— | **新建占位**：chart/table/line/video/code 待补 |
| `src/components/scenes/slide/SpotlightOverlay.vue` | `components/slide-renderer/Editor/SpotlightOverlay.tsx` | 聚光（DOM 测量 + SVG mask） | **改写**：逻辑一致（白底黑洞 + 白边；变暗程度 dimness） |
| 测试（slide-style / viewport-fit） | 原项目无独立测试 | —— | **新增**：纯函数单测 |

## 三、验证结果

- `vue-tsc --noEmit`：通过
- `npm run test`（vitest）：8 个测试文件 / 26 个用例全部通过
- `npm run build`：通过（108 modules，含 KaTeX 字体资源）

## 四、范围变更记录

无新变更。本阶段存在一处「计划内裁剪」：

- **元素类型范围**：仅实现 text / image / latex / shape；chart / table / line / video / code 渲染走
  FallbackElement 占位，后续按需补充（记录于 TODO T-05 及渲染扩展项）。
- 未实现动画（入场/强调）、翻页特效（turningMode）——不属于当前裁剪范围。

## 五、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。
