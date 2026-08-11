<!--
  文件头：简答题组件
  功能：文本框作答；复盘时展示「参考答案」（不做 AI 判分、不给评语）。
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { QuizQuestion } from '@/types/stage'

const props = defineProps<{
  question: QuizQuestion
  index: number
  value?: string
  disabled?: boolean
  showReference?: boolean
}>()

const emit = defineEmits<{ (e: 'change', value: string): void }>()

/** 参考答案（answer 数组拼接；无则显示占位） */
const reference = computed(() => {
  const list = props.question.answer ?? []
  return list.length > 0 ? list.join('；') : '（无参考答案）'
})
</script>

<template>
  <div class="quiz-card">
    <header>
      <span class="q-index">{{ index + 1 }}</span>
      <span class="q-text">{{ question.question }}</span>
    </header>
    <textarea
      class="answer-input"
      :value="value ?? ''"
      :disabled="disabled"
      :placeholder="disabled ? '' : '请输入你的答案'"
      @input="emit('change', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="showReference" class="reference">
      参考答案：{{ reference }}
    </p>
  </div>
</template>

<style scoped>
.quiz-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.q-index {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #e2e8f0;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.q-text {
  font-size: 0.9rem;
  color: #1e293b;
  flex: 1;
}
.answer-input {
  width: 100%;
  min-height: 64px;
  margin-top: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  resize: vertical;
  box-sizing: border-box;
}
.reference {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: #1e40af;
}
</style>
