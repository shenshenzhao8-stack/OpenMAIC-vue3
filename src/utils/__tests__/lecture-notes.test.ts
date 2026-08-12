/**
 * 文件头：讲义构建纯函数测试
 *
 * 功能：验证 buildLectureNotes：
 *   - 按场景分组、按 sceneOrder 排序；
 *   - speech → kind=speech 条目（保留文本）；spotlight/laser → kind=action 徽章；
 *   - 非本项目动作类型（如 discussion）被过滤；
 *   - 空动作场景被过滤；徽章文案映射正确。
 */
import { describe, it, expect } from 'vitest'
import { buildLectureNotes, getLectureActionLabel } from '@/utils/lecture-notes'
import type { Scene } from '@/types/stage'

/** 构造最小 slide 场景（仅讲义构建需要的字段） */
function makeScene(id: string, order: number, actions: Scene['actions']): Scene {
  return {
    id,
    stageId: 's1',
    title: `场景 ${order}`,
    order,
    type: 'slide',
    content: {
      type: 'slide',
      canvas: {
        id: `canvas-${id}`,
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: { backgroundColor: '#fff', themeColors: [], fontColor: '#333', fontName: 'Arial' },
        elements: [],
      },
    },
    actions,
  }
}

describe('讲义构建（buildLectureNotes）', () => {
  it('按场景分组、按 sceneOrder 排序，只保留有动作的场景', () => {
    const scenes = [
      makeScene('sc2', 2, [{ id: 'x', type: 'speech', text: '第二页' }]),
      makeScene('sc1', 1, [{ id: 'y', type: 'speech', text: '第一页' }]),
      makeScene('sc-empty', 3, []),
    ]
    const notes = buildLectureNotes(scenes)
    expect(notes.map((n) => n.sceneOrder)).toEqual([1, 2])
    expect(notes[0].items[0]).toMatchObject({ kind: 'speech', text: '第一页' })
  })

  it('speech 生成文本条目；spotlight/laser 生成动作徽章且顺序保持', () => {
    const scene = makeScene('sc1', 1, [
      { id: 'a1', type: 'speech', text: '讲解第一句' },
      { id: 'a2', type: 'spotlight', elementId: 'img_1', dimOpacity: 0.5 },
      { id: 'a3', type: 'laser', elementId: 'txt_1', color: '#ff0000' },
      { id: 'a4', type: 'speech', text: '讲解第二句' },
    ])
    const [note] = buildLectureNotes([scene])
    expect(note.items.map((i) => i.kind)).toEqual(['speech', 'action', 'action', 'speech'])
    expect(note.items[0]).toMatchObject({ kind: 'speech', text: '讲解第一句', actionIndex: 0 })
    expect(note.items[1]).toMatchObject({ kind: 'action', type: 'spotlight', actionIndex: 1 })
    expect(note.items[2]).toMatchObject({ kind: 'action', type: 'laser', actionIndex: 2 })
  })

  it('非本项目动作类型被过滤（discussion 等已裁剪）', () => {
    const scene = makeScene('sc1', 1, [
      { id: 'a1', type: 'speech', text: '保留' },
      { id: 'a2', type: 'discussion', agentId: 'x', topic: '讨论' } as never,
    ])
    const [note] = buildLectureNotes([scene])
    expect(note.items).toHaveLength(1)
    expect(note.items[0]).toMatchObject({ kind: 'speech', text: '保留' })
  })

  it('动作徽章文案映射：spotlight → 聚光、laser → 激光、未知 → 空串', () => {
    expect(getLectureActionLabel('spotlight')).toBe('聚光')
    expect(getLectureActionLabel('laser')).toBe('激光')
    expect(getLectureActionLabel('discussion')).toBe('')
  })
})
