<!--
  文件头：聚光遮罩（SpotlightOverlay）
  对应原项目：components/slide-renderer/Editor/SpotlightOverlay.tsx
  功能：当 canvas store 有聚光目标时：
    1. 用 DOM 测量目标元素（id 约定 `screen-element-{id}`）在画布框内的百分比矩形；
    2. 用 SVG mask「挖洞」：白底=变暗层，黑色矩形=目标保持明亮；
    3. 目标边缘画白色边框；变暗程度取 spotlightOptions.dimness（默认 0.5）。
  生命周期：ActionEngine 执行聚光时写入 store，并在 5 秒后 clearAllEffects（EFFECT_AUTO_CLEAR_MS），
  本组件 watch store 自动显示/消失。
-->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useCanvasStore } from '#/stores/canvas'

const canvasStore = useCanvasStore()

const containerRef = ref<HTMLElement | null>(null)

/** 目标元素在画布框内的百分比矩形（0-100 坐标系，与 SVG viewBox 对应） */
const rect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

/** 测量目标元素位置（DOM 测量而非坐标换算，避免缩放偏移） */
function measure() {
  const elementId = canvasStore.spotlightElementId
  if (!elementId || !containerRef.value) {
    rect.value = null
    return
  }
  const domElement = document.getElementById(`screen-element-${elementId}`)
  if (!domElement) {
    rect.value = null
    return
  }
  // 优先测量 .element-content（实际渲染区域）
  const targetEl = domElement.querySelector('.element-content') ?? domElement
  const containerRect = containerRef.value.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()
  if (containerRect.width === 0 || containerRect.height === 0) {
    rect.value = null
    return
  }
  rect.value = {
    x: ((targetRect.left - containerRect.left) / containerRect.width) * 100,
    y: ((targetRect.top - containerRect.top) / containerRect.height) * 100,
    w: (targetRect.width / containerRect.width) * 100,
    h: (targetRect.height / containerRect.height) * 100,
  }
}

// 聚光目标变化 → 等 DOM 更新后重新测量
watch(
  () => canvasStore.spotlightElementId,
  async () => {
    await nextTick()
    measure()
  },
)

// 容器尺寸变化（窗口缩放）→ 重新测量
let observer: ResizeObserver | null = null
onMounted(() => {
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(containerRef.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

// 变暗程度
const dimness = computed(() => canvasStore.spotlightOptions?.dimness ?? 0.5)

const activeId = computed(() => canvasStore.spotlightElementId)
</script>

<template>
  <div ref="containerRef" class="spotlight-overlay">
    <svg
      v-if="activeId && rect"
      class="spotlight-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <mask :id="`spotlight-mask-${activeId}`">
          <!-- 白 = 显示遮罩层（变暗） -->
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <!-- 黑 = 挖洞（目标保持明亮） -->
          <rect :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" fill="black" />
        </mask>
      </defs>
      <!-- 变暗层：用 mask 挖出目标区域 -->
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        :fill="`rgba(0,0,0,${dimness})`"
        :mask="`url(#spotlight-mask-${activeId})`"
      />
      <!-- 目标边缘白色边框 -->
      <rect
        :x="rect.x"
        :y="rect.y"
        :width="rect.w"
        :height="rect.h"
        fill="none"
        stroke="#ffffff"
        stroke-width="0.6"
      />
    </svg>
  </div>
</template>

<style scoped>
.spotlight-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.spotlight-svg {
  width: 100%;
  height: 100%;
}
</style>
