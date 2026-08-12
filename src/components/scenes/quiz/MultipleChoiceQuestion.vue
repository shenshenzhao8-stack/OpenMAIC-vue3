<!--
  文件头：多选题组件
  功能：多选（checkbox 样式）；复盘时展示对错徽标，选项禁用。
-->
<script setup lang="ts">
import type { QuizQuestion } from '#/types/stage'

const props = defineProps<{
  question: QuizQuestion
  index: number
  value?: string[]
  disabled?: boolean
  result?: { correct: boolean } | null
}>()

const emit = defineEmits<{ (e: 'change', value: string[]): void }>()

/** 切换选项选中状态 */
function toggle(optValue: string) {
  const current = new Set(props.value ?? [])
  if (current.has(optValue)) current.delete(optValue)
  else current.add(optValue)
  emit('change', [...current])
}
</script>

<template>
  <div class="quiz-card">
    <header>
      <span class="q-index">{{ index + 1 }}</span>
      <span class="q-text">{{ question.question }}（多选）</span>
      <span v-if="result" class="badge" :class="result.correct ? 'ok' : 'no'">
        {{ result.correct ? '✓' : '✗' }}
      </span>
    </header>
    <ul>
      <li
        v-for="opt in question.options ?? []"
        :key="opt.value"
        :class="{ selected: (value ?? []).includes(opt.value) }"
      >
        <label>
          <input
            type="checkbox"
            :checked="(value ?? []).includes(opt.value)"
            :disabled="disabled"
            @change="toggle(opt.value)"
          />
          {{ opt.label }}
        </label>
      </li>
    </ul>
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
.badge.ok {
  color: #16a34a;
  font-weight: 700;
}
.badge.no {
  color: #dc2626;
  font-weight: 700;
}
ul {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}
li {
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
}
li.selected {
  background: #eff6ff;
}
</style>
