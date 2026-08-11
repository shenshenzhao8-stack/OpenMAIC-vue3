# Phase 5 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么」组织。

## 1. `src/components/scenes/quiz/QuizView.vue` —— 测验状态机

**作用**：测验页主组件，管理 3 相位（封面/答题/复盘）与答案。

| 部分 | 做什么 | 为什么 |
|---|---|---|
| `phase`（ref） | not_started → answering → reviewing | 无判分相位（裁剪） |
| `answers`（ref） | 记录每题答案（字符串/数组） | 提交与复盘依据 |
| localStorage 草稿 | 按场景 id 存/读草稿 | 刷新不丢作答（简化方案） |
| `allAnswered` | 是否全部作答 | 提交按钮启用条件 |
| `handleSubmit` | 直接进入复盘 | 无判分，不需要 grading 步骤 |
| `handleRetry` | 清空答案回封面 | 「重新挑战」 |
| `resultOf(q)` | 选择题对错结果（复盘展示） | 仅对错，无得分 |

## 2. 三个题型组件

| 组件 | 做什么 |
|---|---|
| `SingleChoiceQuestion.vue` | 单选 radio；复盘显示 ✓/✗ 徽标 |
| `MultipleChoiceQuestion.vue` | 多选 checkbox（toggle 维护数组）；复盘显示 ✓/✗ |
| `ShortAnswerQuestion.vue` | 文本框；复盘显示「参考答案」（answer 数组拼接） |

## 3. `src/utils/quiz-check.ts` —— 对错判断纯函数

| 方法 | 做什么 |
|---|---|
| `isQuestionAnswered(_q, userAnswer)` | 是否已作答（提交按钮用） |
| `isChoiceCorrect(q, userAnswer)` | 选择题排序比较对错；简答题返回 false（只展示参考答案） |

**为什么裁剪**：原项目 grading.ts 计算得分/评语（含 AI 判分），本项目按需求裁剪，只保留对错判断。

## 4. `src/types/dsl/stage.ts`（QuizQuestion）

删除 points / analysis / commentPrompt / hasAnswer，保留 id/type/question/options/answer。
`answer` 双重含义：选择题为正确答案、简答题为参考答案（复盘展示）。

## 5. 删除记录

grading.ts、quiz-grade mock、client.gradeQuiz——详见 PHASE-5.md 删除记录表。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-11 | 初版：依据 Phase 5 完成后的讲解整理输出 |
