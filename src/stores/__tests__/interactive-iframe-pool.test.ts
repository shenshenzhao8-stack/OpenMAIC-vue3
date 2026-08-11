/**
 * 文件头：交互 iframe 保活池测试
 *
 * 对应原项目：无独立测试（逻辑来自 lib/store/interactive-iframe-pool.ts）
 *
 * 功能：验证保活快路径、内容变化重建、LRU 淘汰、可见权 owner 语义、reset。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInteractiveIframePool, IFRAME_POOL_CAP } from '@/stores/interactive-iframe-pool'

describe('交互 iframe 保活池', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('同内容 mount 走保活快路径（不换 srcDoc）', () => {
    const pool = useInteractiveIframePool()
    pool.mount('s1', { srcDoc: '<html>a</html>' })
    const firstTick = pool.tick
    pool.mount('s1', { srcDoc: '<html>a</html>' })
    expect(pool.entries['s1'].srcDoc).toBe('<html>a</html>')
    expect(pool.tick).toBeGreaterThan(firstTick) // 刷新最近使用时间
  })

  it('内容变化会重建记录', () => {
    const pool = useInteractiveIframePool()
    pool.mount('s1', { srcDoc: 'a' })
    pool.mount('s1', { srcDoc: 'b' })
    expect(pool.entries['s1'].srcDoc).toBe('b')
  })

  it('LRU 淘汰：超过上限时移除最久未用、且非活动的场景', () => {
    const pool = useInteractiveIframePool()
    pool.setActive('s2')
    pool.mount('s1', { srcDoc: '1' })
    pool.mount('s2', { srcDoc: '2' })
    pool.mount('s3', { srcDoc: '3' })
    // 再挂载 s4，应淘汰非活动的 s1
    pool.mount('s4', { srcDoc: '4' })
    expect(Object.keys(pool.entries)).toHaveLength(IFRAME_POOL_CAP)
    expect(pool.entries['s1']).toBeUndefined()
    expect(pool.entries['s2']).toBeDefined()
    expect(pool.entries['s4']).toBeDefined()
  })

  it('claim/release 的 owner 语义（仅当前 owner 可释放）', () => {
    const pool = useInteractiveIframePool()
    pool.mount('s1', { srcDoc: 'a' })
    pool.claim('s1', 'o1')
    expect(pool.entries['s1'].owner).toBe('o1')
    // 旧 owner 释放：no-op
    pool.release('s1', 'o2')
    expect(pool.entries['s1'].owner).toBe('o1')
    // 当前 owner 释放
    pool.release('s1', 'o1')
    expect(pool.entries['s1'].owner).toBeNull()
  })

  it('setRect 矩形无变化不更新、reset 清空', () => {
    const pool = useInteractiveIframePool()
    pool.mount('s1', { srcDoc: 'a' })
    pool.setRect('s1', { left: 0, top: 0, width: 100, height: 50 })
    const ref1 = pool.entries['s1'].rect
    pool.setRect('s1', { left: 0, top: 0, width: 100, height: 50 })
    expect(pool.entries['s1'].rect).toBe(ref1)
    pool.reset()
    expect(Object.keys(pool.entries)).toHaveLength(0)
    expect(pool.activeSceneId).toBeNull()
  })
})
