<!--
  文件头：课堂播放页（课堂外壳）
  对应原项目：app/classroom/[id]/page.tsx（加载课堂）+ components/stage.tsx（舞台根）+ PlaybackChromeRoot（引擎接线）
  功能（Phase 3）：
    1. 加载 mock 课堂数据并写入 stage store；
    2. 课堂外壳：顶栏（课程信息 + 播放控制）、侧边栏（场景列表）、主区（场景渲染分发）；
    3. 播放引擎接线：usePlaybackEngine（播放/暂停/翻页/字幕）。
  说明：场景渲染当前为占位（Phase 4/5/6 替换）；互动（学生提问）在 Phase 8 接入。
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStageStore } from '@/stores/stage'
import { getClassroom } from '@/api/client'
import { getFirstSceneId } from '@/utils/playback-navigation'
import { usePlaybackEngine } from '@/composables/usePlaybackEngine'
import HeaderControls from '@/components/stage/HeaderControls.vue'
import SceneSidebar from '@/components/stage/SceneSidebar.vue'
import SceneProvider from '@/components/stage/SceneProvider.vue'
import SceneRenderer from '@/components/stage/SceneRenderer.vue'

const route = useRoute()
const stageStore = useStageStore()

// 播放引擎接线（引擎实例唯一，控制按钮与字幕共用）
const { mode, lectureSpeech, play, pause, resume, stop, nextScene, prevScene } =
  usePlaybackEngine()

// 加载状态
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const classroomId = String(route.params.id)
    const { stage, scenes } = await getClassroom(classroomId)
    stageStore.setStage(stage)
    stageStore.setScenes(scenes)
    // 默认进入第一页
    stageStore.setCurrentSceneId(getFirstSceneId(scenes))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="classroom">
    <!-- 加载中 -->
    <p v-if="loading" class="status">课堂加载中…</p>
    <!-- 错误态 -->
    <p v-else-if="error" class="status error">{{ error }}</p>

    <template v-else>
      <!-- 顶栏：课程信息 + 播放控制 -->
      <header class="topbar">
        <div class="course">
          <h1>{{ stageStore.stage?.name }}</h1>
          <p>{{ stageStore.stage?.description }}</p>
        </div>
        <HeaderControls
          :mode="mode"
          :on-play="play"
          :on-pause="pause"
          :on-resume="resume"
          :on-stop="stop"
          :on-next="nextScene"
          :on-prev="prevScene"
        />
      </header>

      <!-- 舞台区：侧边栏 + 场景渲染 -->
      <div class="stage-body">
        <SceneSidebar />
        <section class="stage-main">
          <SceneProvider>
            <SceneRenderer />
          </SceneProvider>
        </section>
      </div>

      <!-- 字幕条（引擎 onSpeechStart 驱动；Phase 7 做逐字/语音同步） -->
      <footer v-if="lectureSpeech" class="subtitle-bar">
        {{ lectureSpeech }}
      </footer>
    </template>
  </main>
</template>

<style scoped>
.classroom {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.status {
  margin: auto;
  color: #64748b;
}
.status.error {
  color: #b91c1c;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}
.course h1 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e3a8a;
}
.course p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}
.stage-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.stage-main {
  flex: 1;
  min-width: 0;
  display: flex;
  background: #f1f5f9;
}
.subtitle-bar {
  padding: 0.6rem 1.25rem;
  background: #1e293b;
  color: #f8fafc;
  font-size: 0.95rem;
}
</style>
