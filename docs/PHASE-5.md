# Phase 5 完成说明：Quiz 场景（无判分版）

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（2026-08-11 更新）

- 页面：首页（课堂入口）+ 课堂播放页 /classroom/:id；
- 场景：slide / quiz / interactive；
- 教学动作：speech + spotlight + laser；
- slide 元素：仅 text / shape / line / image；
- **测验（quiz）：无判分业务**——无得分 / 无 AI 判分 / 无解析讲解；复盘仅「选择题显示对错、简答题显示参考答案」；
- 互动：登录用户 ↔ 老师多轮一问一答（Phase 8）；
- 课堂数据 mock；播放引擎调度逻辑与原项目一致。

## 一、阶段目标

1. Quiz 全流程：封面 → 答题 → 提交 → 复盘（无判分相位）；
2. 三种题型组件（单选 / 多选 / 简答）；
3. 复盘：选择题对错徽标（本地比较）、简答题参考答案；
4. 裁剪判分业务（grading.ts / client.gradeQuiz / quiz-grade mock / 判分字段）；
5. 全量文档与范围同步。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/components/scenes/quiz/QuizView.vue` | `components/scene-renderers/quiz-view.tsx` | 5 相位状态机（含判分） | **改写（简化）**：去掉 submitting→grading 判分链路，保留 not_started→answering→reviewing；复盘不显示得分/解析 |
| `SingleChoiceQuestion.vue` / `MultipleChoiceQuestion.vue` / `ShortAnswerQuestion.vue` | 原项目题型内联在 quiz-view.tsx | 题型渲染 | **改写（拆组件）**：单选/多选/简答独立组件，复盘态禁用并显示结果 |
| `src/utils/quiz-check.ts` | `lib/quiz/grading.ts` | 判分 | **改写（裁剪）**：仅保留「对错判断」（isChoiceCorrect）与「是否已作答」（isQuestionAnswered），删除得分/评语 |
| `src/types/dsl/stage.ts`（QuizQuestion） | `@openmaic/dsl` QuizQuestion | 题目类型 | **改写（裁剪字段）**：删除 points / analysis / commentPrompt / hasAnswer |

### 删除记录（含原因与恢复路径）

| 删除项 | 类型 | 原因 | 恢复路径 |
|---|---|---|---|
| `src/core/quiz/grading.ts` | 判分纯函数 | 无判分业务 | 需要判分时按原 lib/quiz/grading.ts 补回 |
| `src/api/mock/quiz-grade.ts` + `client.gradeQuiz` | AI 判分 | 无 AI 判分 | 需要时按原 /api/quiz-grade 补接口 |
| `QuizQuestion.points / analysis / commentPrompt / hasAnswer` | 类型字段 | 判分/讲解相关 | 需要时按原 dsl 补回 |
| mock 中的 points/analysis/commentPrompt | 数据 | 同上 | 同上 |

## 三、验证结果

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：11 个测试文件 / 44 个用例全部通过（新增 quiz-check 4 用例）；
- `npm run build`：通过（117 modules）。

## 四、范围变更记录（2026-08-11）

| 变更 | 影响 | 关联原项目 |
|---|---|---|
| 测验无判分业务 | 删除判分/ AI 判分/解析讲解；复盘仅对错+参考答案；QuizView 简化相位 | lib/quiz/grading.ts、quiz-view.tsx、/api/quiz-grade |

## 五、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。
