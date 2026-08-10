<!--
  文件头：交互场景渲染器（占位）
  对应原项目：components/scene-renderers/interactive-renderer.tsx + InteractiveIframeHost.tsx
  功能：Phase 6 将实现「iframe 安全渲染 + 保活池」；
  当前仅展示交互页存在，保证分发链路可用。
-->
<script setup lang="ts">
import type { Scene } from '@/types/stage'

defineProps<{ scene: Scene | null }>()
</script>

<template>
  <div class="interactive-placeholder">
    <h2>{{ scene?.title }}</h2>
    <p>交互场景渲染将在 Phase 6 实现（iframe + 保活池）。</p>
  </div>
</template>

<style scoped>
.interactive-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #475569;
}
</style>
