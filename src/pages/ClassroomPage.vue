<!--
  文件头：课堂播放页（课堂外壳）
  对应原项目：app/classroom/[id]/page.tsx（加载课堂）+ components/stage.tsx（舞台根）+ PlaybackChromeRoot（引擎接线）
  功能（Phase 3-8）：
    1. 加载 mock 课堂数据并写入 stage store；
    2. 课堂外壳：顶栏（课程信息 + 播放控制）、侧边栏（场景列表）、主区（场景渲染）、问答面板；
    3. 播放引擎接线 + 打断/恢复（Phase 8）：学生提问 → interrupt（保存位置进 live）→ 老师回答
       → 点「继续讲课」→ endDiscussion（恢复位置）；
    4. 全局挂载 InteractiveIframeHost（交互 iframe 保活）。
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStageStore } from '@/stores/stage'
import { getClassroom } from '@/api/client'
import { getFirstSceneId } from '@/utils/playback-navigation'
import { usePlaybackEngine } from '@/composables/usePlaybackEngine'
import { useChatSession } from '@/composables/useChatSession'
import HeaderControls from '@/components/stage/HeaderControls.vue'
import SceneSidebar from '@/components/stage/SceneSidebar.vue'
import SceneProvider from '@/components/stage/SceneProvider.vue'
import SceneRenderer from '@/components/stage/SceneRenderer.vue'
import InteractiveIframeHost from '@/components/scenes/interactive/InteractiveIframeHost.vue'
import ChatArea from '@/components/chat/ChatArea.vue'

const route = useRoute()
const stageStore = useStageStore()

// 播放引擎接线（引擎实例唯一，控制按钮与字幕共用）
const {
  mode,
  lectureSpeech,
  isLive,
  play,
  pause,
  resume,
  stop,
  interrupt,
  endDiscussion,
  nextScene,
  prevScene,
} = usePlaybackEngine()

// 问答会话（登录用户 ↔ 老师多轮一问一答）；解构为顶层 ref 便于模板自动解包
const {
  messages: chatMessages,
  isStreaming: chatStreaming,
  speakingAgentId: chatSpeakingAgentId,
  sendMessage: chatSend,
} = useChatSession()

// 加载状态
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const classroomId = String(route.params.id)
    const { stage, scenes } = await getClassroom(classroomId)
    stageStore.setStage(stage)
    stageStore.setScenes(scenes)
    stageStore.setCurrentSceneId(getFirstSceneId(scenes))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

/** 发送提问：播放中先打断讲课（保存位置进 live），再发一轮一问一答 */
function handleSend(text: string) {
  if (mode.value === 'playing') interrupt(text)
  void chatSend(text)
}

/** 继续讲课：恢复被打断的位置 */
function handleContinue() {
  endDiscussion()
}
</script>

<template>
  <main class="classroom">
    <p v-if="loading" class="status">课堂加载中…</p>
    <p v-else-if="error" class="status error">{{ error }}</p>

    <template v-else>
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

      <div class="stage-body">
        <SceneSidebar />
        <section class="stage-main">
          <SceneProvider>
            <SceneRenderer />
          </SceneProvider>
        </section>
        <!-- 问答面板（登录用户 ↔ 老师） -->
        <ChatArea
          :messages="chatMessages"
          :is-streaming="chatStreaming"
          :is-live="isLive"
          :speaking-agent-id="chatSpeakingAgentId"
          :on-send="handleSend"
          :on-continue="handleContinue"
        />
      </div>

      <footer v-if="lectureSpeech" class="subtitle-bar">
        {{ lectureSpeech }}
      </footer>
    </template>

    <InteractiveIframeHost />
  </main>
</template>

<style scoped>
.classroom {
  height: 100%;
  overflow: hidden;
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
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}
.course {
  min-width: 0;
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
