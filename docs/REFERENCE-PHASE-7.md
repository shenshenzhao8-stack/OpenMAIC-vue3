# Phase 7 工作参考手册（逐文件 / 逐方法业务讲解）

> 依据 AGENTS.md 规则二第 6 条输出，供用户阅读与审阅。

## 1. `src/composables/usePlaybackEngine.ts` —— 播放引擎接线（Phase 7 改造）

**作用**：把纯 TS 引擎接到 Vue，并新增「字幕逐字 + 倍速同步」。

| 部分 | 做什么 | 为什么 |
|---|---|---|
| `subtitleBuffer`（StreamBuffer） | 字幕打字机：pushText + sealText → tick 逐字揭示 → onTextReveal 更新 lectureSpeech | 字幕逐字效果的唯一来源 |
| `onSpeechStart(text)` | pushText(lecture-N, text) + sealText | 一句开始即入队并封口，逐字揭示 |
| `onSpeechEnd` | 不清空字幕 | 与原文案一致：保留到下一句替换 |
| watch playbackSpeed | `audioPlayer.setPlaybackRate(rate)` | 倍速实时生效（播放中立即变） |
| 卸载清理 | stop + buffer.dispose + audioPlayer.destroy | 防定时器/音频泄漏 |

## 2. `src/components/stage/HeaderControls.vue` —— 顶栏控制（倍速）

| 部分 | 做什么 |
|---|---|
| `SPEED_OPTIONS` | [0.75, 1, 1.25, 1.5, 2] 可选档位 |
| `onSpeedChange(event)` | 下拉框选择并写入 settings store（引擎/AudioPlayer 实时生效） |

倍速链路：HeaderControls → settings.playbackSpeed → usePlaybackEngine watch → AudioPlayer.playbackRate；
引擎的朗读计时/浏览器 TTS 也通过 `getPlaybackSpeed` 读取同一值（与原项目一致）。

## 3. `src/core/buffer/stream-buffer.ts` —— 打字机（Phase 1 照搬，Phase 7 接入）

讲课字幕与问答共用同一打字机：本阶段只用 pushText/sealText/onTextReveal 三个能力；
agent/done 等回调 no-op（问答链路 Phase 8 启用）。

## 4. 测试

`stream-buffer.test.ts` 新增「讲课字幕逐字揭示」：pushText+sealText → 4 个字符逐字揭示到完整。

## 更新记录

| 日期 | 内容 |
|---|---|
| 2026-08-12 | 初版：依据 Phase 7 完成后的讲解整理输出 |

| 日期 | 内容 |
|---|---|
| 2026-08-12 | 问题修复记录：① mock speech 填充模拟音频 → 暂停/恢复精确续播；② 引擎改为按当前场景播放（[currentScene]），不再自动连播。详见 PHASE-7.md 第七节 |

| 日期 | 内容 |
|---|---|
| 2026-08-12（二） | mock 音频改为用户提供的真实 mp3（public/audio + 按 id 填 audioUrl）；删除 TTS mock（mock/tts.ts、client.synthesizeTts）；修复 d1 误填文本 |
