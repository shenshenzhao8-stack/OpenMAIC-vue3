/**
 * 文件头：线条 SVG 路径生成纯函数
 *
 * 对应原项目：lib/utils/element.ts 的 getLineElementPath（照搬，注释已翻译为中文）
 *
 * 功能：根据线条元素（起点/终点/折线/曲线/三次曲线）生成 SVG path 的 d 属性。
 * broken2 分支中与原项目 getElementRange(line) 等价的跨度判断：
 *   spanX = max(start[0], end[0])，spanY = max(start[1], end[1])（line 的
 *   minX=left、maxX=left+max(...)，差值即 max(...)）。
 */
import type { PPTLineElement } from '@/types/dsl'

/** 生成线条 SVG path 的 d 属性 */
export function getLineElementPath(element: PPTLineElement): string {
  // 防御：确保 start/end 是数组
  const startArr = Array.isArray(element.start) ? element.start : [0, 0]
  const endArr = Array.isArray(element.end) ? element.end : [100, 100]
  const start = startArr.join(',')
  const end = endArr.join(',')

  // 单折线：起点 → 控制点 → 终点
  if (element.broken) {
    const mid = element.broken.join(',')
    return `M${start} L${mid} L${end}`
  }

  // 双折线：按横向/纵向跨度选择走线方向
  if (element.broken2) {
    const spanX = Math.max(startArr[0], endArr[0])
    const spanY = Math.max(startArr[1], endArr[1])
    if (spanX >= spanY)
      return `M${start} L${element.broken2[0]},${startArr[1]} L${element.broken2[0]},${endArr[1]} ${end}`
    return `M${start} L${startArr[0]},${element.broken2[1]} L${endArr[0]},${element.broken2[1]} ${end}`
  }

  // 二次曲线
  if (element.curve) {
    const mid = element.curve.join(',')
    return `M${start} Q${mid} ${end}`
  }

  // 三次曲线
  if (element.cubic) {
    const [c1, c2] = element.cubic
    const p1 = c1.join(',')
    const p2 = c2.join(',')
    return `M${start} C${p1} ${p2} ${end}`
  }

  // 直线
  return `M${start} L${end}`
}
