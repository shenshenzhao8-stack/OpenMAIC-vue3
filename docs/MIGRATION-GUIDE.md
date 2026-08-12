# 迁移说明：OpenMAIC-Vue3 → 另一个 Vue3 项目

> 用途：把当前项目的全部业务迁移到另一个同构 Vue3 项目（文件名一致）。
> 依据当前工程（Phase 0-6 完成状态）编写。最后更新：2026-08-11。

## 一、迁移目标与前提

- 目标项目：Vue 3 + Vite + TypeScript + Vue Router + Pinia（与当前一致）；
- 迁移的是**业务代码与配置**，不迁移 `node_modules` / `dist` / git 历史；
- 若目标项目使用不同脚手架，以本文「配置对齐」为准。

## 二、需要迁移的文件清单

### 1. 根配置文件（必须）

| 文件 | 说明 |
|---|---|
| `package.json` | 依赖清单（见第四节）；**建议直接复用** |
| `package-lock.json` | 锁定版本（npm）；可直接复制保证一致 |
| `vite.config.ts` | 别名 + 服务器（host 0.0.0.0 / port 5173） |
| `tsconfig.json` | 编译配置 + paths |
| `vitest.config.ts` | 测试配置 + alias |
| `index.html` | 入口 HTML |
| `.gitignore` | 忽略规则 |

### 2. 业务目录（全量复制）

- `src/` 整个目录（types / core / stores / composables / utils / api / components / pages / router / 测试）；
- `mock/classroom.ts`（注意：`src/api/client.ts` 用相对路径 `../../mock/classroom` 导入，**目录层级必须保持一致**）。

### 3. 文档（建议迁移）

- `docs/` 全部（PHASE-*、REFERENCE-*、DEVELOPMENT-PLAN、README、MIGRATION-GUIDE）；
- `README.md`、`TODO.md`；
- `public/`：当前为空；若目标项目有静态资源需求，另行放置。

## 三、关键配置对齐（最容易漏，漏了编译失败）

### 1. 路径别名必须三处一致

| 文件 | 内容 |
|---|---|
| `vite.config.ts` | `'@' → src`；`'@openmaic/dsl' → src/types/dsl/index.ts` |
| `tsconfig.json` | `paths` 同 vite |
| `vitest.config.ts` | `resolve.alias` 同 vite（测试里 import '@openmaic/dsl' 需要） |

### 2. TypeScript 版本必须锁 `~5.9`

**不能装 7.x**——vue-tsc 3.x 依赖 TS 的 `./lib/tsc`，TS7 会报
`Package subpath './lib/tsc' is not defined`（本项目建设期踩过的坑）。

### 3. 依赖清单（当前准确版本）

```jsonc
// dependencies
"pinia": "^3.0.4",
"vue": "^3.5.41",
"vue-router": "^4.6.4"

// devDependencies
"@types/node": "^26.1.2",
"@vitejs/plugin-vue": "^6.0.8",
"typescript": "~5.9.0",      // ★ 锁 5.9
"vite": "^8.2.1",
"vitest": "^4.1.10",
"vue-tsc": "^3.3.9"
```

> 已删除的依赖不要加回：katex / @types/katex（Phase 4.1 裁剪了公式元素）。

## 四、迁移步骤（推荐顺序）

1. 在目标项目执行 `npm install`（或直接复制 package.json + lock 后 install）；
2. 复制：根配置文件 → `src/` → `mock/` → `docs/` + README + TODO；
3. 检查别名三处一致（第三节 1）；
4. 验证三连：
   ```bash
   npx vue-tsc --noEmit
   npm run test        # 预期 13 文件 / 52 用例
   npm run build
   ```
5. `npm run dev` 手动验收（见第六节）。

## 五、迁移后验证清单

- [ ] `vue-tsc --noEmit` 通过
- [ ] vitest 13 文件 / 52 用例全过
- [ ] `vite build` 通过
- [ ] 首页显示 mock 课堂列表（进入 /classroom/demo）
- [ ] 播放：字幕逐句、聚光/激光按剧本执行
- [ ] quiz：封面→答题→提交→复盘（选择题对错、简答题参考答案）
- [ ] interactive：滑块可操作；切走再切回状态不丢（保活）
- [ ] 通过 IP 可访问（http://<局域网IP>:5173/）

## 六、注意事项 / 坑

| # | 注意点 | 说明 |
|---|---|---|
| 1 | **TS 版本锁 5.9** | 装成 7.x 会直接编译失败（见第三节 2） |
| 2 | **别名三处一致** | vite / tsconfig / vitest；漏一处：Vite 能跑但 vue-tsc 报错，或测试跑不起来 |
| 3 | **全局样式** | `src/styles.css` 必须在 `main.ts` 引入；漏了会回归「body 默认 margin → 竖向滚动条」布局 bug |
| 4 | **InteractiveIframeHost 挂载位置** | 必须挂载在 ClassroomPage 顶层（不在 SceneRenderer 内），否则 iframe 随场景切换卸载、保活失效 |
| 5 | **mock 相对路径** | `src/api/client.ts` 用 `../../mock/classroom`；迁移时保持 `mock/` 在 `src/` 同级 |
| 6 | **Node 版本** | 需 Node ≥ 20.9（Vite 8 / vue-tsc 要求）；建议 Node 22+ |
| 7 | **不迁移** | `node_modules`、`dist`、`.git`（目标项目各自 init/install） |
| 8 | **注释里的原项目路径** | 各文件头注释写有 `/Users/mac/OpenMAIC` 等说明性路径，不影响编译；换机器后如需要可批量替换（纯文档说明） |
| 9 | **AGENTS.md 规则归属** | 开发规则文件在 OpenMAIC 项目根目录（不属于本工程）；若目标项目也想要这些规则，按需复制并调整其中路径 |
| 10 | **git 提交** | 本项目规则五：每阶段不自动提交；迁移完成后目标项目由你自行提交 |
| 11 | **交互 iframe 安全** | 保持 `sandbox` 不加 `allow-same-origin`；这是隔离红线 |
| 12 | **IP 访问** | `vite.config.ts` 已配置 `server.host: '0.0.0.0'`；目标项目若想支持 IP 访问需保留该配置 |

## 七、附：当前 src 文件清单（69 个文件，供核对）

见本文件末尾（由 `find src -type f | sort` 生成，迁移后应完全一致）。

```
src/
├─ App.vue / main.ts / env.d.ts / styles.css
├─ api/            client.ts + mock/chat-sse.ts + 测试
├─ components/
│  ├─ scenes/interactive/  InteractiveRenderer.vue + InteractiveIframeHost.vue
│  ├─ scenes/quiz/         QuizView.vue + 三种题型组件
│  ├─ scenes/slide/        SlideView/ScreenElement/Spotlight/Laser + elements/{Text,Shape,Line,Image}.vue
│  └─ stage/               HeaderControls/SceneSidebar/SceneProvider/SceneRenderer
├─ core/           playback/ action/ buffer/ chat/ choreography/ audio/ quiz/ logger
├─ composables/          usePlaybackEngine/useScene/useViewportSize/useSlideBackgroundStyle
├─ stores/         stage/canvas/settings/agent-registry/interactive-iframe-pool
├─ types/          dsl/ + stage/action/chat/provider/agent
└─ utils/          geometry/iframe/line-path/playback-navigation/quiz-check/slide-style/viewport-fit
```

> 补充（2026-08-12）：迁移时还需携带：
> - `public/audio/*.mp3`（课堂语音，按 speech 动作 id 命名）；
> - mock 数据中的 `audioUrl: '/audio/<id>.mp3'` 依赖该目录；
> - `src/api/mock/` 现仅剩 `chat-sse.ts`（TTS mock 已删除）。
