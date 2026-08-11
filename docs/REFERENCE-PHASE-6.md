# Phase 6 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么」组织。

## 1. `src/utils/iframe.ts` —— iframe 安全补丁（照搬）

**作用**：给 AI 生成的 HTML 打三层补丁，让它在沙箱 iframe 里正常显示且可诊断。

| 成员 | 做什么 |
|---|---|
| `STORAGE_SHIM` | 内存版 localStorage/sessionStorage（null 源页面访问真实 storage 会崩） |
| `ERROR_CAPTURE_SHIM` | 捕获 onerror/unhandledrejection/console.error → postMessage 回传；先缓冲后重放 |
| `IFRAME_CSS` | html/body 撑满 + 纵向滚动 + body min-height |
| `patchHtmlForIframe(html)` | 注入三件套到 `<head>` 后（或 `<head ...>` 后 / 前插），保证先于页面脚本执行 |

**为什么照搬**：安全补丁的细节（缓冲重放、注入顺序）直接影响"白屏诊断"与"页面不崩"，必须与原项目一致。

## 2. `src/stores/interactive-iframe-pool.ts` —— 保活池（仿写为 Pinia）

**作用**：托管抽屉——iframe 状态不随场景卸载而丢失。

| 方法 | 做什么 | 为什么 |
|---|---|---|
| `mount(sceneId, {srcDoc, src})` | 登记内容；内容相同走保活快路径（不重建），否则重建 + LRU 淘汰 | 同一页面切走再回来不重载 |
| `setRect(sceneId, rect)` | 更新屏幕矩形（无变化跳过） | Host 按它定位 |
| `claim(sceneId, owner)` / `release(sceneId, owner)` | 可见权归属；仅当前 owner 可释放 | 防止旧占位误隐藏新 iframe |
| `setActive(sceneId)` | 记录活动场景 | Host 决定可见性；LRU 不淘汰活动场景 |
| `evict(sceneId)` / `reset()` | 移除单个 / 清空 | 内容重载 / 切换课堂 |

`evictLru(entries, activeSceneId)`：超过 `IFRAME_POOL_CAP=3` 时按 tick 淘汰最久未用（活动场景除外）。

## 3. `src/components/scenes/interactive/InteractiveRenderer.vue` —— 占位组件

**作用**：不渲染 iframe，只做三件事。

| 部分 | 做什么 |
|---|---|
| `onMounted` | patchHtmlForIframe → pool.mount；setActive；claim（owner=随机 id） |
| `measure()`（rAF 循环） | getBoundingClientRect → pool.setRect |
| `onBeforeUnmount` | cancel rAF + release（仅 owner 生效） |

## 4. `src/components/scenes/interactive/InteractiveIframeHost.vue` —— 全局宿主

**作用**：真正渲染 iframe（Teleport 到 body/全屏元素），保活不随场景卸载。

| 部分 | 做什么 |
|---|---|
| `portalTarget` | fullscreenElement ?? body（监听 fullscreenchange） |
| `iframeStyle(entry, sceneId)` | position:fixed 按 rect 定位；可见性 = 当前活动场景且被认领且有矩形；用 visibility 而非 display |
| `sandbox` | `allow-scripts allow-forms allow-popups`（**无 allow-same-origin**） |
| `onBeforeUnmount` | 清空保活池（防旧课堂残留） |

## 5. 接线

- `SceneRenderer.vue`：interactive → InteractiveRenderer；
- `ClassroomPage.vue`：挂载 InteractiveIframeHost（全局，保活）。

## 6. 测试

- `iframe.test.ts`：补丁注入位置（head / head attr / 前插）+ 三件套存在；
- `interactive-iframe-pool.test.ts`：保活快路径 / 内容重建 / LRU / owner 语义 / reset。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-11 | 初版：依据 Phase 6 完成后的讲解整理输出 |

| 日期 | 内容 |
|---|---|
| 2026-08-11（二） | 修复：Teleport 空目标导致 iframe 无法显示（insertBefore null）——`portalTarget` 初始直接指向 document.body，Teleport 加 `v-if` 兜底 |

| 日期 | 内容 |
|---|---|
| 2026-08-11（三） | 修复：iframe 内横向/纵向溢出——注入 CSS 增加 `box-sizing: border-box`（width:100% 与 padding 不再叠加超出） |
