<!--
  文件头：场景侧边栏
  对应原项目：components/stage/scene-sidebar.tsx（简化版：去掉缩略图/拖拽/生成中占位）
  功能：展示全部场景列表（序号 + 类型标签 + 标题），点击切换当前场景。
  点击行为与原项目一致：调用 stage store 的 setCurrentSceneId（翻页唯一入口）。
-->
<script setup lang="ts">
import { useStageStore } from '@/stores/stage'

const stageStore = useStageStore()

/** 场景类型中文标签（展示用） */
const sceneTypeLabel: Record<string, string> = {
  slide: '幻灯片',
  quiz: '测验',
  interactive: '交互',
}
</script>

<template>
  <aside class="scene-sidebar">
    <h3 class="title">场景列表</h3>
    <ul>
      <li
        v-for="(scene, index) in stageStore.scenes"
        :key="scene.id"
        :class="{ active: scene.id === stageStore.currentSceneId }"
        @click="stageStore.setCurrentSceneId(scene.id)"
      >
        <span class="index">{{ index + 1 }}</span>
        <span class="tag">{{ sceneTypeLabel[scene.type] ?? scene.type }}</span>
        <span class="scene-title">{{ scene.title }}</span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.scene-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.75rem;
  overflow-y: auto;
}
.title {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0 0 0.5rem;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 0.3rem;
}
li:hover {
  background: #f1f5f9;
}
li.active {
  background: #eff6ff;
  outline: 1px solid #bfdbfe;
}
.index {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
li.active .index {
  background: #2563eb;
  color: #fff;
}
.tag {
  font-size: 0.7rem;
  background: #e2e8f0;
  border-radius: 4px;
  padding: 0 0.3rem;
  flex-shrink: 0;
}
.scene-title {
  font-size: 0.85rem;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
