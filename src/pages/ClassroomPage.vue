<!--
  文件头：课堂播放页（Phase 0 占位）
  对应原项目：app/classroom/[id]/page.tsx
  功能：Phase 0 仅作为路由占位，展示路由参数 classroomId；
        Phase 3-8 将实现：课堂加载、播放引擎接线、slide/quiz/interactive 渲染、
        语音文字同步、学生提问互动。
-->
<script setup lang="ts">
import { useRoute } from 'vue-router'

// 读取路由参数：/classroom/:id 中的 id（对应原项目 useParams() 的 classroomId）
const route = useRoute()
</script>

<template>
  <main class="page">
    <h1>课堂播放（占位）</h1>
    <p>classroomId：{{ route.params.id }}</p>
    <router-link to="/">返回首页</router-link>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
