<!--
  文件头：形状元素渲染（SVG path）
  对应原项目：components/slide-renderer/components/element/ShapeElement/BaseShapeElement.tsx
  功能：按 element.path 渲染 SVG 形状，支持填充（含线性渐变）、描边、透明度。
  简化说明：用 svg viewBox + preserveAspectRatio="none" 替代原文的
  transform scale 缩放，效果等价；未实现图案（pattern）填充。
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { PPTShapeElement } from '@/types/dsl'

const props = defineProps<{ element: PPTShapeElement }>()

const viewBox = computed(() => props.element.viewBox ?? [1000, 1000])

const fill = computed(() =>
  props.element.gradient ? `url(#shape-grad-${props.element.id})` : props.element.fill,
)

const dashArray = computed(() => {
  const style = props.element.outline?.style
  if (style === 'dashed') return '6 4'
  if (style === 'dotted') return '1 3'
  return undefined
})
</script>

<template>
  <div class="element-content shape-element">
    <svg
      width="100%"
      height="100%"
      :viewBox="`0 0 ${viewBox[0]} ${viewBox[1]}`"
      preserveAspectRatio="none"
    >
      <defs v-if="element.gradient && element.gradient.type === 'linear'">
        <linearGradient
          :id="`shape-grad-${element.id}`"
          :gradientTransform="`rotate(${element.gradient.rotate} 0.5 0.5)`"
        >
          <stop
            v-for="(c, i) in element.gradient.colors"
            :key="i"
            :offset="`${c.pos}%`"
            :stop-color="c.color"
          />
        </linearGradient>
      </defs>
      <path
        :d="element.path"
        :fill="fill"
        :stroke="element.outline?.color"
        :stroke-width="element.outline?.width"
        :stroke-dasharray="dashArray"
        :opacity="element.opacity"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
</template>

<style scoped>
.shape-element {
  width: 100%;
  height: 100%;
}
.shape-element svg {
  display: block;
}
</style>
