/**
 * 文件头：幻灯片背景样式 composable
 *
 * 对应原项目：lib/hooks/use-slide-background-style.ts
 *
 * 功能：把响应式的 SlideBackground 转成 CSS 样式（纯逻辑见 utils/slide-style.ts）。
 */
import { computed, type ComputedRef, type CSSProperties } from 'vue'
import type { SlideBackground } from '@/types/dsl'
import { resolveSlideBackgroundStyle } from '@/utils/slide-style'

/** 输入：背景数据（响应式）；输出：背景 CSS 样式（响应式） */
export function useSlideBackgroundStyle(
  background: ComputedRef<SlideBackground | undefined>,
): { backgroundStyle: ComputedRef<CSSProperties> } {
  const backgroundStyle = computed(() => resolveSlideBackgroundStyle(background.value))
  return { backgroundStyle }
}
