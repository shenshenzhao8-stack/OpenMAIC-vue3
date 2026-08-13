<!--
  文件头：线条元素渲染（SVG）
  对应原项目：components/slide-renderer/components/element/LineElement/BaseLineElement.tsx
              + LinePointMarker.tsx
  功能：按 start/end 渲染线条（直线/折线/曲线），支持颜色/线宽/虚线/点线/端点箭头。
  注意：line 元素的 width 字段语义是「线宽」而非元素宽度（易踩坑点，已按原文处理）；
  起点坐标是画布绝对坐标，svg 尺寸 = 起终点坐标差（最小 24）。
  简化说明：未实现原文的「笔画绘制动画」（白板专用），本项目无白板。
-->

<template>
  <div
    class="element-content line-element"
    :style="{ filter: shadowStyle ? `drop-shadow(${shadowStyle})` : undefined }"
  >
    <svg :width="svgWidth" :height="svgHeight" overflow="visible">
      <defs>
        <!-- 起点箭头（指向反向） -->
        <marker
          v-if="hasStart && element.points[0] === 'arrow'"
          :id="`${element.id}-arrow-start`"
          markerUnits="userSpaceOnUse"
          orient="auto"
          :marker-width="markerSize * 3"
          :marker-height="markerSize * 3"
          :ref-x="markerSize * 1.5"
          :ref-y="markerSize * 1.5"
        >
          <path
            d="M0,0 L10,5 0,10 Z"
            :fill="element.color"
            :transform="`scale(${markerSize * 0.3}, ${markerSize * 0.3}) rotate(180, 5, 5)`"
          />
        </marker>
        <!-- 起点圆点 -->
        <marker
          v-if="hasStart && element.points[0] === 'dot'"
          :id="`${element.id}-dot-start`"
          markerUnits="userSpaceOnUse"
          orient="auto"
          :marker-width="markerSize * 3"
          :marker-height="markerSize * 3"
          :ref-x="markerSize * 1.5"
          :ref-y="markerSize * 1.5"
        >
          <path
            d="m0 5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z"
            :fill="element.color"
            :transform="`scale(${markerSize * 0.3}, ${markerSize * 0.3})`"
          />
        </marker>
        <!-- 终点箭头 -->
        <marker
          v-if="hasEnd && element.points[1] === 'arrow'"
          :id="`${element.id}-arrow-end`"
          markerUnits="userSpaceOnUse"
          orient="auto"
          :marker-width="markerSize * 3"
          :marker-height="markerSize * 3"
          :ref-x="markerSize * 1.5"
          :ref-y="markerSize * 1.5"
        >
          <path
            d="M0,0 L10,5 0,10 Z"
            :fill="element.color"
            :transform="`scale(${markerSize * 0.3}, ${markerSize * 0.3})`"
          />
        </marker>
        <!-- 终点圆点 -->
        <marker
          v-if="hasEnd && element.points[1] === 'dot'"
          :id="`${element.id}-dot-end`"
          markerUnits="userSpaceOnUse"
          orient="auto"
          :marker-width="markerSize * 3"
          :marker-height="markerSize * 3"
          :ref-x="markerSize * 1.5"
          :ref-y="markerSize * 1.5"
        >
          <path
            d="m0 5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z"
            :fill="element.color"
            :transform="`scale(${markerSize * 0.3}, ${markerSize * 0.3})`"
          />
        </marker>
      </defs>
      <path
        :d="path"
        :stroke="element.color"
        :stroke-width="element.width"
        :stroke-dasharray="dashArray"
        fill="none"
        :marker-start="startMarkerId"
        :marker-end="endMarkerId"
      />
    </svg>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

import type { PPTLineElement } from '#/types/dsl';
import { getLineElementPath } from '#/utils/line-path';
import { resolveElementShadow } from '#/utils/slide-style';

const props = defineProps<{ element: PPTLineElement }>();

// svg 尺寸 = 起终点坐标差（最小 24，与原项目一致）
const svgWidth = computed(() => Math.max(24, Math.abs(props.element.start[0] - props.element.end[0])));
const svgHeight = computed(() => Math.max(24, Math.abs(props.element.start[1] - props.element.end[1])));

const path = computed(() => getLineElementPath(props.element));

// 虚线/点线 dasharray（规则与原项目一致）
const dashArray = computed(() => {
  const size = props.element.width;
  if (props.element.style === 'dashed') return size <= 8 ? `${size * 5} ${size * 2.5}` : `${size * 5} ${size * 1.5}`;
  if (props.element.style === 'dotted')
    return size <= 8 ? `${size * 1.8} ${size * 1.6}` : `${size * 1.5} ${size * 1.2}`;
  return '0 0';
});

const markerSize = computed(() => Math.max(2, props.element.width));
const hasStart = computed(() => props.element.points[0] !== '');
const hasEnd = computed(() => props.element.points[1] !== '');

// 端点 marker id：与原文 `${id}-${type}-${position}` 一致
const startMarkerId = computed(() =>
  hasStart.value ? `url(#${props.element.id}-${props.element.points[0]}-start)` : '',
);
const endMarkerId = computed(() => (hasEnd.value ? `url(#${props.element.id}-${props.element.points[1]}-end)` : ''));

const shadowStyle = computed(() => resolveElementShadow(props.element.shadow));
</script>
<style scoped>
.line-element {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
