/**
 * 文件头：选择题本地判分
 *
 * 对应原项目：lib/quiz/grading.ts（照搬，注释已翻译为中文）
 *
 * 功能：把用户答案与标准答案排序后逐题比对，返回每题的判分结果。
 * 简答题（type === 'short_answer'）不走本地判分，由 AI 判分（Phase 5 接入后台）。
 */
import type { QuizQuestion } from '@/types/stage'

/** 单题判分结果 */
export interface QuestionResult {
  questionId: string
  /** 是否正确；null 表示无法自动判定（如 AI 判分失败） */
  correct: boolean | null
  status: 'correct' | 'incorrect'
  /** 得分（正确得满分，否则 0） */
  earned: number
  /** AI 判分评语（简答题使用） */
  aiComment?: string
}

/** 数组相等比较：排序后逐项比对（多选答案顺序无关） */
export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

/** 把单值/数组归一化为数组 */
export function toArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

/**
 * 是否按开放式文本（AI）判分：只看显式题型 type。
 * 未作答的选择题（answer 为空）仍是选择题，不得改路由到 AI 判分；
 * hasAnswer 不覆盖 type 判断。
 */
export function isShortAnswer(q: QuizQuestion): boolean {
  return q.type === 'short_answer'
}

/**
 * 本地判分选择题（不含简答题），返回每题结果。
 */
export function gradeChoiceQuestions(
  questions: QuizQuestion[],
  answers: Record<string, string | string[]>,
): QuestionResult[] {
  return questions
    .filter((q) => !isShortAnswer(q))
    .map((q) => {
      const pts = q.points ?? 1
      const userAnswer = toArray(answers[q.id])
      const correctAnswer = toArray(q.answer)
      const correct = arraysEqual(userAnswer, correctAnswer)
      return {
        questionId: q.id,
        correct,
        status: correct ? ('correct' as const) : ('incorrect' as const),
        earned: correct ? pts : 0,
      }
    })
}
