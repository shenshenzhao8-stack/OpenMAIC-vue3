/**
 * 文件头：自建裁剪版「幻灯片数据模型」模块
 *
 * 对应原项目：packages/@openmaic/dsl/src/slides.ts（MAIC slide object model）
 *
 * 范围（2026-08-11 更新）：element 类型收敛为四类 —— text / shape / line / image。
 * 已删除（含类型定义与辅助类型）：latex / chart / table / video / audio / code。
 * 删除原因：本项目仅支持四类元素；删除记录与恢复路径见 docs/PHASE-4.1.md。
 *
 * 保留说明：ShapePathFormulasKeys（形状路径公式）、PPTAnimation（幻灯片级动画）、
 * 背景/主题等与元素类型无关的结构保持不变。
 *
 * 维护约定：若原项目 slides.ts 的类型发生变更，本文件需同步核对。
 */

import type { AssetRef } from './action';

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

/** 幻灯片元素类型枚举（收敛为四类：text/shape/line/image） */
export enum ElementTypes {
  IMAGE = 'image',
  TEXT = 'text',
  SHAPE = 'shape',
  LINE = 'line',
}

/** 渐变类型（线性 / 径向） */
export type GradientType = 'linear' | 'radial';
/** 渐变颜色节点：pos 为百分比位置，color 为颜色 */
export interface GradientColor {
  pos: number;
  color: string;
}
/** 渐变定义（原项目 Gradient，形状填充用） */
export interface Gradient {
  type: GradientType;
  colors: GradientColor[];
  /** 渐变角度（线性渐变） */
  rotate: number;
}

/** 线条样式 */
export type LineStyleType = 'solid' | 'dashed' | 'dotted';

/** 元素阴影（原项目 PPTElementShadow） */
export interface PPTElementShadow {
  h: number;
  v: number;
  blur: number;
  color: string;
}

/** 元素边框（原项目 PPTElementOutline） */
export interface PPTElementOutline {
  style?: LineStyleType;
  width?: number;
  color?: string;
}

/** 元素超链接类型 */
export type ElementLinkType = 'web' | 'slide';

/** 元素超链接（原项目 PPTElementLink） */
export interface PPTElementLink {
  type: ElementLinkType;
  target: string;
}

/** 元素通用属性（原项目 PPTBaseElement） */
export interface PPTBaseElement {
  id: string;
  /** 距画布左侧距离（逻辑坐标，画布宽 viewportSize=1000） */
  left: number;
  /** 距画布顶部距离（逻辑坐标，画布高 = viewportSize*viewportRatio） */
  top: number;
  /** 锁定元素（不可编辑） */
  lock?: boolean;
  /** 组合 id：相同组合 id 的元素属于同一组合 */
  groupId?: string;
  width: number;
  height: number;
  /** 旋转角度（line 元素无此字段） */
  rotate: number;
  link?: PPTElementLink;
  name?: string;
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
  | 'itemNumber';

/** 文本元素（原项目 PPTTextElement）：content 是 HTML 字符串，AI 可直接生成富文本 */
export interface PPTTextElement extends PPTBaseElement {
  type: 'text';
  /** 文本内容（HTML 字符串），渲染时用 v-html 注入 */
  content: string;
  /** 默认字体（可被内容内联样式覆盖） */
  defaultFontName: string;
  /** 默认颜色（可被内容内联样式覆盖） */
  defaultColor: string;
  outline?: PPTElementOutline;
  /** 填充色 */
  fill?: string;
  /** 行高（倍），默认 1.5 */
  lineHeight?: number;
  /** 字间距，默认 0 */
  wordSpace?: number;
  /** 不透明度，默认 1 */
  opacity?: number;
  shadow?: PPTElementShadow;
  /** 段间距，默认 5px */
  paragraphSpace?: number;
  /** 竖向文本 */
  vertical?: boolean;
  textType?: TextType;
  /** 垂直对齐（top/middle/bottom），top 保持旧版行为 */
  vAlign?: 'top' | 'middle' | 'bottom';
}

/** 图片 / 形状翻转标记 */
export interface ImageOrShapeFlip {
  flipH?: boolean;
  flipV?: boolean;
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
  | 'invert';

/** 图片滤镜值集合 */
export interface ImageElementFilters {
  blur?: string;
  brightness?: string;
  contrast?: string;
  grayscale?: string;
  saturate?: string;
  'hue-rotate'?: string;
  sepia?: string;
  invert?: string;
  opacity?: string;
}

/** 图片裁剪范围：[[x1,y1],[x2,y2]] 百分比 */
export type ImageClipDataRange = [[number, number], [number, number]];

/** 图片裁剪信息 */
export interface ImageElementClip {
  range: ImageClipDataRange;
  shape: string;
}

/** 图片用途类型 */
export type ImageType = 'pageFigure' | 'itemFigure' | 'background';

/** 图片元素（原项目 PPTImageElement） */
export interface PPTImageElement extends PPTBaseElement {
  type: 'image';
  /** 固定宽高比，默认 true */
  fixedRatio: boolean;
  /** 资源引用：URL 或占位 id */
  src: AssetRef;
  outline?: PPTElementOutline;
  filters?: ImageElementFilters;
  clip?: ImageElementClip;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  /** 圆角半径 */
  radius?: number;
  /** 颜色蒙版 */
  colorMask?: string;
  imageType?: ImageType;
  /** 软边缘羽化半径（px） */
  softEdge?: number;
}

/** 形状内文本的垂直对齐 */
export type ShapeTextAlign = 'top' | 'middle' | 'bottom';

/** 形状内文本（原项目 ShapeText） */
export interface ShapeText {
  content: string;
  defaultFontName: string;
  defaultColor: string;
  /** 默认 "middle" */
  align: ShapeTextAlign;
  lineHeight?: number;
  wordSpace?: number;
  paragraphSpace?: number;
  type?: TextType;
}

/** 形状元素（原项目 PPTShapeElement） */
export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape';
  /** SVG viewBox，例如 [1000, 1000] */
  viewBox: [number, number];
  /** SVG path 的 d 属性 */
  path: string;
  fixedRatio: boolean;
  /** 填充色，默认 '#5b9bd5' */
  fill: string;
  gradient?: Gradient;
  pattern?: string;
  outline?: PPTElementOutline;
  opacity?: number;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: PPTElementShadow;
  special?: boolean;
  text?: ShapeText;
  pathFormula?: ShapePathFormulasKeys;
  keypoints?: number[];
}

/** 线条端点样式 */
export type LinePoint = '' | 'arrow' | 'dot';

/**
 * 线条元素（原项目 PPTLineElement，无 height/rotate）。
 * 注意：start/end 为画布坐标；width 字段语义是「线宽」而非元素宽度。
 */
export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line';
  start: [number, number];
  end: [number, number];
  /** 默认 "solid" */
  style: LineStyleType;
  /** 默认 "#333333" */
  color: string;
  /** 端点样式，默认 ["", ""] */
  points: [LinePoint, LinePoint];
  shadow?: PPTElementShadow;
  /** 折线控制点 */
  broken?: [number, number];
  /** 双折线控制点 */
  broken2?: [number, number];
  /** 二次曲线控制点 */
  curve?: [number, number];
  /** 三次曲线控制点 */
  cubic?: [[number, number], [number, number]];
}

/** 全部幻灯片元素的联合类型（收敛为四类） */
export type PPTElement = PPTTextElement | PPTShapeElement | PPTLineElement | PPTImageElement;

// ==================== 动画（幻灯片级，保留） ====================

/** 动画类型（入场 / 退场 / 强调） */
export type AnimationType = 'in' | 'out' | 'attention';
/** 动画触发方式 */
export type AnimationTrigger = 'click' | 'meantime' | 'auto';

/** 元素动画（原项目 PPTAnimation） */
export interface PPTAnimation {
  id: string;
  elId: string;
  effect: string;
  type: AnimationType;
  duration: number;
  trigger: AnimationTrigger;
}

// ==================== 背景 / 主题 / 页面 ====================

/** 背景类型 */
export type SlideBackgroundType = 'solid' | 'image' | 'gradient';
/** 背景图片尺寸模式 */
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat';
/** 背景图片 */
export interface SlideBackgroundImage {
  src: string;
  size: SlideBackgroundImageSize;
}

/** 幻灯片背景（原项目 SlideBackground） */
export interface SlideBackground {
  type: SlideBackgroundType;
  color?: string;
  image?: SlideBackgroundImage;
  gradient?: Gradient;
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
  | 'scaleReverse';

/** 章节标签 */
export interface SectionTag {
  id: string;
  title?: string;
}

/** 页面类型（封面 / 目录 / 过渡 / 内容 / 结尾） */
export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end';

/** 幻灯片主题（原项目 SlideTheme） */
export interface SlideTheme {
  backgroundColor: string;
  themeColors: string[];
  fontColor: string;
  fontName: string;
  outline?: PPTElementOutline;
  shadow?: PPTElementShadow;
}

/** 幻灯片页面（原项目 Slide） */
export interface Slide {
  id: string;
  /** 视口逻辑宽度（默认 1000） */
  viewportSize: number;
  /** 视口宽高比（默认 0.5625 = 16:9） */
  viewportRatio: number;
  theme: SlideTheme;
  /** 元素集合（绝对定位，仅四类） */
  elements: PPTElement[];
  background?: SlideBackground;
  animations?: PPTAnimation[];
  turningMode?: TurningMode;
  sectionTag?: SectionTag;
  type?: SlideType;
  /** 讲稿备注（从 .pptx 导入的演讲备注） */
  script?: string;
}
