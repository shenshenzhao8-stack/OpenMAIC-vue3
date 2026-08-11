# Phase 4.1 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。
> 结构约定：每个文件按「① 文件作用 → ② 主要方法/函数逐个 → ③ 为什么」组织。

## 1. `src/utils/geometry.ts` —— 元素几何计算（新增）

**作用**：激光笔定位需要「元素的百分比中心坐标」，本文件把原项目 lib/utils/geometry.ts 的纯函数搬进来。

| 方法 | 做什么 |
|---|---|
| `getElementPercentageGeometry(element, viewportSize=1000)` | left/top/width/height（1000×562.5 逻辑坐标）→ 0-100 百分比 + 中心点；line 无 height 返回 null |
| `findElementGeometry(scene, elementId, viewportSize)` | 按场景/元素 id 查几何（兼容新旧场景结构） |
| `findNearestCorner(geometry)` | 距中心最近的画布角落（0-100） |

## 2. `src/utils/line-path.ts` —— 线条 SVG 路径（新增）

`getLineElementPath(element)`：按 start/end 生成 d 属性，分支：直线 / 单折线(broken) / 双折线(broken2，按横向/纵向跨度) / 二次曲线(curve) / 三次曲线(cubic)。对照原 lib/utils/element.ts，注释已翻译为中文。

## 3. `src/components/scenes/slide/elements/LineElement.vue` —— 线条元素（新增）

**作用**：渲染四类元素中的 line。要点：
- svg 尺寸 = |start-end| 差值（最小 24）；
- `width` 字段 = 线宽（不是元素宽度）——易踩坑点；
- 虚线/点线 dasharray 规则与原项目一致；
- 端点 marker（arrow/dot），id 格式 `${id}-${type}-${position}` 与原文一致；
- 阴影 drop-shadow。

## 4. `src/components/scenes/slide/LaserOverlay.vue` —— 激光笔（CSS 简化）

**作用**：读取 canvas store 的激光目标 → 计算中心点 → 渲染激光笔。CSS 简化（不装 motion）：
- 飞入：中心 >50 从 105、否则从 -5（与 laser.v1 描述符一致），500ms cubic-bezier(0.22,1,0.36,1)；
- 光圈：scale 1→2.8、opacity 0.6→0、1500ms 无限脉冲；
- 光晕：`0 0 8px 2px {color}60`；
- 生命周期：ActionEngine 5s 后 clearAllEffects → store 清空 → 自动消失。

## 5. `src/core/action/engine.ts` —— 恢复 laser 执行

| 方法 | 做什么 |
|---|---|
| `execute()` | switch 增加 `case 'laser'` → executeLaser；silent 模式跳过 laser |
| `executeLaser(action)` | `setLaser(elementId, { color: action.color ?? '#ff0000' })` + scheduleEffectClear |

## 6. `src/components/scenes/slide/ScreenElement.vue` —— 元素分发收敛四类

移除 latex/fallback 分支，仅 text / shape / line / image 四类分发。

## 7. `src/types/dsl/slides.ts` —— 类型收敛四类

PPTElement union = text | shape | line | image；删除 latex/chart/table/video/audio/code 类型及辅助类型；ElementTypes 收敛四项。详见 PHASE-4.1.md 删除记录表。

## 8. `mock/classroom.ts` —— 数据调整

- 移除 latex 元素（eq_1），新增 line 箭头元素；
- slide 场景动作补充 laser（scene1：spotlight 后 laser 标题；scene4：laser 总结文字）。

## 9. 测试

- `geometry.test.ts`：百分比几何/新老格式/最近角落（6 用例）；
- `line-path.test.ts`：5 个分支（5 用例）；
- `playback-engine.test.ts`：新增 laser 火速动作用例；
- `client.test.ts`：动作白名单更新为 speech/spotlight/laser。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-11 | 初版：依据 Phase 4.1 完成后的讲解整理输出 |
