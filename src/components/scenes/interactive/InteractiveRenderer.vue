<!--
  文件头：交互场景占位组件（InteractiveRenderer）
  对应原项目：components/scene-renderers/interactive-renderer.tsx
  功能：本组件**不渲染 iframe**，只做三件事——
    1. mount：把打补丁后的 HTML 登记进保活池；
    2. claim：声明自己是当前可见的占位（可见权归属）；
    3. rAF 循环量自身矩形并上报 setRect（Host 按此位置覆盖 iframe）。
  真正的 iframe 由 ClassroomPage 挂载的 InteractiveIframeHost 统一渲染。
-->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Scene } from '#/types/stage'
import { useInteractiveIframePool } from '#/stores/interactive-iframe-pool'
import { patchHtmlForIframe } from '#/utils/iframe'

const props = defineProps<{ scene: Scene | null }>()
const pool = useInteractiveIframePool()

const container = ref<HTMLElement | null>(null)

/** 本占位实例的唯一 id（可见权归属；防止旧实例误释放新实例） */
let owner = ''
/** rAF 句柄 */
let raf = 0

/** 量自身矩形并上报；下一帧继续（跟随缩放/滚动/布局变化） */
function measure() {
  const node = container.value
  if (node) {
    const r = node.getBoundingClientRect()
    pool.setRect(props.scene?.id ?? '', { left: r.left, top: r.top, width: r.width, height: r.height })
  }
  raf = requestAnimationFrame(measure)
}

onMounted(() => {
  if (props.scene?.type !== 'interactive') return
  owner = `owner-${Math.random().toString(36).slice(2)}`
  // 安全补丁后再登记；有 html 用 srcdoc，否则用 url
  const html = props.scene.content.html ? patchHtmlForIframe(props.scene.content.html) : undefined
  pool.mount(props.scene.id, { srcDoc: html, src: html ? undefined : props.scene.content.url })
  pool.setActive(props.scene.id)
  pool.claim(props.scene.id, owner)
  raf = requestAnimationFrame(measure)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (props.scene?.id) pool.release(props.scene.id, owner)
})
</script>

<template>
  <div ref="container" class="interactive-renderer" />
</template>

<style scoped>
.interactive-renderer {
  width: 100%;
  height: 100%;
}
</style>
