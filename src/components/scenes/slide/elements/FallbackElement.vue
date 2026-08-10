<!--
  文件头：未实现元素类型占位
  说明：chart/table/line/video/code 等元素渲染留待后续补充（TODO T-05 及渲染扩展），
  当前显示类型标签，保证布局不塌。
-->
<script setup lang="ts">
import type { PPTElement } from '@/types/dsl'

defineProps<{ element: PPTElement }>()
</script>

<template>
  <div class="element-content fallback-element">
    <span>{{ element.type }}（渲染待实现）</span>
  </div>
</template>

<style scoped>
.fallback-element {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
  border: 1px dashed #cbd5e1;
}
</style>
