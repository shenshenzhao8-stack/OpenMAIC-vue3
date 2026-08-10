<!--
  文件头：文本元素渲染
  对应原项目：components/slide-renderer/components/element/TextElement/BaseTextElement.tsx
  功能：把 HTML 文本内容（v-html）按 defaultColor/fontName/行高等样式渲染。
  注意：content 是 AI 生成的 HTML（可含内联样式），直接注入即可实现富文本。
-->
<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { PPTTextElement } from '@/types/dsl'
import { resolveElementShadow } from '@/utils/slide-style'

const props = defineProps<{ element: PPTTextElement }>()

const style = computed<CSSProperties>(() => ({
  color: props.element.defaultColor,
  fontFamily: props.element.defaultFontName,
  lineHeight: props.element.lineHeight,
  letterSpacing: `${props.element.wordSpace ?? 0}px`,
  textShadow: resolveElementShadow(props.element.shadow),
  backgroundColor: props.element.fill,
  opacity: props.element.opacity,
  writingMode: (props.element.vertical ? 'vertical-rl' : 'horizontal-tb') as CSSProperties['writingMode'],
}))
</script>

<template>
  <div class="element-content text-element" :style="style" v-html="element.content" />
</template>

<style scoped>
.text-element {
  width: 100%;
  height: 100%;
  padding: 10px;
  overflow: hidden;
  word-break: break-word;
}
</style>
