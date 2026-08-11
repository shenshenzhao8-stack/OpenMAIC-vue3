/**
 * 文件头：测验对错判断纯函数测试
 *
 * 对应原项目：无（本项目裁剪判分后新增）
 *
 * 功能：验证单选题/多选题对错判断与"是否已作答"判断。
 */
import { describe, it, expect } from 'vitest'
import { isChoiceCorrect, isQuestionAnswered } from '@/utils/quiz-check'
import type { QuizQuestion } from '@/types/stage'

const single: QuizQuestion = {
  id: 'q1',
  type: 'single',
  question: '光合作用的场所是？',
  options: [
    { label: '线粒体', value: 'A' },
    { label: '叶绿体', value: 'B' },
  ],
  answer: ['B'],
}

const multiple: QuizQuestion = {
  id: 'q2',
  type: 'multiple',
  question: '光反应的产物？',
  options: [
    { label: 'ATP', value: 'A' },
    { label: 'NADPH', value: 'B' },
    { label: '葡萄糖', value: 'C' },
  ],
  answer: ['A', 'B'],
}

const shortAnswer: QuizQuestion = {
  id: 'q3',
  type: 'short_answer',
  question: '暗反应的场所？',
  answer: ['叶绿体基质'],
}

describe('isChoiceCorrect', () => {
  it('单选答对/答错', () => {
    expect(isChoiceCorrect(single, 'B')).toBe(true)
    expect(isChoiceCorrect(single, 'A')).toBe(false)
  })

  it('多选与顺序无关', () => {
    expect(isChoiceCorrect(multiple, ['B', 'A'])).toBe(true)
    expect(isChoiceCorrect(multiple, ['A'])).toBe(false)
  })

  it('简答题不做对错判断', () => {
    expect(isChoiceCorrect(shortAnswer, '叶绿体基质')).toBe(false)
  })
})

describe('isQuestionAnswered', () => {
  it('字符串/数组/空值', () => {
    expect(isQuestionAnswered(single, 'B')).toBe(true)
    expect(isQuestionAnswered(multiple, [])).toBe(false)
    expect(isQuestionAnswered(shortAnswer, undefined)).toBe(false)
    expect(isQuestionAnswered(shortAnswer, '   ')).toBe(false)
  })
})
