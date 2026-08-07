/**
 * 文件头：接口层（client）冒烟测试
 *
 * 对应原项目：无直接对应（原项目前端无统一 client 测试）
 *
 * 功能：
 *   1. listClassrooms 返回示例课程；
 *   2. getClassroom('demo') 返回 3 种场景且动作只含 speech/spotlight；
 *   3. chatStream 返回的 SSE 流以 agent_start 开头、以 done 结尾（一问一答协议）。
 */
import { describe, it, expect } from 'vitest'
import { listClassrooms, getClassroom, chatStream } from '@/api/client'

/** 解析 SSE 响应体，返回事件数组 */
async function readSseEvents(response: Response): Promise<unknown[]> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: unknown[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const line = part.trim()
      if (line.startsWith('data: ')) {
        events.push(JSON.parse(line.slice(6)))
      }
    }
  }
  return events
}

describe('接口层 client（mock）', () => {
  it('listClassrooms 返回示例课堂', async () => {
    const list = await listClassrooms()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].id).toBe('demo')
    expect(list[0].scenesCount).toBeGreaterThan(0)
  })

  it('getClassroom(demo) 返回三种场景且动作仅 speech/spotlight', async () => {
    const { stage, scenes } = await getClassroom('demo')
    expect(stage.name).toBe('光合作用')
    // 三种场景类型都出现
    const types = new Set(scenes.map((s) => s.type))
    expect(types.has('slide')).toBe(true)
    expect(types.has('quiz')).toBe(true)
    expect(types.has('interactive')).toBe(true)
    // 动作白名单校验（裁剪范围：speech + spotlight）
    for (const scene of scenes) {
      for (const action of scene.actions ?? []) {
        expect(['speech', 'spotlight']).toContain(action.type)
      }
    }
  })

  it('getClassroom 对未知 id 抛错', async () => {
    await expect(getClassroom('not-exist')).rejects.toThrow()
  })

  it('chatStream 返回一问一答 SSE 流（agent_start 开头、done 结尾）', async () => {
    const response = await chatStream({ messages: [], storeState: {} }, new AbortController().signal)
    const events = (await readSseEvents(response)) as Array<{ type: string }>
    expect(events.length).toBeGreaterThan(2)
    expect(events[0].type).toBe('agent_start')
    expect(events[events.length - 1].type).toBe('done')
    // 一问一答：deltas 之间存在 text_delta
    expect(events.some((e) => e.type === 'text_delta')).toBe(true)
  })
})
