/**
 * 文件头：元素几何计算纯函数（激光/聚光定位用）
 *
 * 对应原项目：lib/utils/geometry.ts（照搬，注释已翻译为中文）
 *
 * 功能：
 *   - getElementPercentageGeometry：把元素 left/top/width/height（1000×562.5 逻辑坐标）
 *     转成 0-100 百分比坐标，并计算中心点（centerX/centerY）；
 *   - findElementGeometry：按场景与元素 id 查找并计算百分比几何；
 *   - findNearestCorner：返回距元素中心最近的画布角落（0-100）。
 */
import type { PPTElement, PercentageGeometry } from '@/types/dsl'

/**
 * 计算元素的百分比几何（0-100 坐标系）。
 * @param element 幻灯片元素
 * @param viewportSize 画布逻辑宽（默认 1000）
 * @returns 百分比几何；元素缺少位置信息时返回 null
 */
export function getElementPercentageGeometry(
  element: PPTElement,
  viewportSize: number = 1000,
): PercentageGeometry | null {
  // 只有具备位置信息的元素（line 除外）才有 left/top/width/height
  if (
    !('left' in element) ||
    !('top' in element) ||
    !('width' in element) ||
    !('height' in element)
  ) {
    return null
  }

  const { left, top, width, height } = element

  // 转百分比（横向按 viewportSize，纵向按 16:9 高度）
  const x = (left / viewportSize) * 100
  const y = (top / (viewportSize * 0.5625)) * 100
  const w = (width / viewportSize) * 100
  const h = (height / (viewportSize * 0.5625)) * 100

  // 中心点
  const centerX = x + w / 2
  const centerY = y + h / 2

  return { x, y, w, h, centerX, centerY }
}

/**
 * 按场景与元素 id 查找百分比几何（兼容新旧两种场景结构）。
 * @param scene 场景（scene.elements 旧结构 或 scene.content.canvas.elements 新结构）
 * @param elementId 元素 id
 * @param viewportSize 画布逻辑宽（默认 1000）
 */
export function findElementGeometry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: Record<string, any>,
  elementId: string,
  viewportSize: number = 1000,
): PercentageGeometry | null {
  let elements: PPTElement[] | undefined

  if (scene.type === 'slide') {
    if (scene.elements) {
      // 旧格式
      elements = scene.elements
    } else if (scene.content?.canvas?.elements) {
      // 新格式
      elements = scene.content.canvas.elements
    }
  }

  if (!elements) return null

  const element = elements.find((el) => el.id === elementId)
  if (!element) return null

  return getElementPercentageGeometry(element, viewportSize)
}

/**
 * 计算距元素中心最近的画布角落（0-100 坐标）。
 * 激光笔「从最近角落飞入」用。
 */
export function findNearestCorner(geometry: PercentageGeometry): {
  x: number
  y: number
} {
  const { centerX, centerY } = geometry

  // 四个角落
  const corners = [
    { x: 0, y: 0 }, // 左上
    { x: 100, y: 0 }, // 右上
    { x: 0, y: 100 }, // 左下
    { x: 100, y: 100 }, // 右下
  ]

  // 计算距离，取最近角落
  let minDistance = Infinity
  let nearestCorner = corners[0]

  for (const corner of corners) {
    const distance = Math.sqrt(Math.pow(corner.x - centerX, 2) + Math.pow(corner.y - centerY, 2))
    if (distance < minDistance) {
      minDistance = distance
      nearestCorner = corner
    }
  }

  return nearestCorner
}
