/**
 * 文件头：资源路径解析工具测试
 *
 * 功能：验证 resolveAssetUrl：
 *   - 无 base 时保持根相对路径（独立应用行为）；
 *   - 有 base 时正确拼接（Web 宿主行为）；
 *   - 完整 URL / blob / data URI 不被改写。
 */
import { describe, it, expect } from 'vitest'
import { resolveAssetUrl } from '#/utils/asset'

describe('资源路径解析（resolveAssetUrl）', () => {
  it('无 base 时保持根相对路径', () => {
    expect(resolveAssetUrl('/audio/a1.mp3')).toBe('/audio/a1.mp3')
  })

  it('有 base 时拼接为 base + 相对路径', () => {
    expect(resolveAssetUrl('/audio/a1.mp3', 'https://cdn.example.com/ai')).toBe(
      'https://cdn.example.com/ai/audio/a1.mp3',
    )
    // base 尾部斜杠、path 头部斜杠都应被归一化
    expect(resolveAssetUrl('/audio/a1.mp3', 'https://cdn.example.com/ai/')).toBe(
      'https://cdn.example.com/ai/audio/a1.mp3',
    )
  })

  it('完整 URL / blob / data URI 不被改写', () => {
    expect(resolveAssetUrl('https://cdn.example.com/a.mp3', 'https://other.com')).toBe(
      'https://cdn.example.com/a.mp3',
    )
    expect(resolveAssetUrl('blob:http://localhost:5173/xxx', 'https://cdn.com')).toBe(
      'blob:http://localhost:5173/xxx',
    )
    expect(resolveAssetUrl('data:image/svg+xml;utf8,abc', 'https://cdn.com')).toBe(
      'data:image/svg+xml;utf8,abc',
    )
  })
})
