<!--
  文件头：场景数据提供者（SceneProvider）
  对应原项目：lib/contexts/scene-context.tsx 的 SceneProvider
  功能：从 stage store 取出「当前场景」（currentSceneId → scenes），
  通过 provide 提供给场景渲染子树；子组件用 useScene() 注入。
-->
<script setup lang="ts">
import { computed, provide } from 'vue'
import { useStageStore } from '@/stores/stage'
import { SceneKey } from '@/hooks/useScene'

const stageStore = useStageStore()

// 当前场景：由 currentSceneId 派生（翻页的唯一真相源在 stage store）
const scene = computed(() => stageStore.currentScene)

// 提供给子树
provide(SceneKey, { scene })
</script>

<template>
  <slot />
</template>
