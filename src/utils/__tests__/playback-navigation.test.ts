/**
 * 文件头：播放导航纯函数测试
 *
 * 对应原项目：tests/ 中与 stage-api-navigation 相关的测试
 *
 * 功能：验证上一页/下一页/首页计算逻辑（首尾越界返回 null）。
 */
import { describe, it, expect } from 'vitest'
import { getAdjacentSceneId, getFirstSceneId, getSceneForPlayback } from '#/utils/playback-navigation'
import type { Scene } from '#/types/stage'

/** 构造最小场景（仅 id/type/title 用于导航计算） */
function makeScene(id: string): Scene {
  return {
    id,
    stageId: 's1',
    title: id,
    order: 1,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: `c-${id}`,
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: { backgroundColor: '#fff', themeColors: [], fontColor: '#333', fontName: 'a' },
        elements: [],
      },
    },
  }
}

describe('播放导航纯函数', () => {
  const scenes = [makeScene('a'), makeScene('b'), makeScene('c')]

  it('getFirstSceneId 返回第一个场景', () => {
    expect(getFirstSceneId(scenes)).toBe('a')
    expect(getFirstSceneId([])).toBeNull()
  })

  it('getAdjacentSceneId 下一页/上一页正确', () => {
    expect(getAdjacentSceneId(scenes, 'a', 1)).toBe('b')
    expect(getAdjacentSceneId(scenes, 'b', -1)).toBe('a')
  })

  it('首尾越界返回 null', () => {
    expect(getAdjacentSceneId(scenes, 'a', -1)).toBeNull()
    expect(getAdjacentSceneId(scenes, 'c', 1)).toBeNull()
    expect(getAdjacentSceneId([], 'a', 1)).toBeNull()
    expect(getAdjacentSceneId(scenes, 'not-exist', 1)).toBeNull()
  })
})

describe('getSceneForPlayback（按场景播放，对应原项目 [currentScene]）', () => {
  const scenes = [makeScene('a'), makeScene('b'), makeScene('c')]

  it('当前场景存在时返回单元素数组', () => {
    const result = getSceneForPlayback(scenes, 'b')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
  })

  it('当前场景不存在（或为空）时返回空数组', () => {
    expect(getSceneForPlayback(scenes, 'not-exist')).toHaveLength(0)
    expect(getSceneForPlayback([], 'a')).toHaveLength(0)
  })
})
