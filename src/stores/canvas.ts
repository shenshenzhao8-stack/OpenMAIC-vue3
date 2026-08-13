/**
 * 文件头：canvas store（Pinia）
 *
 * 对应原项目：lib/store/canvas.ts（Zustand）——「灯光控制台」
 *
 * 功能：管理课堂播放/编辑时的一切「表演状态」，但不存幻灯片数据本身
 * （幻灯片数据在 stage store 的 scenes 里）：
 *   - 聚光 / 高亮 / 激光 / 缩放（教学特效）；
 *   - 白板开关（类型保留，无白板功能）；
 *   - 视频播放中的元素 id；
 *   - 画布视口（缩放比、逻辑尺寸）。
 *
 * 为什么仿写为 Pinia：字段与 action 名保持与原项目一致
 * （setSpotlight / clearAllEffects / setWhiteboardOpen / pauseVideo ...），
 * 因为照搬的播放引擎与 ActionEngine 直接按这些名字调用。
 *
 * 兼容层说明：原项目是 Zustand，照搬代码使用 `useCanvasStore.getState()` 访问；
 * Pinia 的 store 定义是函数（`useCanvasStore()` 返回实例）。因此这里在导出时
 * 挂载 getState() 转发到实例，让照搬代码（engine.ts / action/engine.ts）零改动。
 */
import { defineStore } from 'pinia';

/** 聚光配置（裁剪：保留 dimness 变暗程度） */
export interface SpotlightOptions {
  dimness?: number;
}

/** 高亮配置（裁剪：类型保留） */
export interface HighlightOverlayOptions {
  color?: string;
  opacity?: number;
  borderWidth?: number;
  animated?: boolean;
}

/** 激光配置（裁剪：类型保留） */
export interface LaserOptions {
  color?: string;
  duration?: number;
}

/** canvas store 状态 */
interface CanvasState {
  // ===== 教学特效状态 =====
  spotlightElementId: string;
  spotlightOptions: SpotlightOptions | null;
  highlightedElementIds: string[];
  highlightOptions: HighlightOverlayOptions | null;
  laserElementId: string;
  laserOptions: LaserOptions | null;
  zoomTarget: { elementId: string; scale: number } | null;
  // ===== 白板（类型保留，无功能） =====
  whiteboardOpen: boolean;
  whiteboardClearing: boolean;
  // ===== 视频 =====
  playingVideoElementId: string;
  // ===== 画布视口 =====
  canvasScale: number;
  viewportSize: number;
  viewportRatio: number;
}

/** Pinia store 定义（不直接导出，导出带兼容层的包装） */
const canvasStoreDefinition = defineStore('openmaic-canvas', {
  state: (): CanvasState => ({
    spotlightElementId: '',
    spotlightOptions: null,
    highlightedElementIds: [],
    highlightOptions: null,
    laserElementId: '',
    laserOptions: null,
    zoomTarget: null,
    whiteboardOpen: false,
    whiteboardClearing: false,
    playingVideoElementId: '',
    canvasScale: 1,
    viewportSize: 1000,
    viewportRatio: 0.5625,
  }),
  actions: {
    /** 设置聚光：聚焦元素 + 变暗程度（其余元素由渲染层遮罩处理） */
    setSpotlight(elementId: string, options: SpotlightOptions = {}) {
      this.spotlightElementId = elementId;
      this.spotlightOptions = options;
    },
    /** 清除全部视觉特效（聚光/高亮/激光/缩放） */
    clearAllEffects() {
      this.spotlightElementId = '';
      this.spotlightOptions = null;
      this.highlightedElementIds = [];
      this.highlightOptions = null;
      this.laserElementId = '';
      this.laserOptions = null;
      this.zoomTarget = null;
    },
    /** 设置高亮元素列表（类型保留） */
    setHighlight(elementIds: string[], options: HighlightOverlayOptions = {}) {
      this.highlightedElementIds = elementIds;
      this.highlightOptions = options;
    },
    /** 设置激光目标（类型保留） */
    setLaser(elementId: string, options: LaserOptions = {}) {
      this.laserElementId = elementId;
      this.laserOptions = options;
    },
    /** 设置缩放目标（类型保留） */
    setZoom(elementId: string, scale: number) {
      this.zoomTarget = { elementId, scale };
    },
    /** 打开/关闭白板（无白板功能，供引擎状态保持） */
    setWhiteboardOpen(open: boolean) {
      this.whiteboardOpen = open;
    },
    /** 设置白板清除动画状态（供引擎状态保持） */
    setWhiteboardClearing(clearing: boolean) {
      this.whiteboardClearing = clearing;
    },
    /** 播放指定视频元素（类型保留） */
    playVideo(elementId: string) {
      this.playingVideoElementId = elementId;
    },
    /** 暂停当前视频 */
    pauseVideo() {
      this.playingVideoElementId = '';
    },
  },
});

/** store 实例类型（供兼容层返回类型使用） */
type CanvasStoreInstance = ReturnType<typeof canvasStoreDefinition>;

/**
 * 导出带兼容层的 store：
 * - 组件内用 Pinia 风格：`useCanvasStore().spotlightElementId`；
 * - 照搬的引擎代码用 Zustand 风格：`useCanvasStore.getState().setSpotlight(...)`。
 */
export const useCanvasStore = Object.assign(canvasStoreDefinition, {
  getState: (): CanvasStoreInstance => canvasStoreDefinition(),
});
