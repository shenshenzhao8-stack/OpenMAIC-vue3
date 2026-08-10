<!--
  文件头：课堂顶栏控制
  对应原项目：components/stage/header-controls.tsx（简化版：去掉导出/设置/主题等，仅保留播放控制）
  功能：播放 / 暂停 / 继续 / 停止 + 上一页 / 下一页 + 当前引擎状态展示。
  按钮行为由 ClassroomPage 通过 props 注入（引擎实例唯一，避免多处创建）。
-->
<script setup lang="ts">
import type { EngineMode } from '@/core/playback/types'

defineProps<{
  mode: EngineMode
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onNext: () => void
  onPrev: () => void
}>()
</script>

<template>
  <div class="header-controls">
    <button type="button" class="btn" title="上一页" @click="onPrev">←</button>
    <button v-if="mode === 'idle'" type="button" class="btn primary" @click="onPlay">播放</button>
    <button v-else-if="mode === 'playing'" type="button" class="btn primary" @click="onPause">暂停</button>
    <button v-else-if="mode === 'paused'" type="button" class="btn primary" @click="onResume">继续</button>
    <button v-else type="button" class="btn" disabled>{{ mode }}</button>
    <button v-if="mode !== 'idle'" type="button" class="btn" @click="onStop">停止</button>
    <button type="button" class="btn" title="下一页" @click="onNext">→</button>
    <span class="mode-badge">状态：{{ mode }}</span>
  </div>
</template>

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
.mode-badge {
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.4rem;
}
</style>
