/**
 * 文件头：测验「对错判断」纯函数
 *
 * 对应原项目：lib/quiz/grading.ts（本项目已裁剪判分业务，仅保留对错判断）
 *
 * 范围说明（2026-08-11）：本项目不做判分（无得分/无 AI 判分）。
 * 复盘页仅需要：选择题显示对错、简答题显示参考答案。
 * 因此只保留「用户答案是否等于正确答案」的比较，不计算得分、不产生评语。
 */
import type { QuizQuestion } from '#/types/stage';

/** 把单值/数组归一化为数组（多选答案顺序无关比较用） */
function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** 该题是否已作答（提交按钮的启用判断） */
export function isQuestionAnswered(_q: QuizQuestion, userAnswer: string | string[] | undefined): boolean {
  if (!userAnswer) return false;
  if (Array.isArray(userAnswer)) return userAnswer.length > 0;
  return userAnswer.trim().length > 0;
}

/**
 * 选择题对错判断（单选/多选）：排序后比较用户答案与正确答案。
 * 简答题不做对错判断（复盘只展示参考答案），返回 false。
 */
export function isChoiceCorrect(q: QuizQuestion, userAnswer: string | string[] | undefined): boolean {
  if (q.type === 'short_answer') return false;
  const user = toArray(userAnswer).sort();
  const correct = toArray(q.answer).sort();
  return user.length > 0 && user.length === correct.length && user.every((v, i) => v === correct[i]);
}
