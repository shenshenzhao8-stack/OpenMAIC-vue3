/**
 * 文件头：幻灯片样式纯函数
 *
 * 对应原项目：
 *   - lib/hooks/use-slide-background-style.ts（背景数据 → CSS）
 *   - components/slide-renderer/components/element/hooks/useElementShadow.ts（阴影）
 *   - components/slide-renderer/components/element/hooks/useElementFill.ts / useFilter.ts（滤镜）
 *
 * 功能：把 DSL 数据转成 CSS 的纯函数，便于单元测试；组件内直接调用。
 */
import type { CSSProperties } from 'vue'
import type {
  SlideBackground,
  PPTElementShadow,
  ImageElementFilters,
} from '@/types/dsl'

/**
 * 幻灯片背景 → CSS 样式。
 * 支持：纯色 / 图片（cover/contain/repeat）/ 渐变（线性/径向）。
 * 逻辑与原项目 use-slide-background-style 一致。
 */
export function resolveSlideBackgroundStyle(
  background: SlideBackground | undefined,
): CSSProperties {
  if (!background) return { backgroundColor: '#ffffff' }

  const { type, color, image, gradient } = background

  // 纯色背景
  if (type === 'solid') return { backgroundColor: color }

  // 图片背景
  if (type === 'image' && image) {
    const { src, size } = image
    if (!src) return { backgroundColor: '#ffffff' }
    if (size === 'repeat') {
      return {
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'contain',
      }
    }
    return {
      backgroundImage: `url(${src})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: size || 'cover',
    }
  }

  // 渐变背景
  if (type === 'gradient' && gradient) {
    const list = gradient.colors.map((c) => `${c.color} ${c.pos}%`)
    if (gradient.type === 'radial') {
      return { backgroundImage: `radial-gradient(${list.join(',')})` }
    }
    return { backgroundImage: `linear-gradient(${gradient.rotate}deg, ${list.join(',')})` }
  }

  return { backgroundColor: '#ffffff' }
}

/**
 * 元素阴影 → CSS text-shadow / drop-shadow 值。
 * 格式：`h v blur color`；无阴影返回空字符串。
 */
export function resolveElementShadow(shadow?: PPTElementShadow): string {
  if (!shadow) return ''
  return `${shadow.h}px ${shadow.v}px ${shadow.blur}px ${shadow.color}`
}

/**
 * 图片滤镜 → CSS filter 值（对应原项目 useFilter 的字段映射）。
 */
export function resolveElementFilters(filters?: ImageElementFilters): string {
  if (!filters) return ''
  const parts: string[] = []
  if (filters.blur) parts.push(`blur(${filters.blur})`)
  if (filters.brightness) parts.push(`brightness(${filters.brightness})`)
  if (filters.contrast) parts.push(`contrast(${filters.contrast})`)
  if (filters.grayscale) parts.push(`grayscale(${filters.grayscale})`)
  if (filters.saturate) parts.push(`saturate(${filters.saturate})`)
  if (filters['hue-rotate']) parts.push(`hue-rotate(${filters['hue-rotate']})`)
  if (filters.sepia) parts.push(`sepia(${filters.sepia})`)
  if (filters.invert) parts.push(`invert(${filters.invert})`)
  if (filters.opacity) parts.push(`opacity(${filters.opacity})`)
  return parts.join(' ')
}
