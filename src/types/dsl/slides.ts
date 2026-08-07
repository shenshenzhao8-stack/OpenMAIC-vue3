/**
 * 文件头：自建裁剪版「幻灯片数据模型」模块
 *
 * 对应原项目文件：packages/@openmaic/dsl/src/slides.ts（MAIC slide object model）
 *
 * 为什么自建：
 *   1. 不使用 monorepo、不 vendor 整个 DSL 包（同 action.ts 的理由）；
 *   2. 幻灯片是裁剪范围内的核心场景（slide），其元素类型（PPTElement）全量保留，
 *      供 Phase 4 的 Vue 渲染器逐类实现；
 *   3. 字段与原项目**逐字段对应**（含 @since-merge 注解的字段），保证将来照搬
 *      原项目渲染组件（components/slide-renderer/**）时字段可用。
 *
 * 维护约定：若原项目 slides.ts 的类型发生变更，本文件需同步核对。
 */

import type { AssetRef } from './action'

/** 形状路径公式的键名集合（原项目用于精确控制形状关键点） */
export enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ROUND_RECT_SAMESIDE = 'roundRectSameSide',
  CUT_RECT_DIAGONAL = 'cutRectDiagonal',
  CUT_RECT_SINGLE = 'cutRectSingle',
  CUT_RECT_SAMESIDE = 'cutRectSameSide',
  CUT_ROUND_RECT = 'cutRoundRect',
  MESSAGE = 'message',
  ROUND_MESSAGE = 'roundMessage',
  L = 'L',
  RING_RECT = 'ringRect',
  PLUS = 'plus',
  TRIANGLE = 'triangle',
  PARALLELOGRAM_LEFT = 'parallelogramLeft',
  PARALLELOGRAM_RIGHT = 'parallelogramRight',
  TRAPEZOID = 'trapezoid',
  BULLET = 'bullet',
  INDICATOR = 'indicator',
  DONUT = 'donut',
  DIAGSTRIPE = 'diagStripe',
}

/** 幻灯片元素类型枚举（原项目 ElementTypes） */
export enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  CHART = 'chart',
  TABLE = 'table',
  LATEX = 'latex',
  VIDEO = 'video',
  AUDIO = 'audio',
  CODE = 'code',
}

/** 渐变类型（线性 / 径向） */
export type GradientType = 'linear' | 'radial'
/** 渐变颜色节点：pos 为百分比位置，color 为颜色 */
export type GradientColor = { pos: number; color: string }
/** 渐变定义（原项目 Gradient） */
export interface Gradient {
  type: GradientType
  colors: GradientColor[]
  /** 渐变角度（线性渐变） */
  rotate: number
}

/** 线条样式 */
export type LineStyleType = 'solid' | 'dashed' | 'dotted'

/** 元素阴影（原项目 PPTElementShadow） */
export interface PPTElementShadow {
  h: number
  v: number
  blur: number
  color: string
}

/** 元素边框（原项目 PPTElementOutline） */
export interface PPTElementOutline {
  style?: LineStyleType
  width?: number
  color?: string
}

/** 元素超链接类型 */
export type ElementLinkType = 'web' | 'slide'

/** 元素超链接（原项目 PPTElementLink） */
export interface PPTElementLink {
  type: ElementLinkType
  target: string
}

/** 元素通用属性（原项目 PPTBaseElement） */
export interface PPTBaseElement {
  id: string
  /** 距画布左侧距离（逻辑坐标，画布宽 viewportSize=1000） */
  left: number
  /** 距画布顶部距离（逻辑坐标，画布高 = viewportSize*viewportRatio） */
  top: number
  /** 锁定元素（不可编辑） */
  lock?: boolean
  /** 组合 id：相同组合 id 的元素属于同一组合 */
  groupId?: string
  width: number
  height: number
  /** 旋转角度 */
  rotate: number
  link?: PPTElementLink
  name?: string
}

/** 文本类型（标题 / 副标题 / 正文等语义角色） */
export type TextType =
  | 'title'
  | 'subtitle'
  | 'content'
  | 'item'
  | 'itemTitle'
  | 'notes'
  | 'header'
  | 'footer'
  | 'partNumber'
  | 'itemNumber'

/** 文本元素（原项目 PPTTextElement）：content 是 HTML 字符串，AI 可直接生成富文本 */
export interface PPTTextElement extends PPTBaseElement {
  type: 'text'
  /** 文本内容（HTML 字符串），渲染时用 v-html 注入 */
  content: string
  /** 默认字体（可被内容内联样式覆盖） */
  defaultFontName: string
  /** 默认颜色（可被内容内联样式覆盖） */
  defaultColor: string
  outline?: PPTElementOutline
  /** 填充色 */
  fill?: string
  /** 行高（倍），默认 1.5 */
  lineHeight?: number
  /** 字间距，默认 0 */
  wordSpace?: number
  /** 不透明度，默认 1 */
  opacity?: number
  shadow?: PPTElementShadow
  /** 段间距，默认 5px */
  paragraphSpace?: number
  /** 竖向文本 */
  vertical?: boolean
  textType?: TextType
  /** 垂直对齐（top/middle/bottom），top 保持旧版行为 */
  vAlign?: 'top' | 'middle' | 'bottom'
}

/** 图片 / 形状翻转标记 */
export interface ImageOrShapeFlip {
  flipH?: boolean
  flipV?: boolean
}

/** 图片滤镜键（对应 CSS filter 属性） */
export type ImageElementFilterKeys =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'grayscale'
  | 'saturate'
  | 'hue-rotate'
  | 'opacity'
  | 'sepia'
  | 'invert'

/** 图片滤镜值集合 */
export interface ImageElementFilters {
  blur?: string
  brightness?: string
  contrast?: string
  grayscale?: string
  saturate?: string
  'hue-rotate'?: string
  sepia?: string
  invert?: string
  opacity?: string
}

/** 图片裁剪范围：[[x1,y1],[x2,y2]] 百分比 */
export type ImageClipDataRange = [[number, number], [number, number]]

/** 图片裁剪信息 */
export interface ImageElementClip {
  range: ImageClipDataRange
  shape: string
}

/** 图片用途类型 */
export type ImageType = 'pageFigure' | 'itemFigure' | 'background'

/** 图片元素（原项目 PPTImageElement） */
export interface PPTImageElement extends PPTBaseElement {
  type: 'image'
  /** 固定宽高比，默认 true */
  fixedRatio: boolean
  /** 资源引用：URL 或占位 id */
  src: AssetRef
  outline?: PPTElementOutline
  filters?: ImageElementFilters
  clip?: ImageElementClip
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  /** 圆角半径 */
  radius?: number
  /** 颜色蒙版 */
  colorMask?: string
  imageType?: ImageType
  /** 软边缘羽化半径（px） */
  softEdge?: number
}

/** 形状内文本的垂直对齐 */
export type ShapeTextAlign = 'top' | 'middle' | 'bottom'

/** 形状内文本（原项目 ShapeText） */
export interface ShapeText {
  content: string
  defaultFontName: string
  defaultColor: string
  /** 默认 "middle" */
  align: ShapeTextAlign
  lineHeight?: number
  wordSpace?: number
  paragraphSpace?: number
  type?: TextType
}

/** 形状元素（原项目 PPTShapeElement） */
export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape'
  /** SVG viewBox，例如 [1000, 1000] */
  viewBox: [number, number]
  /** SVG path 的 d 属性 */
  path: string
  fixedRatio: boolean
  /** 填充色，默认 '#5b9bd5' */
  fill: string
  gradient?: Gradient
  pattern?: string
  outline?: PPTElementOutline
  opacity?: number
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  special?: boolean
  text?: ShapeText
  pathFormula?: ShapePathFormulasKeys
  keypoints?: number[]
}

/** 线条端点样式 */
export type LinePoint = '' | 'arrow' | 'dot'

/** 线条元素（原项目 PPTLineElement，无 height/rotate） */
export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line'
  start: [number, number]
  end: [number, number]
  style: LineStyleType
  color: string
  points: [LinePoint, LinePoint]
  shadow?: PPTElementShadow
  broken?: [number, number]
  broken2?: [number, number]
  curve?: [number, number]
  cubic?: [[number, number], [number, number]]
}

/** 图表类型 */
export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter'

/** 图表扩展选项 */
export interface ChartOptions {
  lineSmooth?: boolean
  stack?: boolean
}

/** 图表数据 */
export interface ChartData {
  labels: string[]
  legends: string[]
  series: number[][]
}

/** 图表元素（原项目 PPTChartElement，渲染时用 ECharts） */
export interface PPTChartElement extends PPTBaseElement {
  type: 'chart'
  fill?: string
  chartType: ChartType
  data: ChartData
  options?: ChartOptions
  outline?: PPTElementOutline
  themeColors: string[]
  textColor?: string
  lineColor?: string
}

/** 文本水平对齐 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/** 表格单元格样式 */
export interface TableCellStyle {
  bold?: boolean
  em?: boolean
  underline?: boolean
  strikethrough?: boolean
  color?: string
  backcolor?: string
  fontsize?: string
  fontname?: string
  align?: TextAlign
}

/** 单元格单边边框 */
export interface TableCellBorder {
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  color: string
}

/** 表格单元格 */
export interface TableCell {
  id: string
  colspan: number
  rowspan: number
  text: string
  style?: TableCellStyle
  padding?: string
  vAlign?: 'top' | 'middle' | 'bottom'
  borders?: {
    top?: TableCellBorder
    bottom?: TableCellBorder
    left?: TableCellBorder
    right?: TableCellBorder
  }
}

/** 表格主题 */
export interface TableTheme {
  color: string
  rowHeader: boolean
  rowFooter: boolean
  colHeader: boolean
  colFooter: boolean
}

/** 表格元素（原项目 PPTTableElement） */
export interface PPTTableElement extends PPTBaseElement {
  type: 'table'
  outline: PPTElementOutline
  theme?: TableTheme
  /** 列宽数组（百分比小数），如 [0.3, 0.5, 0.2] */
  colWidths: number[]
  cellMinHeight: number
  rowHeights?: number[]
  data: TableCell[][]
}

/** LaTeX 公式元素（原项目 PPTLatexElement，渲染时用 KaTeX） */
export interface PPTLatexElement extends PPTBaseElement {
  type: 'latex'
  /** LaTeX 源码 */
  latex: string
  /** KaTeX 渲染好的 HTML（新版公式使用） */
  html?: string
  /** 旧版 SVG 渲染路径（向后兼容） */
  path?: string
  color?: string
  strokeWidth?: number
  viewBox?: [number, number]
  fixedRatio?: boolean
  align?: 'left' | 'center' | 'right'
}

/** 视频元素（原项目 PPTVideoElement） */
export interface PPTVideoElement extends PPTBaseElement {
  type: 'video'
  src?: AssetRef
  /** 生成视频的资源引用 */
  mediaRef?: AssetRef
  autoplay: boolean
  poster?: string
  ext?: string
}

/** 音频元素（原项目 PPTAudioElement） */
export interface PPTAudioElement extends PPTBaseElement {
  type: 'audio'
  fixedRatio: boolean
  color: string
  loop: boolean
  autoplay: boolean
  src: string
  ext?: string
}

/** 代码行（原项目 CodeLine） */
export interface CodeLine {
  id: string
  content: string
}

/** 代码元素（原项目 PPTCodeElement） */
export interface PPTCodeElement extends PPTBaseElement {
  type: 'code'
  language: string
  lines: CodeLine[]
  fileName?: string
  showLineNumbers?: boolean
  fontSize?: number
}

/** 全部幻灯片元素的联合类型（原项目 PPTElement） */
export type PPTElement =
  | PPTTextElement
  | PPTImageElement
  | PPTShapeElement
  | PPTLineElement
  | PPTChartElement
  | PPTTableElement
  | PPTLatexElement
  | PPTVideoElement
  | PPTAudioElement
  | PPTCodeElement

// ==================== 动画 ====================

/** 动画类型（入场 / 退场 / 强调） */
export type AnimationType = 'in' | 'out' | 'attention'
/** 动画触发方式 */
export type AnimationTrigger = 'click' | 'meantime' | 'auto'

/** 元素动画（原项目 PPTAnimation） */
export interface PPTAnimation {
  id: string
  elId: string
  effect: string
  type: AnimationType
  duration: number
  trigger: AnimationTrigger
}

// ==================== 背景 / 主题 / 页面 ====================

/** 背景类型 */
export type SlideBackgroundType = 'solid' | 'image' | 'gradient'
/** 背景图片尺寸模式 */
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat'
/** 背景图片 */
export interface SlideBackgroundImage {
  src: string
  size: SlideBackgroundImageSize
}

/** 幻灯片背景（原项目 SlideBackground） */
export interface SlideBackground {
  type: SlideBackgroundType
  color?: string
  image?: SlideBackgroundImage
  gradient?: Gradient
}

/** 翻页方式 */
export type TurningMode =
  | 'no'
  | 'fade'
  | 'slideX'
  | 'slideY'
  | 'random'
  | 'slideX3D'
  | 'slideY3D'
  | 'rotate'
  | 'scaleY'
  | 'scaleX'
  | 'scale'
  | 'scaleReverse'

/** 章节标签 */
export interface SectionTag {
  id: string
  title?: string
}

/** 页面类型（封面 / 目录 / 过渡 / 内容 / 结尾） */
export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end'

/** 幻灯片主题（原项目 SlideTheme） */
export interface SlideTheme {
  backgroundColor: string
  themeColors: string[]
  fontColor: string
  fontName: string
  outline?: PPTElementOutline
  shadow?: PPTElementShadow
}

/** 幻灯片页面（原项目 Slide） */
export interface Slide {
  id: string
  /** 视口逻辑宽度（默认 1000） */
  viewportSize: number
  /** 视口宽高比（默认 0.5625 = 16:9） */
  viewportRatio: number
  theme: SlideTheme
  /** 元素集合（绝对定位） */
  elements: PPTElement[]
  background?: SlideBackground
  animations?: PPTAnimation[]
  turningMode?: TurningMode
  sectionTag?: SectionTag
  type?: SlideType
  /** 讲稿备注（从 .pptx 导入的演讲备注） */
  script?: string
}
