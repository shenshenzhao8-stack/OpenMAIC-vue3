# OpenMAIC Monorepo 接入前精简改造计划

> 状态：待执行  
> 编写日期：2026-08-12  
> 适用项目：`/Users/mac/OpenMAIC-vue3`  
> 目标宿主：`/Users/mac/Documents/DesktopOrganizer/project/ai-learning-practice-web`  
> 文档定位：本文件是 OpenMAIC 迁入目标 pnpm monorepo 前后的实施指导，不是当前完成情况说明。

## 1. 背景与目标

OpenMAIC 当前是一个可以独立启动和构建的 Vue 3 课堂播放应用，核心页面为
`src/pages/ClassroomPage.vue`。目标是将项目迁入 AI Learning Practice Web monorepo，形成一个与
`package-share` 类似但业务边界独立的 workspace 包，并允许 Web 应用直接使用课堂播放器组件。

首期改造只解决真实阻塞迁移的问题，不把 OpenMAIC 重构成通用 SDK，也不为尚未提出的多实例、外部 npm
发布或真实后端接入提前建设复杂架构。

改造完成后必须同时满足：

1. OpenMAIC 保持独立开发、独立路由运行和独立 SPA 构建能力；
2. 课堂播放器可通过公开包入口作为普通 Vue 组件使用；
3. 组件不依赖宿主当前路由中必须存在 `id` 参数；
4. 组件不会把 OpenMAIC 的 `html/body/#app` 样式带入宿主；
5. 音频等静态资源能适配宿主的部署 base；
6. 离开课堂页面后不残留音频、请求、麦克风、iframe、监听器或动画任务；
7. 迁入后符合目标 monorepo 的 TypeScript、ESLint、Stylelint 和 Vue SFC 最低规范；
8. 不破坏目标仓库已有 Web、Mobile 的构建与发布流程。

## 2. 当前基线与已知事实

### 2.1 OpenMAIC 当前能力

现有功能包括：

- 独立首页和 `/classroom/:id` 路由；
- slide、quiz、interactive 三类场景；
- 播放、暂停、恢复、停止、上一页、下一页和动作跳转；
- 音频、字幕、倍速、spotlight 和 laser；
- Quiz 作答、提交与复盘；
- Interactive iframe 安全渲染和切页保活；
- 讲义、文本提问、多轮问答、播放打断和继续讲课；
- 浏览器语音识别与麦克风权限处理；
- mock 课堂数据、mock SSE 和单元测试。

这些能力构成迁移红线。除非需求另行确认，本次不得裁剪或改写其业务语义。

### 2.2 已确认的迁移阻塞点

1. `ClassroomPage.vue` 直接调用 `useRoute()` 读取 `route.params.id`，无法稳定作为普通组件使用；
2. `src/main.ts` 同时承担创建应用、安装 Pinia/Router、导入全局样式和挂载 `#app`，不能成为包公开入口；
3. `src/styles.css` 修改 `html/body/#app` 和 `body` overflow，直接导入宿主会污染其布局；
4. mock 音频使用 `/audio/*.mp3` 绝对根路径，在宿主使用非根 base 或独立资源目录时可能 404；
5. 独立页面刷新会自然释放资源，但在宿主 SPA 中路由离开只会卸载组件，必须完整清理运行副作用；
6. OpenMAIC 与宿主的 Pinia、Router、Vite 版本不完全一致，必须通过实际 typecheck/build 验证，不能依赖理论兼容判断；
7. 当前 OpenMAIC SFC 块顺序、分号和 import 排序等与目标仓库规范存在差异。

### 2.3 已验证状态

- OpenMAIC `npm run typecheck` 当前通过；
- 本轮调研未在源目录完成 Vitest 运行，因为受限环境不允许 Vite 向
  `node_modules/.vite-temp` 写临时文件；这不代表测试断言失败，但正式改造前必须在可写环境重新执行；
- 当前目标仓库暂未发现与 OpenMAIC 的 `stage`、`canvas`、`settings`、
  `agent-registry`、`interactive-iframe-pool` 同名的 Pinia Store。

## 3. 范围决策

### 3.1 首期必须完成

1. 冻结并验证现有功能基线；
2. 从路由页面抽出 `OpenMaicClassroom` 组件；
3. 使用 `classroomId` prop 代替组件内部直接读取路由；
4. 分离独立应用入口与组件公开入口；
5. 分离独立应用全局样式与可嵌入组件样式；
6. 为静态资源提供最小资源根适配；
7. 审计并补齐组件卸载和课程切换清理；
8. 低成本增加 OpenMAIC Store ID 和 Quiz storage key 命名空间；
9. 迁入独立 workspace 包并保持独立启动、测试和构建；
10. 在 Web 中通过包公开入口进行最小真实接入验证；
11. 运行 OpenMAIC 和目标仓库的必要校验。

### 3.2 建议完成但不阻塞首期

1. 为课堂数据加载增加可选 `loadClassroom` prop，默认仍使用包内 API；
2. 根据 Web 实际联调结果，为 iframe 增加可配置的 portal target；
3. 补充一个最小组件消费 demo 或测试页；
4. 对 Web 生产构建做 chunk/重复 Vue 检查；
5. 增加快速切换课程和卸载清理的自动化测试。

### 3.3 首期明确不做

以下内容不属于本次迁移前置条件，除非实施过程中出现明确阻塞，不得扩入首期：

- 不移除或重写 Pinia；
- 不新增 `createOpenMaicRuntime()` 之类的完整运行时架构；
- 不以 `provide/inject` 重写全部 Store；
- 不支持同一页面同时挂载多个课堂播放器；
- 不重写播放引擎、动作引擎、字幕或问答流程；
- 不切换真实后端；
- 不全面重写 Interactive iframe 保活和持续 rAF 测量机制；
- 不建设 ESM/CJS 多格式外部 npm SDK；
- 不为外部 npm 发布生成完整发布流水线；
- 不给全部 CSS class 机械增加前缀；
- 不进行视觉改版；
- 不进行整库目录重排、整库重命名或一次性格式化；
- 不把全面 CSP、HTML sanitizer、URL allowlist 等安全专项混入迁移任务；
- 不升级目标 Web 的 Pinia、Router、Vite 或其他基础依赖。

### 3.4 首期约束

首期公开组件约定为：一个宿主页面同时只挂载一个 OpenMAIC 课堂播放器。若未来产生真实多实例需求，再单独评估 Store、iframe pool、音频缓存和全屏状态的实例级隔离。

## 4. 目标形态

迁入后建议形成：

```text
package-openmaic/
├── package.json
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── public/
│   └── audio/
├── mock/
│   └── classroom.ts
└── src/
    ├── App.vue
    ├── main.ts                    # 独立 SPA 入口
    ├── index.ts                   # workspace 包公开入口
    ├── router/
    │   └── index.ts
    ├── pages/
    │   ├── HomePage.vue
    │   └── ClassroomPage.vue      # 只负责路由参数适配
    ├── components/
    │   └── classroom/
    │       └── index.vue          # OpenMaicClassroom 核心组件
    ├── api/
    ├── composables/
    ├── core/
    ├── stores/
    ├── types/
    ├── utils/
    ├── styles.css                 # 若仍需要，仅包含组件安全样式
    └── standalone.css             # 仅独立 main.ts 引入
```

不要求为了符合该示意图而移动所有业务文件。首期只需要抽出课堂核心组件、增加公开入口和拆分全局样式，其余目录优先保持原位，减少无意义 diff。

## 5. 公开组件契约

### 5.1 首期必要 props

```ts
export interface OpenMaicClassroomProps {
  classroomId: string;
  assetBaseUrl?: string;
}
```

建议增加可选加载覆盖能力，但不强制引入完整 services 架构：

```ts
export type ClassroomLoader = (
  classroomId: string,
  signal?: AbortSignal,
) => Promise<ClassroomData>;

export interface OpenMaicClassroomProps {
  classroomId: string;
  assetBaseUrl?: string;
  loadClassroom?: ClassroomLoader;
}
```

默认行为仍调用 OpenMAIC 包内现有 `getClassroom()`，保证独立项目和 mock 流程不受影响。

### 5.2 建议公开事件

首期只公开宿主确实可能使用的事件：

```ts
defineEmits<{
  'load-success': [data: ClassroomData];
  'load-error': [error: unknown];
}>();
```

场景变化、播放状态、讨论事件等暂不提前公开。待 Web 出现明确调用需求后再扩展，避免 API 过早固化。

### 5.3 包公开入口

`src/index.ts` 建议只导出：

```ts
export { default as OpenMaicClassroom } from './components/classroom/index.vue';
export type { ClassroomData, ClassroomLoader, OpenMaicClassroomProps } from './types/public';
```

首期不公开：

- 内部 Pinia Store；
- PlaybackEngine 实例；
- Canvas/iframe pool；
- 内部场景组件；
- mock 实现之外的内部 API 细节。

## 6. 分阶段实施计划

## Phase 0：冻结迁移前基线

### 目标

确保后续任何重构都能判断是否产生功能回退。

### 操作

1. 在可写环境执行：

   ```bash
   npm run typecheck
   npm run test
   npm run build
   ```

2. 记录测试文件数、用例数、构建产物和命令结果；
3. 按下列顺序执行人工功能验收：
   - 首页进入 `/classroom/demo`；
   - 课堂加载、空态和错误态；
   - 播放、暂停、继续、停止、倍速；
   - 上一页、下一页、进度跳转、讲义跳转；
   - 音频、字幕、spotlight、laser；
   - Quiz 作答、提交和复盘；
   - Interactive 操作，切走切回状态保留；
   - 文本提问、播放打断、回答、继续讲课、多轮问答；
   - 麦克风授权、识别成功和失败降级；
   - 离开课堂后没有音频、麦克风或 iframe 残留。
4. 如发现基线本身失败，先记录并区分：
   - 必须在迁移前修复的现有缺陷；
   - 不影响迁移、可单独排期的现有缺陷。

### 文件改动

仅补充基线记录或测试，不改业务结构。

### 验收

- typecheck、test、build 结果均有记录；
- 人工功能清单有明确结果；
- 后续每个 Phase 都以此基线回归。

## Phase 1：最小课堂组件化

### 目标

让课堂核心脱离当前路由，可以作为普通 Vue 组件挂载。

### 操作

1. 新建 `src/components/classroom/index.vue`；
2. 将当前 `ClassroomPage.vue` 的课堂模板、播放器接线、聊天接线和加载状态迁入该组件；
3. 删除课堂核心对 `useRoute()` 的依赖；
4. 通过 `classroomId` prop 加载课堂；
5. 将 `src/pages/ClassroomPage.vue` 改成薄路由包装页：
   - 读取 `route.params.id`；
   - 向 `open-maic-classroom` 传入 `classroomId`；
   - 不复制课堂业务逻辑；
6. 监听 `classroomId` 变化：
   - 中止旧加载请求；
   - 停止旧播放；
   - 清理旧课堂状态；
   - 再加载新课堂；
7. 防止旧请求晚返回覆盖新课堂，优先使用 `AbortController`；若现有 mock loader 暂不使用 signal，至少增加请求序号校验。

### 关键要求

- 独立 `/classroom/:id` 路由行为保持不变；
- 组件测试中不安装 Router 也能挂载；
- 不在路由包装页保留播放、聊天或场景逻辑；
- 暂不重写 Store、PlaybackEngine 或 composables。

### 验收

```bash
npm run typecheck
npm run test
npm run build
```

人工回归完整课堂基线，并额外验证修改 `classroomId` 后能正确重新加载。

## Phase 2：分离独立应用入口和包入口

### 目标

确保导入 OpenMAIC 组件不会自动创建应用、安装 Router 或挂载 `#app`。

### 操作

1. 保留 `src/main.ts` 作为独立 SPA 入口；
2. 新增 `src/index.ts` 作为包公开入口；
3. 公开入口只导出 `OpenMaicClassroom` 和必要公共类型；
4. 禁止 `src/index.ts` 导入：
   - `src/main.ts`；
   - 独立 Router；
   - `App.vue`；
   - 独立全局样式；
5. 为 `package.json` 增加 workspace 源码入口：

   ```json
   {
     "main": "./src/index.ts",
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "import": "./src/index.ts"
       }
     }
   }
   ```

6. 首期不建设 ESM/CJS 双产物；由目标 Web 的 Vite 编译 workspace 源码。

### 验收

- 独立应用仍可启动和构建；
- 最小测试入口仅导入 `src/index.ts` 即可渲染组件；
- 导入包入口不会执行 `createApp()` 或 `app.mount()`；
- 包公开入口不导出内部 Store 和实现细节。

## Phase 3：隔离全局样式与资源路径

### 目标

解决嵌入宿主后的确定性样式污染和音频路径问题。

### 3.1 全局样式拆分

将以下规则移入 `src/standalone.css`：

```css
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  overflow-x: hidden;
}
```

`standalone.css` 只由 `src/main.ts` 引入。组件入口和 `OpenMaicClassroom` 不得引入它。

课堂组件根节点自身明确：

```css
.classroom {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
```

首期不要求给所有 class 加前缀，因为现有 SFC 样式大多已 scoped。

### 3.2 资源路径适配

增加统一的最小资源解析函数，例如：

```ts
export function resolveAssetUrl(path: string, assetBaseUrl = ''): string {
  if (/^(?:https?:|blob:|data:)/.test(path)) return path;

  const normalizedPath = path.replace(/^\/+/, '');
  const normalizedBase = assetBaseUrl.replace(/\/+$/, '');
  return normalizedBase ? `${normalizedBase}/${normalizedPath}` : `/${normalizedPath}`;
}
```

要求：

- mock 音频在独立应用中仍可使用 `/audio/*.mp3`；
- Web 可传入自己的资源根；
- 完整 HTTP、blob 和 data URL 不应被改写；
- `avatar`、课程图片等同类路径使用同一解析规则，避免只修音频。

### 验收

- 独立应用布局不回退；
- 组件嵌入一个带滚动布局的测试宿主时，不修改宿主 body overflow；
- 非根资源 base 下所有 mock 音频均可加载；
- 公开入口不包含 `html/body/#app` 样式副作用。

## Phase 4：生命周期清理与低成本命名空间

### 目标

保证 OpenMAIC 作为长生命周期 SPA 中的可卸载组件使用时不会遗留副作用。

### 4.1 生命周期审计

按模块逐项确认：

| 资源 | 创建位置 | 必须清理的动作 |
|---|---|---|
| PlaybackEngine | `usePlaybackEngine` | stop/destroy，取消 watch 和计时任务 |
| HTMLAudioElement | audio player | pause、清空 src/引用、失效旧回调 |
| SSE/聊天请求 | chat session | AbortController.abort |
| 课堂加载请求 | classroom component | AbortController.abort 或请求序号失效 |
| SpeechRecognition | speech composable | stop/abort，移除回调 |
| MediaStream | speech composable | 所有 track 调用 `stop()` |
| AudioContext | speech composable | close |
| iframe pool | iframe host/store | reset |
| fullscreenchange | iframe host | removeEventListener |
| requestAnimationFrame | interactive renderer | cancelAnimationFrame |
| setTimeout/setInterval | engine/buffer/chat | clearTimeout/clearInterval |
| Blob URL | audio cache/player | URL.revokeObjectURL |

优先补齐现有 composable 和组件的 `onBeforeUnmount`，不新增完整 Runtime 层。

### 4.2 Store ID 命名空间

将 Store ID 改为：

```text
openmaic-stage
openmaic-canvas
openmaic-settings
openmaic-agent-registry
openmaic-interactive-iframe-pool
```

只改 Pinia 注册 ID，不重写 Store API。

### 4.3 localStorage key 命名空间

Quiz 草稿 key 使用：

```text
openmaic:<classroomId>:quiz:<sceneId>
```

如果 Quiz 组件当前拿不到 `classroomId`，可通过最小 prop/provide 传递，不能因此重写全部状态架构。

### 验收

执行卸载回归：

1. 进入课堂并开始播放；
2. 进入 Interactive；
3. 发起问答；
4. 启动并关闭麦克风；
5. 离开课堂路由；
6. 确认没有继续播放的音频、活动麦克风、残留 iframe 和继续增长的网络请求；
7. 再次进入课堂，确认可以从干净状态开始。

## Phase 5：迁入目标 pnpm workspace

### 目标

将整改后的项目作为独立公共业务包迁入 monorepo，同时保留独立应用能力。

### 操作

1. 在目标仓库创建 `package-openmaic/`；
2. 迁移：
   - `src/`；
   - `mock/`；
   - `public/audio/`；
   - `index.html`；
   - Vite、Vitest、TypeScript 配置；
   - 必要 README、TODO 和本指导文档；
3. 不迁移：
   - `.git/`；
   - `node_modules/`；
   - `dist/`；
   - `package-lock.json`；
   - `.DS_Store`；
4. 修改目标 `pnpm-workspace.yaml`，显式加入：

   ```yaml
   - 'package-openmaic'
   ```

5. 将包名设为：

   ```json
   {
     "name": "@ailearning/openmaic",
     "private": true
   }
   ```

6. 使用根 TypeScript 5.9 和 pnpm lockfile；
7. 保留独立脚本：

   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vue-tsc --noEmit && vite build",
       "preview": "vite preview",
       "typecheck": "vue-tsc --noEmit",
       "test": "vitest run",
       "clear": "rm -fr node_modules && rm -fr dist"
     }
   }
   ```

8. 是否将新包加入根 TS project references，根据包内 typecheck 稳定情况决定；不要在尚未完成规范修复时让它阻断整个仓库；
9. 将根 lint/stylelint 检查范围扩展到 `package-openmaic`，但先以包内问题修复完成为前提；
10. 不修改现有 Web/Mobile 构建命令语义，不复用 Web 的 outDir。

### 依赖策略

- 不升级目标 Web 的 Pinia、Router、Vite；
- OpenMAIC 的独立 Vite/Vitest 版本只作为自身 devDependencies；
- workspace 安装后实际验证 Pinia 版本和 Vue 单例；
- 如果 Pinia 3 造成 Web 消费或类型阻塞，再以最小改动评估将 OpenMAIC 适配到 Pinia 2.1.7；
- 不因主版本数字不同直接启动 Store 重写。

### 验收

```bash
pnpm install
pnpm --dir package-openmaic run typecheck
pnpm --dir package-openmaic run test
pnpm --dir package-openmaic run build
```

独立运行：

```bash
pnpm --dir package-openmaic run dev
```

并按完整功能基线回归 `/classroom/demo`。

## Phase 6：Web 最小接入

### 目标

在真实宿主中验证组件，而不是继续基于理论风险扩大改造范围。

### 操作

1. Web 增加 workspace 依赖：

   ```json
   {
     "dependencies": {
       "@ailearning/openmaic": "workspace:^"
     }
   }
   ```

2. 新增一个最小 Web 包装页或页面私有组件；
3. 只通过公开入口导入：

   ```ts
   import { OpenMaicClassroom } from '@ailearning/openmaic';
   ```

4. 禁止导入：
   - `@ailearning/openmaic/src/...`；
   - `package-openmaic/src/...` 相对路径；
   - OpenMAIC 独立 `main.ts`；
5. 包装页负责：
   - 从 Web 路由获得课程 ID；
   - 提供具有明确高度的容器；
   - 传入资源根；
   - 显示或上报加载错误；
6. 首期仍使用包内 mock，真实后端接入另行设计；
7. 根据真实联调验证 iframe body Teleport 是否产生问题：
   - 若没有覆盖、层级或滚动错误，首期保留现状；
   - 若出现明确错误，再增加 `portalTarget`，不得预先重写 iframe 保活架构。

### Web 联调清单

- Web Header、导航和登录弹窗正常；
- 页面高度正确，无双滚动条或内容裁切；
- 播放控制、音频、字幕正常；
- Quiz 正常；
- Interactive 定位正确，切页保活；
- 讲义和问答正常；
- 麦克风权限和降级正常；
- 离开课堂路由后无残留；
- 再进入课堂可正常重建；
- 浏览器控制台无多个 Vue 实例、Pinia 注入失败或 Router 注入失败警告。

### 构建验收

```bash
pnpm --dir packages-app/web run build:type
pnpm run build:web-development
pnpm run build:web-test
pnpm run build:web-production
```

至少检查一次 Web 产物，确认没有明显重复 Vue runtime。如果发现重复，再调整 package 依赖和 Vite dedupe/external 策略，不提前建设 library bundle。

## Phase 7：代码规范收口与全仓回归

### 目标

在功能和宿主接入稳定后，对新增包做最低必要规范适配，避免格式改动掩盖功能改动。

### 处理范围

1. Vue SFC 顺序统一为：

   ```text
   template → script setup lang="ts" → style scoped
   ```

2. 模板组件和自定义事件使用 kebab-case；
3. 事件处理函数使用 `handleXxx`；
4. 使用单引号、分号、2 空格缩进和 120 字符行宽；
5. 修复 import 排序；
6. 修复未使用变量和明确的类型错误；
7. 样式通过目标 Stylelint；
8. 公共入口和公共类型不得泄漏只能在包内解析的 alias；
9. 不为风格统一重写引擎逻辑或进行无关目录移动；
10. 按目录小批量修复，每批后运行 typecheck 和 test。

### 推荐顺序

1. 公开入口和课堂组件；
2. pages 和 components；
3. composables 和 stores；
4. api、types 和 utils；
5. core；
6. tests 和 mock。

### 全仓验收

```bash
pnpm --dir package-openmaic run typecheck
pnpm --dir package-openmaic run test
pnpm --dir package-openmaic run build
pnpm --dir packages-app/web run build:type
pnpm run lint
pnpm run stylelint
pnpm run build:web-development
pnpm run build:web-test
pnpm run build:web-production
pnpm run build:mobile-development
pnpm run build:mobile-test
pnpm run build:mobile-production
```

如果全仓已有无关失败，必须记录具体命令、错误文件、是否由本次改动引入，不能只写“历史问题”。

## 7. 文件级改造清单

| 文件/目录 | 首期动作 | 说明 |
|---|---|---|
| `src/pages/ClassroomPage.vue` | 改造 | 变成只读取路由参数的薄包装页 |
| `src/components/classroom/index.vue` | 新增 | 承载原课堂页核心功能，接收 `classroomId` |
| `src/index.ts` | 新增 | workspace 包公开入口 |
| `src/main.ts` | 小改 | 保留独立启动；只在这里引入 standalone 全局样式 |
| `src/styles.css` | 拆分 | 移除 `html/body/#app` 全局规则或改为安全组件样式 |
| `src/standalone.css` | 新增 | 独立应用专用根样式 |
| `src/api/client.ts` | 小改 | 支持可中止/可替换 loader 的最小契约，默认 mock 不变 |
| `src/core/audio/audio-player.ts` | 审计/补漏 | 卸载停止、失效旧回调、回收 Blob URL、资源路径解析 |
| `src/composables/usePlaybackEngine.ts` | 审计/补漏 | 确保 onBeforeUnmount 停止和销毁引擎 |
| `src/composables/useChatSession.ts` | 审计/补漏 | 卸载和课程切换时 abort 流式请求 |
| `src/composables/useSpeechRecognition.ts` | 审计/补漏 | stop/abort、停止 tracks、关闭 AudioContext |
| `src/components/scenes/interactive/*` | 审计/补漏 | iframe pool reset、监听和 rAF 清理；首期不重写架构 |
| `src/stores/*.ts` | 小改 | Store ID 增加 `openmaic-` 前缀 |
| `src/components/scenes/quiz/QuizView.vue` | 小改 | localStorage key 增加 OpenMAIC/课程命名空间 |
| `vite.config.ts` | 适配 | 保持独立 SPA 构建和内部 alias，不影响宿主 Vite |
| `vitest.config.ts` | 适配 | 保持 alias 和测试可运行 |
| `tsconfig.json` | 适配 | 对齐 TS 5.9 和目标规范，保持严格类型 |
| `package.json` | 改造 | pnpm workspace 包信息、公开入口和独立脚本 |
| `public/audio/` | 迁移 | 保留独立 demo 音频，正式资源根可由宿主传入 |
| `mock/` | 迁移 | 首期继续支持独立 mock 课堂 |

## 8. 风险与处置原则

| 风险 | 首期判断 | 处置 |
|---|---|---|
| Classroom 依赖 Router | 已确认阻塞 | 必须改为 prop |
| 全局根样式污染宿主 | 已确认风险 | 必须拆分 |
| `/audio` 根路径失效 | 已确认风险 | 必须支持资源根 |
| 卸载后资源残留 | 已确认 SPA 风险 | 必须审计和补齐 |
| Pinia 2/3 版本差异 | 潜在风险 | 先安装、typecheck、运行验证；失败再最小适配 |
| Store ID 冲突 | 当前未发生 | 低成本加前缀，不重写 Store |
| 多播放器共享状态 | 当前无需求 | 首期明确不支持，不做实例级重构 |
| iframe Teleport 覆盖宿主 | 需真实联调 | 出现问题才增加 portalTarget |
| 永久 rAF 性能 | 当前未证明有问题 | 保留现状，记录技术债 |
| 两份 Vue runtime | 构建期风险 | 检查依赖树与 Web 产物，发现后调整 dedupe/依赖声明 |
| v-html/AI HTML 安全 | 独立安全专项 | 保持现有 sandbox 不退化，另行评审 |
| 全面格式化引起大 diff | 高回归风险 | 分批、最后处理 |
| 真实 API 契约不确定 | 当前非目标 | 保持集中 client/mock，不提前 services 化 |

### 风险升级规则

只有满足以下任一条件，才允许把“首期不做”事项升级为当前任务：

1. typecheck、test 或 build 明确失败且无法用局部适配解决；
2. Web 真实联调出现可稳定复现的功能错误；
3. 已确认的生产部署约束要求改变设计；
4. 用户明确扩大需求范围。

升级时必须记录：触发证据、最小可选方案、影响文件、回归范围和回滚方法。

## 9. 提交与回滚建议

每个提交只承担一种职责，建议顺序：

1. `test: freeze OpenMAIC migration baseline`
2. `refactor: extract classroom component from route page`
3. `refactor: add package entry and asset base support`
4. `fix: isolate standalone styles from embedded component`
5. `fix: clean up classroom resources on unmount`
6. `refactor: namespace OpenMAIC stores and quiz drafts`
7. `build: migrate OpenMAIC into pnpm workspace`
8. `feat: add minimal Web classroom integration`
9. `style: align OpenMAIC with monorepo checks`
10. `test: complete OpenMAIC and host regression`

每个提交后至少执行受影响范围的 typecheck 和 test。不要把源项目复制、架构改造、全量格式化和 Web
接入压进同一个提交。

出现回归时优先按提交回退当前阶段，不使用破坏性命令覆盖用户已有改动。

## 10. 最终验收清单

### OpenMAIC 独立性

- [ ] 可以独立安装、启动和预览；
- [ ] 独立首页与 `/classroom/demo` 正常；
- [ ] 独立 typecheck、test、build 通过；
- [ ] 原有课堂功能基线无回退；
- [ ] 独立构建不依赖 Web 私有代码或配置。

### 公共组件

- [ ] 通过 `classroomId` prop 使用；
- [ ] 核心组件不调用 `useRoute()`；
- [ ] 只通过 `@ailearning/openmaic` 公开入口导入；
- [ ] 导入组件不会创建或挂载新 Vue 应用；
- [ ] 不修改宿主 `html/body/#app`；
- [ ] 支持宿主资源 base；
- [ ] 课程切换不会被旧请求覆盖；
- [ ] 卸载后无音频、SSE、麦克风、iframe、监听器、timer 和 rAF 残留；
- [ ] 首期单实例约束已写入 README 或公共组件文档。

### Web 宿主

- [ ] Web Header、Layout、登录弹窗和滚动行为正常；
- [ ] 播放、音频、字幕、场景、Quiz、Interactive、讲义和问答正常；
- [ ] 离开并重新进入课堂页正常；
- [ ] 控制台无 Vue/Pinia/Router 注入异常；
- [ ] development、test、production 构建通过；
- [ ] Web 产物没有明显重复 Vue runtime。

### Monorepo 回归

- [ ] 原 Web 非课堂页面功能和构建不受影响；
- [ ] Mobile 不依赖 `@ailearning/openmaic`；
- [ ] Mobile 原构建通过；
- [ ] 根 lint/stylelint 对新增包的检查结果明确；
- [ ] OpenMAIC 产物不覆盖 Web/Mobile dist；
- [ ] 根清理、安装和启动脚本没有误删或遗漏新增包。

## 11. 完成定义

当且仅当以下结果同时成立，首期改造视为完成：

```text
OpenMAIC 独立 SPA 正常
        +
Classroom 核心组件脱离路由
        +
全局样式、资源路径和卸载副作用已隔离
        +
作为独立 workspace 包迁入
        +
Web 通过公开入口完成真实功能验证
        +
Web/Mobile 原构建和发布路径不受影响
```

任何多实例 Runtime 重写、完整 library bundle、真实后端服务注入、iframe 架构重写或全面安全专项，均不属于上述完成定义。

## 12. 执行记录模板

每个 Phase 完成后在对应实施记录中填写：

```md
## Phase X 执行结果

- 开始日期：
- 完成日期：
- 实际改动文件：
- 与计划差异：
- 差异原因：

### 自动验证

| 命令 | 结果 | 备注 |
|---|---|---|
| `...` | 通过/失败 | |

### 人工验证

| 功能 | 结果 | 备注 |
|---|---|---|
| `...` | 通过/失败 | |

### 已知问题

- 无 / 具体问题

### 是否允许进入下一阶段

- 是 / 否
- 原因：
```

实施过程中应以可验证证据决定是否扩大整改范围，不因理论上的“更通用”或“更漂亮”增加非必要架构。
