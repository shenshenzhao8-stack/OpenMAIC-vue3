/**
 * 文件头：元素几何计算测试
 *
 * 对应原项目：无独立测试（逻辑来自 lib/utils/geometry.ts）
 *
 * 功能：验证百分比几何、场景查找、最近角落计算。
 */
import { describe, it, expect } from 'vitest'
import {
  getElementPercentageGeometry,
  findElementGeometry,
  findNearestCorner,
} from '#/utils/geometry'
import type { PPTElement } from '#/types/dsl'

/** 构造一个文本元素 */
function makeTextElement(partial?: Partial<PPTElement>): PPTElement {
  return {
    id: 'txt_1',
    type: 'text',
    left: 200,
    top: 60,
    width: 600,
    height: 90,
    rotate: 0,
    content: '测试',
    defaultColor: '#333',
    defaultFontName: 'a',
    ...partial,
  } as PPTElement
}

describe('getElementPercentageGeometry', () => {
  it('计算百分比坐标与中心点（1000×562.5 坐标系）', () => {
    const g = getElementPercentageGeometry(makeTextElement(), 1000)
    expect(g).not.toBeNull()
    expect(g!.x).toBeCloseTo(20, 6) // 200/1000*100
    expect(g!.y).toBeCloseTo(60 / 562.5 * 100, 6)
    expect(g!.w).toBeCloseTo(60, 6)
    expect(g!.h).toBeCloseTo(90 / 562.5 * 100, 6)
    expect(g!.centerX).toBeCloseTo(50, 6)
    expect(g!.centerY).toBeCloseTo((60 + 45) / 562.5 * 100, 6)
  })

  it('无 height 的元素（如 line）返回 null', () => {
    const line = {
      id: 'l1',
      type: 'line',
      left: 0,
      top: 0,
      width: 3,
      start: [0, 0],
      end: [100, 100],
      style: 'solid',
      color: '#000',
      points: ['', ''],
    } as unknown as PPTElement
    expect(getElementPercentageGeometry(line, 1000)).toBeNull()
  })
})

describe('findElementGeometry', () => {
  it('支持新格式（content.canvas.elements）', () => {
    const scene = {
      type: 'slide',
      content: { canvas: { elements: [makeTextElement()] } },
    }
    const g = findElementGeometry(scene as never, 'txt_1', 1000)
    expect(g?.centerX).toBeCloseTo(50, 6)
  })

  it('支持旧格式（scene.elements）', () => {
    const scene = { type: 'slide', elements: [makeTextElement()] }
    const g = findElementGeometry(scene as never, 'txt_1', 1000)
    expect(g?.centerX).toBeCloseTo(50, 6)
  })

  it('找不到元素返回 null', () => {
    const scene = { type: 'slide', elements: [makeTextElement()] }
    expect(findElementGeometry(scene as never, 'not-exist', 1000)).toBeNull()
  })
})

describe('findNearestCorner', () => {
  it('左上区域元素 → 最近角落为左上', () => {
    expect(findNearestCorner({ x: 20, y: 30, w: 10, h: 10, centerX: 25, centerY: 35 })).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('右下区域元素 → 最近角落为右下', () => {
    expect(findNearestCorner({ x: 80, y: 70, w: 10, h: 10, centerX: 85, centerY: 75 })).toEqual({
      x: 100,
      y: 100,
    })
  })
})
