<!--
  文件头：测验渲染器（真实实现）
  对应原项目：components/scene-renderers/quiz-view.tsx（5 相位状态机）
  范围调整（2026-08-11）：本项目不做判分——无得分、无 AI 判分、无解析讲解。
  流程：not_started（封面）→ answering（答题）→ reviewing（复盘）。
  复盘规则：选择题仅显示对错（✓/✗）；简答题显示参考答案。
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Scene, QuizQuestion } from '@/types/stage'
import SingleChoiceQuestion from './SingleChoiceQuestion.vue'
import MultipleChoiceQuestion from './MultipleChoiceQuestion.vue'
import ShortAnswerQuestion from './ShortAnswerQuestion.vue'
import { isChoiceCorrect, isQuestionAnswered } from '@/utils/quiz-check'

const props = defineProps<{ scene: Scene | null }>()

const questions = computed<QuizQuestion[]>(() =>
  props.scene?.type === 'quiz' ? props.scene.content.questions : [],
)

/** 页面相位：封面 → 答题 → 复盘（无判分相位） */
const phase = ref<'not_started' | 'answering' | 'reviewing'>('not_started')
const answers = ref<Record<string, string | string[]>>({})

// 本地草稿（localStorage，按场景 id 存；Phase 5 简化方案）
const DRAFT_KEY = 'openmaic-quiz-draft:'
const draftKey = computed(() => (props.scene?.id ? `${DRAFT_KEY}${props.scene.id}` : ''))
watch(draftKey, () => {
  if (!draftKey.value) return
  try {
    const raw = localStorage.getItem(draftKey.value)
    if (raw) answers.value = JSON.parse(raw)
  } catch {
    /* 草稿损坏忽略 */
  }
}, { immediate: true })
watch(answers, () => {
  if (!draftKey.value) return
  localStorage.setItem(draftKey.value, JSON.stringify(answers.value))
}, { deep: true })

/** 是否全部作答（提交按钮启用条件） */
const allAnswered = computed(() =>
  questions.value.every((q) => isQuestionAnswered(q, answers.value[q.id])),
)

/** 提交：直接进入复盘（无判分） */
function handleSubmit() {
  if (!allAnswered.value) return
  phase.value = 'reviewing'
}

/** 重新挑战：清空答案回到封面 */
function handleRetry() {
  answers.value = {}
  localStorage.removeItem(draftKey.value)
  phase.value = 'not_started'
}

/** 选择题对错（复盘展示用） */
function resultOf(q: QuizQuestion): { correct: boolean } | null {
  if (phase.value !== 'reviewing') return null
  return { correct: isChoiceCorrect(q, answers.value[q.id]) }
}

const answeredCount = computed(
  () => questions.value.filter((q) => isQuestionAnswered(q, answers.value[q.id])).length,
)
</script>

<template>
  <div class="quiz-view">
    <!-- 封面 -->
    <section v-if="phase === 'not_started'" class="quiz-cover">
      <h2>{{ scene?.title }}</h2>
      <p>共 {{ questions.length }} 道题。完成后可查看对错与参考答案。</p>
      <button type="button" class="primary" @click="phase = 'answering'">开始答题</button>
    </section>

    <!-- 答题 -->
    <section v-else-if="phase === 'answering'" class="quiz-answering">
      <header class="quiz-bar">
        <span>已答 {{ answeredCount }} / {{ questions.length }}</span>
        <button type="button" class="primary" :disabled="!allAnswered" @click="handleSubmit">
          提交
        </button>
      </header>
      <div class="question-list">
        <SingleChoiceQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'single')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string | undefined"
          @change="(v: string) => (answers[q.id] = v)"
        />
        <MultipleChoiceQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'multiple')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string[] | undefined"
          @change="(v: string[]) => (answers[q.id] = v)"
        />
        <ShortAnswerQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'short_answer')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string | undefined"
          @change="(v: string) => (answers[q.id] = v)"
        />
      </div>
    </section>

    <!-- 复盘：选择题对错 + 简答题参考答案 -->
    <section v-else class="quiz-review">
      <header class="quiz-bar">
        <span>复盘</span>
        <button type="button" @click="handleRetry">重新挑战</button>
      </header>
      <div class="question-list">
        <SingleChoiceQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'single')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string | undefined"
          :result="resultOf(q)"
          disabled
        />
        <MultipleChoiceQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'multiple')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string[] | undefined"
          :result="resultOf(q)"
          disabled
        />
        <ShortAnswerQuestion
          v-for="(q, i) in questions.filter((q) => q.type === 'short_answer')"
          :key="q.id"
          :question="q"
          :index="i"
          :value="answers[q.id] as string | undefined"
          disabled
          :show-reference="phase === 'reviewing'"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.quiz-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}
.quiz-cover {
  margin: auto;
  text-align: center;
  padding: 2rem;
}
.quiz-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  font-size: 0.85rem;
  color: #475569;
}
.question-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
button.primary {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}
button.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}
</style>
