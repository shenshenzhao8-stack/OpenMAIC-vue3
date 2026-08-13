<!--
  文件头：课堂顶栏控制
  对应原项目：components/stage/header-controls.tsx（简化版：仅保留播放控制 + 倍速）
              + components/edit/PlaybackChromeRoot.tsx（进度：currentActionIndex /
              totalActions / jumpToAction，Phase 9 T-19 补回）
  功能：播放 / 暂停 / 继续 / 停止 + 上一页 / 下一页 + 倍速下拉框 + 引擎状态展示 +
        动作进度条（按动作数分格，点击跳转）。
  按钮行为由 ClassroomPage 通过 props 注入（引擎实例唯一）；倍速用下拉框选择，
  写入 settings store（引擎/AudioPlayer 实时生效）。
-->

<template>
  <div class="header-controls">
    <button type="button" class="btn" title="上一页" @click="onPrev">←</button>
    <button v-if="mode === 'idle'" type="button" class="btn primary" @click="onPlay">播放</button>
    <button v-else-if="mode === 'playing'" type="button" class="btn primary" @click="onPause">暂停</button>
    <button v-else-if="mode === 'paused'" type="button" class="btn primary" @click="onResume">继续</button>
    <button v-else type="button" class="btn" disabled>{{ mode }}</button>
    <button v-if="mode !== 'idle'" type="button" class="btn" @click="onStop">停止</button>
    <!-- 动作进度条（T-19）：按动作数分格，已播格高亮，点击跳转 -->
    <div v-if="totalActions > 0" class="progress-area" title="点击进度格跳转到对应动作">
      <div class="progress-track">
        <span
          v-for="i in totalActions"
          :key="i"
          class="progress-seg"
          :class="{ done: (currentActionIndex ?? -1) >= i - 1 }"
          @click="onSeek(i - 1)"
        />
      </div>
      <span class="progress-label">
        {{ currentActionIndex === null ? 0 : currentActionIndex + 1 }} / {{ totalActions }}
      </span>
    </div>
    <!-- 倍速下拉框 -->
    <label class="speed-label">
      倍速
      <select class="speed-select" :value="settings.playbackSpeed" @change="handleSpeedChange">
        <option v-for="s in SPEED_OPTIONS" :key="s" :value="s">×{{ s }}</option>
      </select>
    </label>
    <button type="button" class="btn" title="下一页" @click="onNext">→</button>
    <span class="mode-badge">状态：{{ mode }}</span>
  </div>
</template>
<script setup lang="ts">
import type { EngineMode } from '#/core/playback/types';
import { useSettingsStore } from '#/stores/settings';

defineProps<{
  mode: EngineMode;
  /** 当前动作游标（进度条已播格数） */
  currentActionIndex: number | null;
  /** 当前场景动作总数（进度条分格数） */
  totalActions: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  /** 点击进度格跳转到指定动作 */
  onSeek: (actionIndex: number) => void;
}>();

const settings = useSettingsStore();

/** 可选倍速档位 */
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

/** 下拉框选择倍速 → 写入 settings（引擎/AudioPlayer 实时生效） */
function handleSpeedChange(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  settings.setPlaybackSpeed(value);
}
</script>
<style scoped>
.header-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn:hover {
  background: #f1f5f9;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn.primary:hover {
  background: #1d4ed8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.speed-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #475569;
}

.speed-select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.3rem 0.4rem;
  font-size: 0.85rem;
  background: #fff;
  cursor: pointer;
}

.progress-area {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.progress-track {
  display: flex;
  gap: 2px;
}

.progress-seg {
  width: 8px;
  height: 10px;
  border-radius: 2px;
  background: #e2e8f0;
  cursor: pointer;
  transition: background 120ms ease;
}

.progress-seg.done {
  background: #2563eb;
}

.progress-seg:hover {
  background: #93c5fd;
}

.progress-label {
  font-size: 0.72rem;
  color: #64748b;
  white-space: nowrap;
}

.mode-badge {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.4rem;
}
</style>
