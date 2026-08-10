<!--
  文件头：公式元素渲染（KaTeX）
  对应原项目：components/slide-renderer/components/element/LatexElement/BaseLatexElement.tsx
  功能：把 LaTeX 源码用 KaTeX 渲染成 HTML，并按元素框缩放适配（与原文一致：
  测量自然尺寸 → scale = min(宽/自然宽, 高/自然高)）。
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { PPTLatexElement } from '@/types/dsl'

const props = defineProps<{ element: PPTLatexElement }>()

// 优先使用预渲染 html；否则用 KaTeX 现场渲染 latex 源码
const html = computed(() => {
  if (props.element.html) return props.element.html
  if (props.element.latex) {
    return katex.renderToString(props.element.latex, {
      throwOnError: false,
      displayMode: false,
    })
  }
  return ''
})

const innerRef = ref<HTMLElement | null>(null)
const scale = ref(1)

// 测量自然尺寸并缩放适配元素框
function fit() {
  if (!innerRef.value) return
  const naturalW = innerRef.value.scrollWidth
  const naturalH = innerRef.value.scrollHeight
  if (naturalW > 0 && naturalH > 0) {
    scale.value = Math.min(props.element.width / naturalW, props.element.height / naturalH)
  }
}

onMounted(async () => {
  await nextTick()
  fit()
})
watch(html, async () => {
  await nextTick()
  fit()
})

// 水平对齐（left/center/right）
const justify = computed(() =>
  props.element.align === 'left'
    ? 'flex-start'
    : props.element.align === 'right'
      ? 'flex-end'
      : 'center',
)
</script>

<template>
  <div
    class="element-content latex-element"
    :style="{ justifyContent: justify, color: element.color }"
  >
    <div
      ref="innerRef"
      class="latex-inner"
      :style="{ transform: `scale(${scale})` }"
      v-html="html"
    />
  </div>
</template>

<style scoped>
.latex-element {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.latex-inner {
  transform-origin: center center;
  white-space: nowrap;
}
</style>
