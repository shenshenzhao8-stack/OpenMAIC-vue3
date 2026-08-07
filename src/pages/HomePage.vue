<!--
  文件头：首页（课堂入口，Phase 0 占位）
  对应原项目：app/page.tsx（裁剪后仅作为课堂入口，不再承担生成功能）

  范围变更：项目不需要生成页 / 生成预览页，主业务在课堂播放；
  课堂数据由 mock 提供（Phase 2 建立 mock/classroom.ts）。
  点击下方入口进入示例课堂播放页。
-->
<script setup lang="ts">
// Phase 0 暂无逻辑，仅作为课堂入口占位
</script>

<template>
  <main class="page">
    <h1>OpenMAIC · Vue3</h1>
    <p>主业务为课堂播放：slide / quiz / interactive 三种场景 + 语音讲解 + 聚光 + 学生提问互动。</p>
    <router-link to="/classroom/demo">进入示例课堂（占位）</router-link>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}
.page a {
  display: block;
  margin-top: 0.5rem;
}
</style>
