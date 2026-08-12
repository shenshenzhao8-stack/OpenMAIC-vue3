<!--
  文件头：首页（课堂入口）
  对应原项目：app/page.tsx（裁剪后仅作为课堂入口，无生成功能）
  功能：从接口层获取 mock 课堂列表，点击进入课堂播放页。
  Phase 2 起列表来自 mock（src/api/client.ts 的 listClassrooms）。
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listClassrooms, type ClassroomSummary } from '#/api/client'

// 课堂列表（mock 数据，加载中为空）
const classrooms = ref<ClassroomSummary[]>([])
// 加载状态
const loading = ref(true)
// 加载失败信息
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    classrooms.value = await listClassrooms()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <h1>OpenMAIC · Vue3</h1>
    <p>主业务为课堂播放：slide / quiz / interactive 三种场景 + 语音讲解 + 聚光 + 学生问答。</p>

    <!-- 加载中 -->
    <p v-if="loading">加载课堂列表中…</p>
    <!-- 错误态 -->
    <p v-else-if="error" class="error">{{ error }}</p>

    <!-- 课堂列表 -->
    <ul v-else class="classroom-list">
      <li v-for="item in classrooms" :key="item.id">
        <router-link :to="`/classroom/${item.id}`">
          <strong>{{ item.name }}</strong>
          <span class="desc">{{ item.description }}</span>
          <span class="meta">共 {{ item.scenesCount }} 个场景</span>
        </router-link>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}
.classroom-list {
  list-style: none;
  padding: 0;
  margin-top: 1rem;
}
.classroom-list li {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}
.classroom-list a {
  display: block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
}
.classroom-list strong {
  display: block;
  font-size: 1.05rem;
  color: #1e3a8a;
}
.desc {
  display: block;
  margin-top: 0.25rem;
  color: #475569;
  font-size: 0.9rem;
}
.meta {
  display: block;
  margin-top: 0.25rem;
  color: #94a3b8;
  font-size: 0.8rem;
}
.error {
  color: #b91c1c;
}
</style>
