<!--
  文件头：幻灯片元素分发器
  对应原项目：components/slide-renderer/Editor/ScreenElement.tsx
  功能（2026-08-11 范围收敛为四类元素：text / shape / line / image）：
    1. 按 element.type 分发到对应元素组件；
    2. 绝对定位（left/top/width/height + rotate + zIndex）；
    3. ★ 根节点 id 固定为 `screen-element-{element.id}`——聚光遮罩靠它 DOM 定位。
-->

<template>
  <div :id="`screen-element-${element.id}`" class="screen-element" :style="positionStyle">
    <text-element v-if="textElement" :element="textElement" />
    <shape-element v-else-if="shapeElement" :element="shapeElement" />
    <line-element v-else-if="lineElement" :element="lineElement" />
    <image-element v-else-if="imageElement" :element="imageElement" />
  </div>
</template>
<script setup lang="ts">
/* eslint-disable ts/no-unused-vars -- 模板以 kebab-case 引用本文件导入的组件，
   vue-tsc 可解析，但 eslint 不识别该关联，属误报（HTML 注释 disable 只作用于模板区） */
import { computed } from 'vue';

import type { PPTElement, SlideTheme } from '#/types/dsl';

import ImageElement from './elements/ImageElement.vue';
import LineElement from './elements/LineElement.vue';
import ShapeElement from './elements/ShapeElement.vue';
import TextElement from './elements/TextElement.vue';

const props = defineProps<{ element: PPTElement; theme?: SlideTheme; index?: number }>();

// 旋转角度：line 元素没有 rotate 字段（PPTBaseElement 中 Omit 掉了）
const rotate = computed(() => ('rotate' in props.element ? (props.element.rotate ?? 0) : 0));
// 高度：line 元素没有 height 字段，安全访问
const height = computed(() => ('height' in props.element ? props.element.height : undefined));

// 绝对定位 + 旋转 + 层级
const positionStyle = computed(() => ({
  left: `${props.element.left}px`,
  top: `${props.element.top}px`,
  width: `${props.element.width}px`,
  height: height.value !== undefined ? `${height.value}px` : undefined,
  zIndex: (props.index ?? 0) + 1,
  transform: `rotate(${rotate.value}deg)`,
  color: props.theme?.fontColor,
  fontFamily: props.theme?.fontName,
}));

// 按类型收窄（模板类型收窄不可靠，这里用 computed 保证类型安全）
const textElement = computed(() => (props.element.type === 'text' ? props.element : null));
const shapeElement = computed(() => (props.element.type === 'shape' ? props.element : null));
const lineElement = computed(() => (props.element.type === 'line' ? props.element : null));
const imageElement = computed(() => (props.element.type === 'image' ? props.element : null));
</script>
<style scoped>
.screen-element {
  position: absolute;
}
</style>
