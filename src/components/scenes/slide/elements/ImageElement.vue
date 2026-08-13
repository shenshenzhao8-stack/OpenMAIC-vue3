<!--
  文件头：图片元素渲染
  对应原项目：components/slide-renderer/components/element/ImageElement/BaseImageElement.tsx
  功能：渲染图片（data URL / 后台 URL），支持圆角、翻转、滤镜、裁切容器。
  裁剪说明：原项目还含媒体生成占位/重试逻辑，本项目 mock 阶段直接显示 src。
-->

<template>
  <div class="element-content image-element" :style="boxStyle">
    <img :src="element.src" :style="imgStyle" alt="" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

import type { PPTImageElement } from '#/types/dsl';
import { resolveElementFilters } from '#/utils/slide-style';

const props = defineProps<{ element: PPTImageElement }>();

const imgStyle = computed(() => ({
  filter: resolveElementFilters(props.element.filters),
  transform: `${props.element.flipH ? 'scaleX(-1)' : ''} ${props.element.flipV ? 'scaleY(-1)' : ''}`.trim(),
}));

const boxStyle = computed(() => ({
  borderRadius: props.element.radius ? `${props.element.radius}px` : undefined,
}));
</script>
<style scoped>
.image-element {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.image-element img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
