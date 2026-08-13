<!--
  文件头：课堂播放核心组件（OpenMaicClassroom）

  对应原项目：app/classroom/[id]/page.tsx（加载课堂）+ components/stage.tsx（舞台根）
             + components/edit/PlaybackChromeRoot.tsx（引擎接线）
  对应本项目改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 1（最小课堂组件化）

  功能：
    1. 把原 ClassroomPage.vue 的课堂核心（课堂加载、播放控制、场景渲染、讲义/问答、
       interactive iframe 保活）整体抽成可独立挂载的普通 Vue 组件；
    2. 用 classroomId prop 替代 useRoute()，组件内部不依赖 vue-router，
       可被 Web 宿主直接挂载（组件测试无需安装 Router）；
    3. 监听 classroomId 变化重新加载：请求序号校验防止旧课程晚返回覆盖新课程，
       切换时停止旧播放、清空问答与语音、重置 iframe 保活池、清空舞台状态；
    4. 对外发布 load-success / load-error 事件，供宿主感知加载结果。

  范围说明：本阶段只做组件化与课程切换清理，不重写 Store / PlaybackEngine /
  composables；`@/` → `#/` 内部引用迁移已在 Phase 2 完成。
-->

<template>
  <main class="classroom">
    <p v-if="loading" class="status">课堂加载中…</p>
    <p v-else-if="error" class="status error">{{ error }}</p>

    <template v-else>
      <!-- 空态：课堂没有任何场景（mock 异常或后端空数据） -->
      <p v-if="stageStore.scenes.length === 0" class="status">该课程暂无内容</p>

      <template v-else>
        <header class="topbar">
          <div class="course">
            <h1>{{ stageStore.stage?.name }}</h1>
            <p>{{ stageStore.stage?.description }}</p>
          </div>
          <header-controls
            :mode="mode"
            :current-action-index="currentActionIndex"
            :total-actions="totalActions"
            :on-play="play"
            :on-pause="pause"
            :on-resume="resume"
            :on-stop="stop"
            :on-next="nextScene"
            :on-prev="prevScene"
            :on-seek="handleSeek"
          />
        </header>

        <div class="stage-body">
          <scene-sidebar />
          <section class="stage-main">
            <scene-provider>
              <scene-renderer />
            </scene-provider>
          </section>
          <!-- 聊天面板：讲义（默认）/ 问答双 tab -->
          <chat-area
            :messages="chatMessages"
            :is-streaming="chatStreaming"
            :is-live="isLive"
            :speaking-agent-id="chatSpeakingAgentId"
            :on-send="handleSend"
            :on-continue="handleContinue"
            :scenes="stageStore.scenes"
            :current-scene-id="stageStore.currentSceneId"
            :current-action-index="currentActionIndex"
            :can-jump-to-action="canJumpToAction"
            :on-jump-to-action="handleSeek"
          />
        </div>

        <footer v-if="lectureSpeech" class="subtitle-bar">
          {{ lectureSpeech }}
        </footer>
      </template>
    </template>

    <interactive-iframe-host />
  </main>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';

import type { ClassroomData } from '#/api/client';
import { getClassroom } from '#/api/client';
import ChatArea from '#/components/chat/ChatArea.vue';
import InteractiveIframeHost from '#/components/scenes/interactive/InteractiveIframeHost.vue';
import HeaderControls from '#/components/stage/HeaderControls.vue';
import SceneProvider from '#/components/stage/SceneProvider.vue';
import SceneRenderer from '#/components/stage/SceneRenderer.vue';
import SceneSidebar from '#/components/stage/SceneSidebar.vue';
import { useChatSession } from '#/composables/useChatSession';
import { usePlaybackEngine } from '#/composables/usePlaybackEngine';
import { clearLocalAudioCache } from '#/core/audio/audio-player';
import { useInteractiveIframePool } from '#/stores/interactive-iframe-pool';
import { useStageStore } from '#/stores/stage';
import type { OpenMaicClassroomProps } from '#/types/public';
import type { Scene } from '#/types/stage';
import { resolveAssetUrl } from '#/utils/asset';
import { getFirstSceneId } from '#/utils/playback-navigation';

/** 组件 props：课堂 id（替代路由参数，脱离 vue-router；类型来自公共契约） */
const props = defineProps<OpenMaicClassroomProps>();

/** 对外事件：加载成功返回课堂数据；加载失败返回原始错误 */
const emit = defineEmits<{
  'load-success': [data: ClassroomData];
  'load-error': [error: unknown];
}>();

const stageStore = useStageStore();
const iframePool = useInteractiveIframePool();

// 向下层组件提供 classroomId（Quiz 草稿 key 命名空间等使用，MONOREPO Phase 4）
provide('openmaicClassroomId', props.classroomId);

// 播放引擎接线（引擎实例唯一，控制按钮与字幕共用）
const {
  mode,
  lectureSpeech,
  isLive,
  currentActionIndex,
  totalActions,
  play,
  pause,
  resume,
  stop,
  jumpToAction,
  canJumpToAction,
  interrupt,
  endDiscussion,
  nextScene,
  prevScene,
} = usePlaybackEngine();

// 问答会话（登录用户 ↔ 老师多轮一问一答）
const {
  messages: chatMessages,
  isStreaming: chatStreaming,
  speakingAgentId: chatSpeakingAgentId,
  sendMessage: chatSend,
  reset: resetChat,
} = useChatSession();

// 加载状态（组件内管理，不依赖路由）
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * 请求序号：每次加载递增，异步返回后只接受「最新序号」的结果，
 * 防止旧课程的慢请求晚返回覆盖新课程（Phase 1 要求的最小防竞态方案）。
 */
let loadSeq = 0;

/**
 * 归一化场景资源：把根相对路径（/audio/*.mp3 等）按 assetBaseUrl 解析为可访问地址。
 * 只处理 speech 音频与 interactive 外部 URL；完整 URL / data URI 由 resolveAssetUrl 原样返回。
 * 在数据写入 store 前统一处理，audio-player / engine / iframe 消费方零改动。
 */
function normalizeAssets(scenes: Scene[]): Scene[] {
  return scenes.map((scene) => {
    const actions = (scene.actions ?? []).map((action) => {
      if (action.type === 'speech' && action.audioUrl) {
        return { ...action, audioUrl: resolveAssetUrl(action.audioUrl, props.assetBaseUrl) };
      }
      return action;
    });
    let content = scene.content;
    if (content.type === 'interactive' && content.url) {
      content = { ...content, url: resolveAssetUrl(content.url, props.assetBaseUrl) };
    }
    // Scene 为判别联合，展开后需显式断言（调用方保证 type/content 一致）
    return { ...scene, actions, content } as Scene;
  });
}

/** 加载课堂：清理旧状态 → 拉取数据 → 写入 stage store */
async function loadClassroom(id: string) {
  const seq = ++loadSeq;
  loading.value = true;
  error.value = null;

  // 课程切换清理：停止旧播放、清空问答与语音队列、重置 iframe 保活池、清空舞台，
  // 保证新课程从干净状态开始（不留上一课程的音频/字幕/iframe/对话残留）
  stop();
  resetChat();
  iframePool.reset();
  clearLocalAudioCache();
  stageStore.clearStore();

  try {
    const { stage, scenes } = await getClassroom(id);
    // 旧请求晚返回：直接丢弃，不覆盖新课程
    if (seq !== loadSeq) return;
    // 资源路径归一化（assetBaseUrl 适配）
    const normalizedScenes = normalizeAssets(scenes);
    stageStore.setStage(stage);
    stageStore.setScenes(normalizedScenes);
    stageStore.setCurrentSceneId(getFirstSceneId(normalizedScenes));
    emit('load-success', { stage, scenes: normalizedScenes });
  } catch (e) {
    if (seq !== loadSeq) return;
    error.value = e instanceof Error ? e.message : String(e);
    emit('load-error', e);
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

/** classroomId 变化：重新加载新课堂（同一组件实例复用，不卸载重建） */
watch(
  () => props.classroomId,
  (id) => {
    void loadClassroom(id);
  },
);

// 首次挂载加载
onMounted(() => {
  void loadClassroom(props.classroomId);
});

// 组件卸载：使未完成加载请求失效（不再写状态）、清空模块级音频缓存
onBeforeUnmount(() => {
  loadSeq += 1;
  clearLocalAudioCache();
});

/** 发送提问：播放中先打断讲课（保存位置进 live），再发一轮一问一答 */
function handleSend(text: string) {
  if (mode.value === 'playing') interrupt(text);
  void chatSend(text);
}

/** 继续讲课：恢复被打断的位置 */
function handleContinue() {
  endDiscussion();
}

/** 进度条/讲义跳转：调用引擎 jumpToAction（内部校验 live 与可重建前缀） */
function handleSeek(actionIndex: number) {
  void jumpToAction(actionIndex);
}
</script>
<style scoped>
.classroom {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
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

@media (max-width: 900px) {
  .topbar {
    padding: 0.5rem 0.75rem;
  }

  .course p {
    display: none;
  }

  .subtitle-bar {
    padding: 0.5rem 0.75rem;
    font-size: 0.82rem;
  }
}
</style>
