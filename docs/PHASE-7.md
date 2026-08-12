# Phase 7 完成说明：语音文字同步

> 本文件依据 AGENTS.md 规则二（每阶段完成后对照原项目源码讲解）编写。

## 当前有效范围（沿用）

- 教学动作：speech + spotlight + laser；
- 语音：AudioPlayer 播后台音频；无音频时朗读计时 / 浏览器 TTS 兜底（T-01 后台音频未确认前保留）；
- 字幕：逐字揭示（StreamBuffer 打字机）；
- 互动：登录用户 ↔ 老师多轮一问一答（Phase 8）。

## 一、阶段目标

1. 字幕逐字：onSpeechStart → StreamBuffer（打字机）逐字揭示；
2. 倍速控制：顶栏倍速切换 + AudioPlayer 实时同步；
3. 验证「音频播完才进下一句」「聚光/激光穿插」链路；
4. 记录 useDiscussionTTS 推迟决策（见下）。

## 二、文件对照表（一一对应）

| 新工程文件 | 原项目文件 | 原文件功能 | 实现方式与原因 |
|---|---|---|---|
| `src/composables/usePlaybackEngine.ts` | `components/edit/PlaybackChromeRoot.tsx` | 引擎接线 + 字幕缓冲 | **改写（Phase 7）**：onSpeechStart → StreamBuffer pushText+sealText → onTextReveal 逐字更新字幕；倍速 watch 同步 AudioPlayer |
| `src/components/stage/HeaderControls.vue` | `components/stage/header-controls.tsx` | 顶栏控制 | **改写（Phase 7）**：新增倍速下拉框（0.75/1/1.25/1.5/2），读写 settings store |
| `src/core/buffer/stream-buffer.ts` | `lib/buffer/stream-buffer.ts` | 打字机 | **照搬（Phase 1）**，Phase 7 接入讲课字幕 |
| `src/core/audio/audio-player.ts` | `lib/utils/audio-player.ts` | 音频播放（含倍速） | **照搬（Phase 1）**，Phase 7 接倍速同步 |
| 测试：stream-buffer 讲课字幕用例 | 原项目无独立测试 | —— | **新增**：pushText+sealText 逐字揭示 |

## 三、范围决策记录：useDiscussionTTS 推迟到 Phase 8

原计划 Phase 7 改写 `lib/hooks/use-discussion-tts.ts`（问答语音队列）。
经评估（规则四：独立判断）：**useDiscussionTTS 的唯一调用方是问答 UI（Phase 8）**，
Phase 7 没有调用点，提前实现会产生无调用方的死代码；且 T-01/T-03（后台音频是否随数据/SSE 提供）
未确认，语音实现形态可能变化。故**推迟到 Phase 8**，届时与问答闭环一起实现（按 T-03 决定
「直接播后台音频」还是「TTS 队列」）。

## 四、验证结果

- `vue-tsc --noEmit`：通过；
- `npm run test`（vitest）：13 个测试文件 / 53 个用例全部通过（新增讲课字幕逐字 1 用例）；
- `npm run build`：通过（124 modules）。

## 五、范围变更记录

无新范围变更。决策记录：useDiscussionTTS 推迟至 Phase 8（见第三节）。

## 六、红线自检

本阶段全部文件注释为中文业务讲解；无英文叙述性注释。

## 七、问题修复记录（2026-08-12）

### 问题 1：暂停后继续总是从 speech 开头重播

**现象**：播放中点暂停 → 继续，当前句从头重播，而非从暂停处续播。

**根因（对照原项目）**：
- 原项目真实数据下，每个 speech 动作带**预生成音频**（`audioUrl`），播放走
  HTMLAudioElement：暂停 = `audio.pause()`，恢复 = `audio.play()` → **精确续播**；
- 我们的 mock speech **没有音频**，播放落到兜底路径：
  - 浏览器 TTS（Web Speech API）无 seek 能力，暂停是「cancel + 保存剩余句段」，
    恢复只能从**当前句开头**重讲（原项目无音频时同样如此）；
  - 朗读计时同理，暂停保存剩余毫秒、恢复重排——按句粒度。
- 结论：不是引擎 bug，是**数据差异**（mock 缺音频 → 走了与原项目不同的路径）。

**修复**：`client.getClassroom()` 加载时为每个 speech 动作填充**模拟音频**
（静音 WAV，时长按文本长度估算，`mockSynthesizeTts`），模拟「后台自带音频」。
播放走 HTMLAudioElement 主路径 → 暂停/恢复**精确续播**，与原项目一致。
（符合 T-01 方向：后台数据自带音频；真实后端接入时直接使用其 audioUrl。）

**残留行为（记录）**：若某句确无音频（后台数据缺音频），兜底路径行为与原文案一致
（浏览器 TTS/朗读计时按句重讲）——这是数据驱动差异，非回归。

### 问题 2：一旦开始播放就从头到尾一直播放（原项目不自动连播）

**现象**：点播放后，引擎自动播完所有场景（自动翻页连播）。

**根因（对照原项目）**：
- 原项目 `PlaybackChromeRoot.tsx` 创建引擎时传 **`[currentScene]`（当前场景单例数组）**：
  每节课（场景）**独立播放**，当前场景 actions 播完即 `onComplete` 停止；
  切场景由 UI（侧边栏/导航）驱动，进入新场景后为该场景新建引擎播放；
- 我们创建引擎时传的是**全部 scenes**，引擎游标按多场景自动推进 → 连播整堂课。

**修复**：`usePlaybackEngine` 改为**按当前场景**创建/重建引擎
（`getSceneForPlayback(scenes, currentSceneId)` 返回 `[currentScene]`）；
- `watch(currentSceneId)` → 销毁旧引擎（`teardownEngine`），新场景从头播放；
- 当前场景播完自动停（mode=idle），不会连播下一场景；
- 手动翻页（nextScene/prevScene）切 currentSceneId → 重建引擎（与原项目"进新场景重新播"一致）；
- 移除了单场景引擎下的 `onSceneChange` 回调（避免自触发 teardown）。

**验证**：新增测试 3 个（getSceneForPlayback 单例/空数组、speech 模拟音频断言）；
vitest 13 文件 / 56 用例全过；build 通过。

### 影响范围

| 文件 | 变更 |
|---|---|
| `src/api/client.ts` | getClassroom 为 speech 填充模拟音频（问题 1） |
| `src/composables/usePlaybackEngine.ts` | 按当前场景建引擎 + teardown/watch（问题 2） |
| `src/utils/playback-navigation.ts` | 新增 getSceneForPlayback（问题 2 支撑） |
| 测试 | playback-navigation、client 各新增用例 |

### 问题 1 修复方式更新（2026-08-12 · 二）

用户提供了真实语音 mp3（按动作 id 命名：a1/a4/b1/c1/d1.mp3），替代「前端生成模拟音频」方案：

1. **mp3 放置**：`mock/*.mp3` → `public/audio/`（Vite 静态服务目录，URL 为 `/audio/<id>.mp3`）；
2. **mock 数据**：每个 speech 动作直接写入 `audioUrl: '/audio/<id>.mp3'`（后台自带音频方向的 mock 落地）；
3. **删除 TTS mock**：`src/api/mock/tts.ts` 与 `client.synthesizeTts` / `TtsResult` 全部移除；
4. **附带修复**：d1 动作的 `text` 字段曾被误填为文件路径，已恢复为讲解文本
   「总结一下：光反应在类囊体薄膜，暗反应在基质。」；
5. 播放/暂停/恢复继续走 HTMLAudioElement 精确续播（问题 1 修复目标不变）。

影响：`client.getClassroom()` 不再生成音频，只浅拷贝动作（audioUrl 来自 mock 数据）。
