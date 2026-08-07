<!--
  文件头：课堂播放页
  对应原项目：app/classroom/[id]/page.tsx（课堂加载逻辑的简化版）
  功能（Phase 2）：
    1. 进入页面后从接口层加载课堂数据（getClassroom）；
    2. 写入 stage store（stage + scenes + currentSceneId）；
    3. 展示课程信息与场景列表（当前场景的类型/标题/动作清单）。
  说明：真正的场景渲染（幻灯片/测验/交互）在 Phase 3-6 实现，
  本页目前用「数据展示占位」证明课堂数据链路已通。
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStageStore } from '@/stores/stage'
import { getClassroom } from '@/api/client'

const route = useRoute()
const stageStore = useStageStore()

// 加载状态
const loading = ref(true)
// 加载失败信息
const error = ref<string | null>(null)

// 当前场景（由 store 派生：currentSceneId → scenes）
const currentScene = computed(() => stageStore.currentScene)

/** 场景类型的中文标签（展示用） */
const sceneTypeLabel: Record<string, string> = {
  slide: '幻灯片',
  quiz: '测验',
  interactive: '交互实验',
}

/** 把一条动作转成可读描述（展示用；Phase 3 起由渲染器真正执行） */
function actionText(action: { type: string; text?: string; elementId?: string }): string {
  if (action.type === 'speech') return `讲解：${action.text ?? ''}`
  if (action.type === 'spotlight') return `聚光 → 元素 ${action.elementId ?? ''}`
  return action.type
}

onMounted(async () => {
  try {
    const classroomId = String(route.params.id)
    const { stage, scenes } = await getClassroom(classroomId)
    stageStore.setStage(stage)
    stageStore.setScenes(scenes)
    // 默认进入第一页
    stageStore.setCurrentSceneId(scenes[0]?.id ?? null)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <!-- 加载中 -->
    <p v-if="loading">课堂加载中…</p>
    <!-- 错误态 -->
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <!-- 课程信息 -->
      <header class="course-header">
        <h1>{{ stageStore.stage?.name }}</h1>
        <p>{{ stageStore.stage?.description }}</p>
      </header>

      <!-- 场景列表（Phase 3 起替换为真正的播放器外壳） -->
      <section class="scene-list">
        <h2>场景列表</h2>
        <ul>
          <li
            v-for="scene in stageStore.scenes"
            :key="scene.id"
            :class="{ active: scene.id === stageStore.currentSceneId }"
            @click="stageStore.setCurrentSceneId(scene.id)"
          >
            <span class="tag">{{ sceneTypeLabel[scene.type] ?? scene.type }}</span>
            {{ scene.order }}. {{ scene.title }}
          </li>
        </ul>
      </section>

      <!-- 当前场景数据展示（占位，Phase 3 起由 SceneRenderer 渲染） -->
      <section v-if="currentScene" class="scene-detail">
        <h2>当前场景：{{ currentScene.title }}</h2>
        <p>类型：{{ sceneTypeLabel[currentScene.type] ?? currentScene.type }}</p>
        <h3>剧本动作（{{ currentScene.actions?.length ?? 0 }} 条）</h3>
        <ol>
          <li v-for="(action, i) in currentScene.actions ?? []" :key="i">
            {{ actionText(action as { type: string; text?: string; elementId?: string }) }}
          </li>
        </ol>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 900px;
  margin: 0 auto;
}
.course-header h1 {
  color: #1e3a8a;
  margin-bottom: 0.25rem;
}
.scene-list ul {
  list-style: none;
  padding: 0;
}
.scene-list li {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  cursor: pointer;
}
.scene-list li.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.tag {
  display: inline-block;
  font-size: 0.75rem;
  background: #e2e8f0;
  border-radius: 4px;
  padding: 0 0.35rem;
  margin-right: 0.5rem;
}
.scene-detail {
  margin-top: 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1rem;
}
.error {
  color: #b91c1c;
}
</style>
