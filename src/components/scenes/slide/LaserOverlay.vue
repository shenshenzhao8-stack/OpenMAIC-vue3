<!--
  文件头：激光笔遮罩（CSS 简化版）
  对应原项目：components/slide-renderer/Editor/LaserOverlay.tsx（motion/react + laser.v1 描述符）
  功能：当 canvas store 有激光目标时，从「最近角落（中心>50 则从 105，否则从 -5）」飞入
  到元素中心，带光圈脉冲与中心光晕；5 秒后由 ActionEngine 清除 store 自动消失。
  简化说明（用户确认）：不引入 motion 依赖，用 CSS transition/keyframes 复刻
  laser.v1 描述符的核心观感（飞入曲线 0.22,1,0.36,1、光圈 1→2.8、光晕 0 0 8px 2px color60）。
-->

<template>
  <div v-if="geometry" class="laser-overlay">
    <div class="laser-dot" :style="dotStyle">
      <span class="ring" :style="ringStyle" />
      <span class="core" :style="coreStyle" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { useScene } from '#/composables/useScene';
import { useCanvasStore } from '#/stores/canvas';
import { findElementGeometry } from '#/utils/geometry';

const canvasStore = useCanvasStore();
const { scene } = useScene();

// 当前激光目标元素的百分比几何（中心点）
const geometry = computed(() => {
  const id = canvasStore.laserElementId;
  if (!id || scene.value?.type !== 'slide') return null;
  return findElementGeometry(
    { type: 'slide', content: { canvas: { elements: scene.value.content.canvas.elements } } },
    id,
    scene.value.content.canvas.viewportSize ?? 1000,
  );
});

// 颜色：store 默认 #ff0000（与原项目一致）
const color = computed(() => canvasStore.laserOptions?.color ?? '#ff0000');

// 飞入起点：中心 > 50 → 从 105（画布外右侧/下方）飞入，否则从 -5（左侧/上方）——与原描述符一致
const startX = computed(() => (geometry.value && geometry.value.centerX > 50 ? 105 : -5));
const startY = computed(() => (geometry.value && geometry.value.centerY > 50 ? 105 : -5));

// 是否已飞入（进入后切换 left/top/opacity 触发 CSS 过渡）
const entered = ref(false);
watch(
  () => canvasStore.laserElementId,
  async () => {
    entered.value = false;
    await nextTick();
    requestAnimationFrame(() => {
      entered.value = true;
    });
  },
  { immediate: true },
);

const dotStyle = computed(() => ({
  left: `${entered.value && geometry.value ? geometry.value.centerX : startX.value}%`,
  top: `${entered.value && geometry.value ? geometry.value.centerY : startY.value}%`,
  opacity: entered.value ? 1 : 0,
  transition: 'left 500ms cubic-bezier(0.22,1,0.36,1), top 500ms cubic-bezier(0.22,1,0.36,1), opacity 150ms ease-out',
}));

const ringStyle = computed(() => ({ borderColor: color.value }));
const coreStyle = computed(() => ({
  background: color.value,
  boxShadow: `0 0 8px 2px ${color.value}60`,
}));
</script>
<style scoped>
.laser-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.laser-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%); /* 以目标为中心 */
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 1px solid;
  animation: laser-ring 1.5s ease-out infinite;
}

.core {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
}

@keyframes laser-ring {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  100% {
    transform: scale(2.8);
    opacity: 0;
  }
}
</style>
