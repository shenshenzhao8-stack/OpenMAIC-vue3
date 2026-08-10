<!--
  文件头：测验渲染器（占位）
  对应原项目：components/scene-renderers/quiz-view.tsx（5 相位状态机）
  功能：Phase 5 将实现「封面→答题→提交→判分→复盘」；
  当前仅展示题目数量，保证分发链路可用。
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { Scene } from '@/types/stage'

const props = defineProps<{ scene: Scene | null }>()

const questionCount = computed(() => {
  if (props.scene?.type !== 'quiz') return 0
  return props.scene.content.questions.length
})
</script>

<template>
  <div class="quiz-placeholder">
    <h2>{{ scene?.title }}</h2>
    <p>测验渲染将在 Phase 5 实现（{{ questionCount }} 道题）。</p>
  </div>
</template>

<style scoped>
.quiz-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #475569;
}
</style>
