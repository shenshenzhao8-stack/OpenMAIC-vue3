/**
 * 文件头：iframe 安全补丁测试
 *
 * 对应原项目：无独立测试（逻辑来自 lib/utils/iframe.ts）
 *
 * 功能：验证补丁注入位置（<head> 后 / <head attr> 后 / 前插）与注入内容。
 */
import { describe, it, expect } from 'vitest'
import { patchHtmlForIframe } from '@/utils/iframe'

describe('patchHtmlForIframe', () => {
  it('注入到 <head> 之后，且包含三个补丁', () => {
    const html = '<html><head><title>t</title></head><body>hi</body></html>'
    const patched = patchHtmlForIframe(html)
    expect(patched.indexOf('<head>') < patched.indexOf('data-iframe-error-shim')).toBe(true)
    expect(patched).toContain('data-iframe-error-shim')
    expect(patched).toContain('data-iframe-storage-shim')
    expect(patched).toContain('data-iframe-patch')
    // 原内容仍在
    expect(patched).toContain('<body>hi</body>')
  })

  it('支持带属性的 <head class="x">', () => {
    const html = '<html><head class="x"><title>t</title></head><body>hi</body></html>'
    const patched = patchHtmlForIframe(html)
    expect(patched).toContain('<head class="x">')
    expect(patched.indexOf('data-iframe-error-shim') > patched.indexOf('<head class="x">')).toBe(true)
  })

  it('无 <head> 时前插（补丁在 body 之前）', () => {
    const html = '<html><body>hi</body></html>'
    const patched = patchHtmlForIframe(html)
    expect(patched.indexOf('data-iframe-error-shim')).toBeGreaterThan(-1)
    expect(patched.indexOf('data-iframe-error-shim') < patched.indexOf('<body>')).toBe(true)
  })
})
