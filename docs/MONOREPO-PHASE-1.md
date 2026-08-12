# MONOREPO-PHASE-1 执行记录：最小课堂组件化

> 依据 `docs/MONOREPO-INTEGRATION-REFACTOR-PLAN.md`（v2）Phase 1 执行。
> 完成日期：2026-08-12

## 一、目标回顾

让课堂核心脱离当前路由，成为可独立挂载的普通 Vue 组件：

1. 新建 `src/components/classroom/index.vue`，承载原 `ClassroomPage.vue` 的课堂模板、
   播放器接线、聊天接线和加载状态；
2. 用 `classroomId` prop 替代 `useRoute()`，组件不依赖 vue-router；
3. `ClassroomPage.vue` 改为薄路由包装页；
4. 监听 `classroomId` 变化重新加载：请求序号校验防旧请求覆盖、停止旧播放、
   清理旧课堂状态；
5. 独立 `/classroom/:id` 路由行为保持不变。

## 二、实际改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/components/classroom/index.vue` | 新增 | 课堂核心组件 `OpenMaicClassroom`：加载、播放、聊天、场景渲染、iframe 保活全量迁入 |
| `src/pages/ClassroomPage.vue` | 重写（薄包装） | 只读 `route.params.id` → 传 `classroomId`，不含任何业务逻辑 |
| `src/composables/useChatSession.ts` | 小改 | 新增 `reset()`：清空对话历史、复位流式状态与计数器、复位语音队列（课程切换用） |
| `src/composables/useDiscussionTTS.ts` | 小改 | 新增 `reset()`：清空语音队列、`speechSynthesis.cancel()`、复位说话指示（课程切换用） |

## 三、实现要点（对照计划）

### 3.1 课堂组件 `src/components/classroom/index.vue`

- **props**：`classroomId: string`（计划 5.1 首期必要 props）；
- **emits**：`load-success: [data: ClassroomData]`、`load-error: [error: unknown]`
  （计划 5.2 建议公开事件，Phase 1 一并落地，成本低）；
- **加载流程** `loadClassroom(id)`：
  1. 请求序号 `++loadSeq` 递增，异步返回后仅接受最新序号（计划 Phase 1 操作 7 的
     「请求序号校验」方案；`getClassroom` 暂无 signal，最小改动不动 client）；
  2. 课程切换清理：`stop()`（停旧播放）→ `resetChat()`（清问答/语音）→
     `iframePool.reset()`（清旧课堂 iframe）→ `stageStore.clearStore()`（清舞台）；
  3. `getClassroom` → `setStage/setScenes/setCurrentSceneId(getFirstSceneId)` →
     `emit('load-success')`；失败 → `error` + `emit('load-error')`；
- **classroomId 监听**：`watch(() => props.classroomId)` 重新加载（同一组件实例复用，
  不卸载重建，覆盖「课程切换」场景）；
- **零 router 依赖**：组件内无 `useRoute`/`vue-router` import（已 grep 验证），
  满足「组件测试中不安装 Router 也能挂载」的代码层要求。

### 3.2 薄包装页 `ClassroomPage.vue`

- `computed(() => String(route.params.id))` → `<OpenMaicClassroom :classroom-id="classroomId" />`；
- 不复制播放/聊天/场景逻辑；独立路由行为与改造前一致。

### 3.3 课程切换清理的复位能力（最小改动）

- `useChatSession.reset()`：messages 清空、isStreaming 复位、userCounter 归零、
  `tts.reset()`；
- `useDiscussionTTS.reset()`：`queue.reset()` + `window.speechSynthesis?.cancel()` +
  `speakingAgentId.value = null`（原 `onBeforeUnmount` 清理逻辑复用同一函数）。

## 四、验证结果

### 4.1 基线（Phase 0 冻结，改造前）

| 命令 | 结果 |
|---|---|
| `npx vue-tsc --noEmit` | 通过 |
| `npm run test` | 16 文件 / 75 用例通过 |
| `npm run build` | 通过（133 modules） |

### 4.2 改造后

| 命令 | 结果 | 备注 |
|---|---|---|
| `npx vue-tsc --noEmit` | 通过 | 新增组件/薄包装/两个 reset 全量类型检查 |
| `npm run test` | 16 文件 / 75 用例通过 | 无用例回退（reset 为纯新增，未影响既有行为） |
| `npm run build` | 通过（133 modules） | 独立 SPA 构建正常 |

## 五、人工回归清单（需用户在浏览器执行）

按计划 Phase 0 固定主线回归：

- [ ] 首页进入 `/classroom/demo`，课堂加载、空态/错误态正常；
- [ ] 播放 / 暂停 / 继续 / 停止 / 倍速 / 上一页 / 下一页 / 进度跳转 / 讲义跳转；
- [ ] 音频、字幕、spotlight、laser；
- [ ] Quiz 作答、提交和复盘；
- [ ] Interactive 操作，切走切回状态保留；
- [ ] 文本提问、播放打断、回答、继续讲课、多轮问答；
- [ ] 麦克风授权、识别成功和失败降级；
- [ ] 离开课堂后无音频、麦克风、iframe 残留；
- [ ] 修改 `classroomId`（若临时加一个切换入口）能正确重新加载且不被旧请求覆盖。

## 六、已知问题与差异

- `getClassroom` 暂不支持 `AbortController`（计划允许：使用请求序号校验替代，最小改动）；
- 组件公开入口（`src/index.ts`）与 `#/*` 别名迁移属于 Phase 2，本阶段未做；
- `assetBaseUrl`（资源根）属于 Phase 3，本阶段未引入；
- 工作区存在非本次改动的 `docs/MIGRATION-GUIDE.md` 删除（用户已有改动），未触碰。

## 七、是否允许进入下一阶段

- 是
- 原因：类型检查、测试、构建全绿；组件已脱离 router、课程切换清理机制就绪；
  仅剩人工浏览器回归待用户执行（结果不影响代码层面 Phase 2 启动，但建议先回归）。

## 八、下一步（Phase 2 预告）

分离独立应用入口与包入口（`src/index.ts`），同步完成 130 处 `@/` → `#/*` 内部引用迁移
（package.json imports + tsconfig paths + vite/vitest alias），并保留 `@openmaic/dsl`
独立别名与 Web 侧解析方案说明。
