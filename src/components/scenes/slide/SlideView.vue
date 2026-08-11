<!--
  文件头：幻灯片渲染器（真实实现）
  对应原项目：packages/@openmaic/renderer/src/SlideCanvas.tsx
  功能：把 Slide 数据渲染成画面——
    1. 背景层（backgroundStyle）；
    2. 画布框（按视口自适应居中，卡片样式）；
    3. 内容层（1000×562.5 逻辑坐标，整体 scale）；
    4. 元素层（ScreenElement 逐个绝对定位渲染）；
    5. 特效层（SpotlightOverlay 聚光 + LaserOverlay 激光）。
  坐标系：元素 left/top/width/height 都是 1000×562.5 逻辑坐标，靠整体 scale 适配任意屏幕。
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Scene } from '@/types/stage'
import { useViewportSize } from '@/composables/useViewportSize'
import { useSlideBackgroundStyle } from '@/composables/useSlideBackgroundStyle'
import ScreenElement from './ScreenElement.vue'
import SpotlightOverlay from './SpotlightOverlay.vue'
import LaserOverlay from './LaserOverlay.vue'

const props = defineProps<{ scene: Scene | null }>()

// 仅 slide 场景有 canvas
const slide = computed(() => (props.scene?.type === 'slide' ? props.scene.content.canvas : null))

// 容器 ref（绑定模板），交给视口自适应 composable 测量
const containerRef = ref<HTMLElement | null>(null)
const { fit } = useViewportSize(containerRef)
const { backgroundStyle } = useSlideBackgroundStyle(computed(() => slide.value?.background))

// 画布框：实际像素尺寸 + 居中
const frameStyle = computed(() => ({
  width: `${fit.value.width}px`,
  height: `${fit.value.height}px`,
  left: `${fit.value.left}px`,
  top: `${fit.value.top}px`,
}))

// 内容层：固定 1000×562.5，整体 scale
const contentStyle = computed(() => ({
  width: `${slide.value?.viewportSize ?? 1000}px`,
  height: `${(slide.value?.viewportSize ?? 1000) * (slide.value?.viewportRatio ?? 0.5625)}px`,
  transform: `scale(${fit.value.scale})`,
  transformOrigin: 'top left',
}))
</script>

<template>
  <div ref="containerRef" class="slide-view">
    <div v-if="slide" class="slide-frame" :style="frameStyle">
      <!-- 背景层 -->
      <div class="slide-background" :style="backgroundStyle" />
      <!-- 内容层：元素 + 特效 -->
      <div class="slide-content" :style="contentStyle">
        <ScreenElement
          v-for="(element, index) in slide.elements"
          :key="element.id"
          :element="element"
          :theme="slide.theme"
          :index="index"
        />
      </div>
      <!-- 聚光遮罩（相对画布框定位，DOM 测量） -->
      <SpotlightOverlay />
      <!-- 激光笔（相对画布框定位，百分比几何） -->
      <LaserOverlay />
    </div>
    <p v-else class="empty">无幻灯片数据</p>
  </div>
</template>

<style scoped>
.slide-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.slide-frame {
  position: absolute;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
}
.slide-background {
  width: 100%;
  height: 100%;
}
.slide-content {
  position: absolute;
  top: 0;
  left: 0;
}
.empty {
  margin: auto;
  color: #94a3b8;
}
</style>
