<!--
  文件头：交互 iframe 全局宿主（InteractiveIframeHost）
  对应原项目：components/scene-renderers/InteractiveIframeHost.tsx
  功能：真正的 iframe 统一由本组件渲染（Teleport 到 body/全屏元素）：
    - 按保活池里占位上报的矩形，用 position: fixed 精确覆盖；
    - 切页只改可见性（visibility），不卸载 → 回来零刷新恢复；
    - sandbox 故意不加 allow-same-origin（隔离房间：AI 生成的 HTML 碰不到宿主状态）；
    - 卸载（切换课堂）时清空保活池，防止旧课堂 iframe 残留。

  修复记录（2026-08-11）：Teleport 目标初始为 null 会导致「insertBefore null」报错——
  初始直接指向 document.body，并给 Teleport 加 v-if 兜底（目标为 null 时不挂载）。
-->

<template>
  <!-- v-if 兜底：目标为 null 时不挂载 Teleport（修复 insertBefore null 报错） -->
  <teleport v-if="portalTarget" :to="portalTarget">
    <iframe
      v-for="(entry, sceneId) in pool.entries"
      :key="sceneId"
      :srcdoc="entry.srcDoc"
      :src="entry.srcDoc ? undefined : entry.src"
      sandbox="allow-scripts allow-forms allow-popups"
      class="interactive-iframe"
      :style="iframeStyle(entry, String(sceneId))"
      :title="`交互场景 ${sceneId}`"
    />
  </teleport>
</template>
<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { IframePoolEntry } from '#/stores/interactive-iframe-pool';
import { useInteractiveIframePool } from '#/stores/interactive-iframe-pool';

const pool = useInteractiveIframePool();

/**
 * Teleport 目标：全屏元素优先（演示模式全屏舞台），否则 body。
 * 初始即为 document.body，避免 Teleport 以 null 目标挂载导致 insertBefore 报错。
 */
const portalTarget = ref<Element | null>(typeof document !== 'undefined' ? document.body : null);
function syncPortal() {
  portalTarget.value = document.fullscreenElement ?? document.body;
}

onMounted(() => {
  syncPortal();
  document.addEventListener('fullscreenchange', syncPortal);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncPortal);
  // 切换课堂时清空保活池，避免残留上一个课堂的 iframe
  pool.reset();
});

/** 计算 iframe 样式：按 rect 定位，仅当前场景且被认领时可见 */
function iframeStyle(entry: IframePoolEntry, sceneId: string): CSSProperties {
  const rect = entry.rect;
  const shown =
    entry.owner !== null && sceneId === pool.activeSceneId && rect !== null && rect.width > 0 && rect.height > 0;
  return {
    position: 'fixed',
    left: `${rect?.left ?? 0}px`,
    top: `${rect?.top ?? 0}px`,
    width: `${rect?.width ?? 0}px`,
    height: `${rect?.height ?? 0}px`,
    border: 0,
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 1,
    // visibility（而非 display）：display:none 在重新显示时可能丢弃文档
    visibility: shown ? 'visible' : 'hidden',
    pointerEvents: (shown ? 'auto' : 'none') as CSSProperties['pointerEvents'],
  };
}
</script>
<style scoped>
.interactive-iframe {
  pointer-events: auto;
}
</style>
