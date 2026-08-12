# 阶段文档（docs/）约定

依据当前 OpenMAIC 项目根目录 `AGENTS.md`（规则二、规则三）执行。

## 每个阶段的交付文档（两部分）

1. **阶段完成说明** `docs/PHASE-{x}.md`：见下节「必须包含的章节」。
2. **工作参考手册** `docs/REFERENCE-PHASE-{x}.md`：逐文件说明文件作用与功能，并对所有主要方法/函数逐个讲解（做什么、为什么这样做），供用户阅读审阅（依据 AGENTS.md 规则二第 6 条）。

## 每个 PHASE-x.md 必须包含的章节

1. **当前有效范围**：开头列出最新的裁剪范围（页面、场景、动作、mock 范围）。
2. **阶段目标**：本阶段要交付什么。
3. **文件对照表（一一对应）**：每个文件 → 原项目文件 → 原功能 → 实现方式（照搬/改写/重构）与原因。
4. **裁剪记录**：本阶段删掉了什么、为什么、恢复路径。
5. **验证结果**：类型检查、单测、构建结果。
6. **范围变更记录**：本阶段及之前发生的所有范围变更，附日期与影响。

## 范围变更时的强制动作（规则二第 5 条）

一旦裁剪范围发生变化，必须同步：

1. 更新 `/Users/mac/OpenMAIC/AGENTS.md`（及 worktree 副本）「规则三：工程约束」；
2. 更新**所有已完成的** PHASE-x.md（文件对照表、裁剪记录、路线图与最新范围一致）；
3. 在变更当期的 PHASE 文档中追加一条范围变更记录。

## 当前文档索引

- [PHASE-0.md](./PHASE-0.md)：工程骨架 + 自建类型模块（dsl）

- [PHASE-1.md](./PHASE-1.md)：核心纯 TS 移植（播放引擎 / 动作引擎 / 打字机 / 互动循环 / Pinia store / 语音与 TTS 基础）

- [REFERENCE-PHASE-1.md](./REFERENCE-PHASE-1.md)：Phase 1 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-2.md](./PHASE-2.md)：mock 课堂数据 + 接口层
- [REFERENCE-PHASE-2.md](./REFERENCE-PHASE-2.md)：Phase 2 工作参考手册（逐文件/逐方法业务讲解）

## 提交约定（AGENTS.md 规则五）

每完成一个 Phase，**不自动执行 git add / commit / push**；改动保留在工作区，
由用户人工仔细审核后自行提交。除非用户在对话中明确要求提交/推送。

- [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md)：开发计划总览（范围/决策/阶段路线/文件对照/进度）

- [PHASE-3.md](./PHASE-3.md)：页面框架 / 课堂外壳
- [REFERENCE-PHASE-3.md](./REFERENCE-PHASE-3.md)：Phase 3 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-4.md](./PHASE-4.md)：Slide 渲染器（画布/元素/聚光）
- [REFERENCE-PHASE-4.md](./REFERENCE-PHASE-4.md)：Phase 4 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-4.1.md](./PHASE-4.1.md)：laser 激光笔 + slide 元素收敛四类
- [REFERENCE-PHASE-4.1.md](./REFERENCE-PHASE-4.1.md)：Phase 4.1 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-5.md](./PHASE-5.md)：Quiz 场景（无判分）
- [REFERENCE-PHASE-5.md](./REFERENCE-PHASE-5.md)：Phase 5 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-6.md](./PHASE-6.md)：Interactive 场景（iframe 安全渲染 + 保活池）
- [REFERENCE-PHASE-6.md](./REFERENCE-PHASE-6.md)：Phase 6 工作参考手册（逐文件/逐方法业务讲解）

- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)：迁移到另一个 Vue3 项目的说明与注意事项

- [PHASE-7.md](./PHASE-7.md)：语音文字同步（字幕逐字 + 倍速）
- [REFERENCE-PHASE-7.md](./REFERENCE-PHASE-7.md)：Phase 7 工作参考手册（逐文件/逐方法业务讲解）

- [PHASE-8.md](./PHASE-8.md)：互动闭环（登录用户 ↔ 老师多轮一问一答）
- [REFERENCE-PHASE-8.md](./REFERENCE-PHASE-8.md)：Phase 8 工作参考手册（逐文件/逐方法业务讲解）
