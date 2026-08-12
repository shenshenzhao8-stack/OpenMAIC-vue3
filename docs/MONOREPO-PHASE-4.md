# MONOREPO-PHASE-4 执行记录：生命周期清理与低成本命名空间

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 4 执行。
> 完成日期：2026-08-12

## 一、目标回顾

1. 审计并补齐 OpenMAIC 作为长生命周期 SPA 可卸载组件时的副作用清理
   （音频、SSE、加载请求、Blob URL、模块级缓存等）；
2. Store ID 增加 `openmaic-` 前缀（防与宿主 Pinia store 冲突）；
3. Quiz 草稿 localStorage key 增加课堂 + 场景命名空间。

## 二、实际改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/core/audio/audio-player.ts` | 修改 | ① `activeBlobUrl` 跟踪 + `stopAudioElement()` 回收 Blob URL（stop/销毁不再泄漏）；② 导出 `clearLocalAudioCache()`（模块级缓存清空入口） |
| `src/composables/useChatSession.ts` | 修改 | 持有活动 `AbortController`；`reset()` 与 `onBeforeUnmount` 时 abort 活动 SSE 请求 |
| `src/components/classroom/index.vue` | 修改 | ① `provide('openmaicClassroomId')`；② 课程切换清理链加 `clearLocalAudioCache()`；③ `onBeforeUnmount`：`loadSeq++`（未完成加载失效）+ 清音频缓存 |
| `src/components/scenes/quiz/QuizView.vue` | 修改 | `inject('openmaicClassroomId')`，草稿 key 改为 `openmaic:<classroomId>:quiz:<sceneId>` |
| `src/stores/stage.ts` 等 5 个 | 修改 | Store ID 加前缀：`openmaic-stage / openmaic-canvas / openmaic-settings / openmaic-agent-registry / openmaic-interactive-iframe-pool`（仅改注册 ID，API 不变） |

## 三、生命周期审计结果（对照计划 4.1 清单）

| 资源 | 清理现状 | 本阶段动作 |
|---|---|---|
| PlaybackEngine | 已有 `teardownEngine`（stop/destroy/watch 作用域自动清理） | 无 |
| HTMLAudioElement | `destroy()` 停止并清回调 | 补 Blob URL 回收 |
| SSE/聊天请求 | 无 abort | 新增 AbortController 持有与 abort（reset/卸载） |
| 课堂加载请求 | 请求序号校验（Phase 1） | 卸载时 `loadSeq++` 使未完成请求失效 |
| SpeechRecognition / MediaStream / AudioContext | `useSpeechRecognition` 已有（stop + tracks stop + close + disposed） | 无 |
| iframe pool / fullscreenchange | `InteractiveIframeHost` 已有（removeEventListener + pool.reset） | 无 |
| requestAnimationFrame | `InteractiveRenderer` 已有 cancelAnimationFrame | 无 |
| setTimeout/setInterval | engine/buffer 的 teardown/dispose 已覆盖 | 无 |
| Blob URL | 仅在 ended/error 回收 | 补 stop/销毁时回收（activeBlobUrl） |
| localAudioCache（模块级 Map） | 无清理入口 | 导出 `clearLocalAudioCache`，课程切换/卸载调用 |
| ResizeObserver（useViewportSize） | 已有 disconnect | 无 |

## 四、命名空间改动

### 4.1 Store ID（计划 4.2）

`stage / canvas / settings / agent-registry / interactive-iframe-pool` →
`openmaic-*` 前缀。已确认无代码按旧 id 硬编码引用（store 通过 useXxxStore 函数访问，
getState 兼容层不变），测试全绿。

### 4.2 Quiz 草稿 key（计划 4.3）

`openmaic-quiz-draft:<sceneId>` → `openmaic:<classroomId>:quiz:<sceneId>`。
classroomId 通过课堂组件 `provide` + QuizView `inject` 传递（最小 prop/provide 方案，
不重写状态架构）；旧 key 自动作废（可接受）。

## 五、验证结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `npx vue-tsc --noEmit` | 通过 | provide/inject 类型、store id 改动全量检查 |
| `npm run test` | 18 文件 / **80 用例**通过 | store 测试不依赖 id；无回退 |
| `npm run build` | 通过（135 modules） | 独立 SPA 构建正常 |

## 六、验收对照（计划 Phase 4 验收项：卸载回归）

需用户在浏览器执行：

1. 进入课堂并开始播放；
2. 进入 Interactive；
3. 发起问答；
4. 启动并关闭麦克风；
5. 离开课堂路由；
6. 确认没有继续播放的音频、活动麦克风、残留 iframe 和继续增长的网络请求；
7. 再次进入课堂，确认可以从干净状态开始。

代码层已覆盖的清理点：音频 stop + Blob URL 回收 + 缓存清空、SSE abort、
加载请求失效、iframe pool reset、麦克风 stop/流释放、rAF/resize 取消。

## 七、已知问题与差异

- `clearLocalAudioCache` 为整表清空（单实例约束）；多实例需求出现时再改按课堂分桶；
- mock SSE 对 abort 的即时响应依赖实现，真实后端联调时以 fetch abort 行为为准。

## 八、是否允许进入下一阶段

- 是
- 原因：typecheck / 80 用例 / build 全绿；清理点与命名空间就绪，剩余为人工卸载回归。

## 九、下一步（Phase 5 预告）

迁入目标 pnpm workspace：创建 `package-openmaic`、迁移全量文件（src/mock/public/audio/docs/
测试/配置）、Pinia 降级 `~2.1.7`、根级改动（stylelint 范围 / start-app.mjs /
根 tsconfig references）、源目录退役与全量迁移核对。
