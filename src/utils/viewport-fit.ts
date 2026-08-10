/**
 * 文件头：幻灯片视口自适应纯算法
 *
 * 对应原项目：packages/@openmaic/renderer/src/hooks/useViewportSize.ts
 *
 * 功能：给定容器尺寸与幻灯片逻辑尺寸（viewportSize=1000、viewportRatio=0.5625），
 * 计算「画布框」的实际像素尺寸、居中偏移与缩放比。逻辑与原项目一致：
 *   - 容器偏宽（容器宽高比 > 幻灯片宽高比）：按宽度适配；
 *   - 容器偏高：按高度适配；
 *   - canvasPercentage 限制画布占容器的百分比。
 */
export interface SlideViewportFit {
  /** 画布框实际像素宽度 */
  width: number
  /** 画布框实际像素高度 */
  height: number
  /** 水平居中偏移 */
  left: number
  /** 垂直居中偏移 */
  top: number
  /** 内容层缩放比（scale） */
  scale: number
}

/**
 * 计算视口适配结果。
 * @param containerWidth 容器像素宽
 * @param containerHeight 容器像素高
 * @param viewportSize 幻灯片逻辑宽（默认 1000）
 * @param viewportRatio 幻灯片宽高比（默认 0.5625 = 16:9）
 * @param canvasPercentage 画布占容器百分比（默认 100）
 */
export function computeSlideViewportFit(
  containerWidth: number,
  containerHeight: number,
  viewportSize: number = 1000,
  viewportRatio: number = 0.5625,
  canvasPercentage: number = 100,
): SlideViewportFit {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0, left: 0, top: 0, scale: 1 }
  }

  if (containerHeight / containerWidth > viewportRatio) {
    // 容器偏宽：按宽度适配
    const width = containerWidth * (canvasPercentage / 100)
    const scale = width / viewportSize
    const height = viewportSize * viewportRatio * scale
    return {
      width,
      height,
      left: (containerWidth - width) / 2,
      top: (containerHeight - height) / 2,
      scale,
    }
  }

  // 容器偏高：按高度适配
  const height = containerHeight * (canvasPercentage / 100)
  const scale = height / (viewportSize * viewportRatio)
  const width = viewportSize * scale
  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    scale,
  }
}
