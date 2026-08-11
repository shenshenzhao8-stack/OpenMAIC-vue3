# Phase 6 完成说明：Interactive 场景（iframe 安全渲染 + 保活池）

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。
> ⚠ 维护注意：本部分复杂度与维护难度较高，请先阅读「五、维护注意」再改动。

## 当前有效范围（沿用）

- 场景：slide / quiz / interactive（本阶段实现 interactive 真实渲染）；
- 教学动作：speech + spotlight + laser；
- interactive：AI/后台生成的整页 HTML 在沙箱 iframe 中展示；**无 widget 命令**（已裁剪）；
- 互动：登录用户 ↔ 老师多轮一问一答（Phase 8）；
- 课堂数据 mock。

## 一、阶段目标

1. 把交互 HTML 安全地放进 iframe（sandbox 隔离 + 安全补丁）；
2. 保活池：切页只隐藏不销毁，回来零刷新恢复；
3. 占位组件 + 全局 Host 的分层架构（iframe 不随场景子树卸载）；
4. 全量文档（含维护注意）。

## 二、架构：三角色 + 安全补丁

```
InteractiveRenderer（占位/贴纸）
   ├─ mount：打补丁后的 HTML 登记进保活池
   ├─ claim：声明可见权（owner）
   └─ rAF 上报自身矩形（setRect）
        ↓
IframePool（Pinia 托管抽屉）
   entries[sceneId] = { srcDoc, rect, owner, tick }，LRU 上限 3
        ↓
InteractiveIframeHost（全局搬运工，Teleport 到 body/全屏元素）
   按 rect 用 position:fixed 覆盖；切页 visibility 隐藏；sandbox 隔离
```

## 三、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/utils/iframe.ts` | `lib/utils/iframe.ts` | 安全补丁（storage shim + error shim + CSS） | **照搬**（纯 TS，注入逻辑一致） |
| `src/stores/interactive-iframe-pool.ts` | `lib/store/interactive-iframe-pool.ts` | 保活池（Zustand） | **改写为 Pinia**：字段/方法名一致（mount/setRect/claim/release/setActive/evict/reset + LRU） |
| `src/components/scenes/interactive/InteractiveRenderer.vue` | `components/scene-renderers/interactive-renderer.tsx` | 占位：登记 + 认领 + 上报矩形 | **改写**：rAF 量 rect（与原项目一致） |
| `src/components/scenes/interactive/InteractiveIframeHost.vue` | `components/scene-renderers/InteractiveIframeHost.tsx` | 全局 iframe 宿主 | **改写**：React portal → Vue Teleport；sandbox 一致；无 widget 消息通道（已裁剪） |
| `src/components/stage/SceneRenderer.vue` | —— | 分发 | 接入 InteractiveRenderer |
| `src/pages/ClassroomPage.vue` | `components/stage.tsx` | 挂载全局 Host | 挂载 InteractiveIframeHost（保活） |
| 测试（iframe / pool） | 原项目无独立测试 | —— | 新增 |

## 四、安全机制（为什么这样设计）

1. **sandbox 不加 `allow-same-origin`**：iframe 处于 null 源，AI 生成的 HTML 无法读取宿主 cookie/localStorage、无法操作父页面 DOM，只能通过 postMessage 通信——这是"隔离房间"的核心；
2. **storage shim**：null 源页面访问 localStorage 会抛异常 → 注入内存版，防白屏；
3. **error shim**：页面运行错误通过 postMessage 回传（缓冲 + 重放机制），可诊断白屏；
4. **保活不销毁**：切页用 `visibility` 隐藏而非 `display:none`（后者可能在重新显示时丢弃文档）。

## 五、维护注意（重点，改前必读）

| 注意点 | 说明 |
|---|---|
| 安全红线 | 永远不要给 sandbox 加 `allow-same-origin`；补丁必须插在页面脚本之前（patchHtmlForIframe 已保证） |
| 保活生命周期 | iframe 只随「内容变化」或「LRU 淘汰」或「切换课堂（reset）」重建；不要手动销毁 |
| owner 语义 | 只有当前 owner 能 release；旧占位清理若 owner 已变则 no-op（防止交叉淡入误隐藏） |
| 矩形上报 | rect 来自占位 rAF 测量；缩放/滚动/全屏变化会自动重测（ResizeObserver 之外的跟随方案） |
| 全屏 | Host 监听 fullscreenchange，iframe 会 Teleport 到全屏元素内，否则演示全屏会丢失 iframe |
| 裁剪说明 | 无 widget 命令（widget_highlight 等已裁剪），因此未移植 widget-iframe 消息通道；如需恢复见 TODO T-05/T-06 |
| 性能 | LRU 上限 3 个常驻文档；超过会淘汰最久未用（活动场景不淘汰） |

## 六、验证结果

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：13 个测试文件 / 52 个用例全部通过（新增 iframe 3 + 保活池 5）；
- `npm run build`：通过（122 modules）。

## 七、范围变更记录

无新范围变更（interactive 本就在范围内；widget 命令按既有裁剪）。TODO T-05（widget 子类型）仍开放：iframe 渲染已实现，widgetConfig 配置结构待后台数据确认后细化。

## 八、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。
