/**
 * 文件头：mock 简答题 AI 判分
 *
 * 对应原项目：app/api/quiz-grade/route.ts
 *
 * 功能：模拟 AI 判分接口——按作答长度给分并返回评语。
 * 真实后台接入后替换实现（Phase 5 接入），入参/出参形状保持一致：
 * 入参 { question, userAnswer, points, commentPrompt?, language? }
 * 出参 { score, comment }
 */
export interface MockGradeQuizInput {
  question: string
  userAnswer: string
  points: number
  commentPrompt?: string
  language?: string
}

export interface MockGradeQuizResult {
  score: number
  comment: string
}

/** mock 判分规则：非空作答给 90% 分并附评语；空作答 0 分 */
export function mockGradeQuiz(input: MockGradeQuizInput): MockGradeQuizResult {
  const text = (input.userAnswer ?? '').trim()
  if (text.length === 0) {
    return { score: 0, comment: '本题未作答，请再想想。' }
  }
  return {
    score: Math.round(input.points * 0.9),
    comment: `回答基本正确（长度 ${text.length} 字）。${input.commentPrompt ?? ''}（mock 判分，真实判分由后台提供）`,
  }
}
