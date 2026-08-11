/**
 * 文件头：幻灯片视口自适应 hook（组合式函数）
 *
 * 对应原项目：packages/@openmaic/renderer/src/hooks/useViewportSize.ts
 *
 * 功能：测量容器尺寸（ResizeObserver 监听变化），用纯算法（utils/viewport-fit.ts）
 * 计算画布框的像素尺寸、居中偏移与缩放比。
 * 支持外部传入容器 ref（页面组件自建 ref 并绑定模板），便于脚本引用。
 */
import { ref, computed, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import { computeSlideViewportFit, type SlideViewportFit } from '@/utils/viewport-fit'

export interface UseViewportSizeResult {
  /** 容器 ref（未传入外部 ref 时由本 hook（组合式函数） 自建） */
  containerRef: Ref<HTMLElement | null>
  /** 视口适配结果（响应式） */
  fit: ComputedRef<SlideViewportFit>
}

/** 量容器 → 计算适配 */
export function useViewportSize(externalRef?: Ref<HTMLElement | null>): UseViewportSizeResult {
  const containerRef = externalRef ?? ref<HTMLElement | null>(null)
  const size = ref({ width: 0, height: 0 })

  let observer: ResizeObserver | null = null

  function measure() {
    if (!containerRef.value) return
    size.value = {
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight,
    }
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      observer = new ResizeObserver(measure)
      observer.observe(containerRef.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  const fit = computed(() => computeSlideViewportFit(size.value.width, size.value.height))

  return { containerRef, fit }
}
