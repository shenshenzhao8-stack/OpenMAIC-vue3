/**
 * 文件头：视口自适应算法测试
 *
 * 对应原项目：packages/@openmaic/renderer 的 useViewportSize（无独立测试）
 *
 * 功能：验证视口适配规则（与原项目一致）：
 *   - 容器相对偏高（height/width > 0.5625）→ 按宽度适配，上下留黑边居中；
 *   - 容器相对偏宽 → 按高度适配，左右留黑边居中；
 *   - canvasPercentage 限制画布占比。
 */
import { describe, it, expect } from 'vitest'
import { computeSlideViewportFit } from '#/utils/viewport-fit'

describe('computeSlideViewportFit', () => {
  it('16:9 容器（1280×720）满宽满高', () => {
    const fit = computeSlideViewportFit(1280, 720)
    expect(fit.width).toBe(1280)
    expect(fit.height).toBe(720)
    expect(fit.scale).toBe(1.28) // 1280 / 1000
    expect(fit.left).toBe(0)
    expect(fit.top).toBe(0)
  })

  it('容器相对偏高（正方形 800×800）→ 按宽度适配，上下居中', () => {
    const fit = computeSlideViewportFit(800, 800)
    expect(fit.width).toBe(800)
    expect(fit.height).toBe(450) // 800 * 0.5625
    expect(fit.scale).toBe(0.8)
    expect(fit.left).toBe(0)
    expect(fit.top).toBe(175) // (800-450)/2
  })

  it('容器相对偏宽（1600×600）→ 按高度适配，左右居中', () => {
    const fit = computeSlideViewportFit(1600, 600)
    expect(fit.height).toBe(600)
    expect(fit.width).toBeCloseTo(600 * (1000 / 562.5), 6)
    expect(fit.top).toBe(0)
    expect(fit.left).toBeCloseTo((1600 - fit.width) / 2, 6)
  })

  it('canvasPercentage 限制画布占比', () => {
    const fit = computeSlideViewportFit(1280, 720, 1000, 0.5625, 80)
    expect(fit.width).toBe(1024) // 1280 * 80%
  })

  it('容器尺寸为 0 返回安全默认', () => {
    const fit = computeSlideViewportFit(0, 0)
    expect(fit.width).toBe(0)
    expect(fit.scale).toBe(1)
  })
})
