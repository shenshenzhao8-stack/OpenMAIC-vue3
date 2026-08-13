<!--
  文件头：单选题组件
  功能：单选（radio 样式）；复盘时展示对错徽标（✓/✗），选项禁用。
-->

<template>
  <div class="quiz-card">
    <header>
      <span class="q-index">{{ index + 1 }}</span>
      <span class="q-text">{{ question.question }}</span>
      <span v-if="result" class="badge" :class="result.correct ? 'ok' : 'no'">
        {{ result.correct ? '✓' : '✗' }}
      </span>
    </header>
    <ul>
      <li v-for="opt in question.options ?? []" :key="opt.value" :class="{ selected: value === opt.value }">
        <label>
          <input
            type="radio"
            :name="`q-${question.id}`"
            :value="opt.value"
            :checked="value === opt.value"
            :disabled="disabled"
            @change="emit('change', opt.value)"
          />
          {{ opt.label }}
        </label>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import type { QuizQuestion } from '#/types/stage';

defineProps<{
  question: QuizQuestion;
  index: number;
  value?: string;
  disabled?: boolean;
  result?: { correct: boolean } | null;
}>();

const emit = defineEmits<{ (e: 'change', value: string): void }>();
</script>
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
