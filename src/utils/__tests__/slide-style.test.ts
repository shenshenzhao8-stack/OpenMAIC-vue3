/**
 * 文件头：幻灯片样式纯函数测试
 *
 * 对应原项目：无独立测试文件（逻辑来自 use-slide-background-style 等）
 *
 * 功能：验证背景（纯色/图片/渐变/缺省）、阴影、滤镜的 CSS 转换。
 */
import { describe, it, expect } from 'vitest'
import {
  resolveSlideBackgroundStyle,
  resolveElementShadow,
  resolveElementFilters,
} from '#/utils/slide-style'
import type { SlideBackground } from '#/types/dsl'

describe('resolveSlideBackgroundStyle', () => {
  it('无背景默认白色', () => {
    expect(resolveSlideBackgroundStyle(undefined)).toEqual({ backgroundColor: '#ffffff' })
  })

  it('纯色背景', () => {
    const bg: SlideBackground = { type: 'solid', color: '#ff0000' }
    expect(resolveSlideBackgroundStyle(bg)).toEqual({ backgroundColor: '#ff0000' })
  })

  it('图片背景 cover', () => {
    const bg: SlideBackground = { type: 'image', image: { src: 'x.png', size: 'cover' } }
    expect(resolveSlideBackgroundStyle(bg)).toEqual({
      backgroundImage: 'url(x.png)',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    })
  })

  it('线性渐变背景', () => {
    const bg: SlideBackground = {
      type: 'gradient',
      gradient: {
        type: 'linear',
        colors: [
          { pos: 0, color: '#e8f4fd' },
          { pos: 100, color: '#ffffff' },
        ],
        rotate: 135,
      },
    }
    expect(resolveSlideBackgroundStyle(bg)).toEqual({
      backgroundImage: 'linear-gradient(135deg, #e8f4fd 0%,#ffffff 100%)',
    })
  })
})

describe('resolveElementShadow / resolveElementFilters', () => {
  it('阴影格式 h v blur color', () => {
    expect(resolveElementShadow({ h: 1, v: 2, blur: 3, color: '#000' })).toBe('1px 2px 3px #000')
    expect(resolveElementShadow(undefined)).toBe('')
  })

  it('滤镜字段映射', () => {
    expect(resolveElementFilters({ blur: '2px', grayscale: '100%' })).toBe(
      'blur(2px) grayscale(100%)',
    )
    expect(resolveElementFilters(undefined)).toBe('')
  })
})
