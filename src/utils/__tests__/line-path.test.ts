/**
 * 文件头：线条 SVG 路径生成测试
 *
 * 对应原项目：无独立测试（逻辑来自 lib/utils/element.ts getLineElementPath）
 *
 * 功能：验证直线/折线/双折线/二次曲线/三次曲线各分支的 d 属性。
 */
import { describe, it, expect } from 'vitest'
import { getLineElementPath } from '#/utils/line-path'
import type { PPTLineElement } from '#/types/dsl'

function makeLine(partial: Partial<PPTLineElement>): PPTLineElement {
  return {
    id: 'l1',
    type: 'line',
    left: 0,
    top: 0,
    width: 3,
    start: [10, 20],
    end: [100, 80],
    style: 'solid',
    color: '#000',
    points: ['', ''],
    ...partial,
  }
}

describe('getLineElementPath', () => {
  it('直线', () => {
    expect(getLineElementPath(makeLine({}))).toBe('M10,20 L100,80')
  })

  it('单折线', () => {
    expect(getLineElementPath(makeLine({ broken: [50, 60] }))).toBe('M10,20 L50,60 L100,80')
  })

  it('双折线（横向跨度大）', () => {
    expect(getLineElementPath(makeLine({ broken2: [50, 0] }))).toBe(
      'M10,20 L50,20 L50,80 100,80',
    )
  })

  it('二次曲线', () => {
    expect(getLineElementPath(makeLine({ curve: [55, 10] }))).toBe('M10,20 Q55,10 100,80')
  })

  it('三次曲线', () => {
    expect(getLineElementPath(makeLine({ cubic: [[30, 0], [70, 100]] }))).toBe(
      'M10,20 C30,0 70,100 100,80',
    )
  })
})
