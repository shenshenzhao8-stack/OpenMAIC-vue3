<!--
  文件头：场景分发器（SceneRenderer）
  对应原项目：components/stage/scene-renderer.tsx
  功能：按当前场景的 type 分发到对应渲染组件（slide/quiz/interactive）。
-->
<script setup lang="ts">
import { useScene } from '@/hooks/useScene'
import SlideView from '@/components/scenes/slide/SlideView.vue'
import QuizView from '@/components/scenes/quiz/QuizView.vue'
import InteractiveRenderer from '@/components/scenes/interactive/InteractiveRenderer.vue'

const { scene } = useScene()
</script>

<template>
  <div class="scene-renderer">
    <SlideView v-if="scene?.type === 'slide'" :scene="scene" />
    <QuizView v-else-if="scene?.type === 'quiz'" :scene="scene" />
    <InteractiveRenderer v-else-if="scene?.type === 'interactive'" :scene="scene" />
    <p v-else class="empty">未选择场景</p>
  </div>
</template>

<style scoped>
.scene-renderer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.empty {
  margin: auto;
  color: #94a3b8;
}
</style>
