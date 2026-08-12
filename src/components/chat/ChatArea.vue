<!--
  文件头：课堂聊天面板（讲义 + 问答双 tab）

  对应原项目：components/chat/chat-area.tsx（双 tab：lecture / chat，默认讲义页）
             + components/chat/lecture-notes-view.tsx（讲义渲染与点击跳转）
             + components/ai-elements/prompt-input.tsx（麦克风输入）

  功能（Phase 9，T-18 补回讲义视图）：
    1. 讲义 tab（默认）：buildLectureNotes(scenes) 按场景分组生成讲义，
       当前场景高亮；speech 行前显示聚光/激光徽章；点击当前场景的 speech 行
       跳转到对应播放动作（对齐原项目 LectureNotesView 的 onJumpToAction）；
    2. 问答 tab：登录用户 ↔ 老师多轮一问一答；文本输入 + 麦克风语音输入（STT）；
    3. 直播/讨论中显示「继续讲课」按钮。
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatMessage } from '#/composables/useChatSession'
import { useSpeechRecognition } from '#/composables/useSpeechRecognition'
import {
  buildLectureNotes,
  getLectureActionLabel,
  type LectureNoteEntry,
} from '#/utils/lecture-notes'
import type { Scene } from '#/types/stage'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
  isLive: boolean
  speakingAgentId: string | null
  onSend: (text: string) => void
  onContinue: () => void
  /** 课堂全部场景（讲义构建输入） */
  scenes: Scene[]
  /** 当前场景 id（讲义高亮与跳转判定） */
  currentSceneId: string | null
  /** 当前动作游标（讲义行高亮） */
  currentActionIndex: number | null
  /** 目标动作是否可跳转（live 讨论中禁止） */
  canJumpToAction: (actionIndex: number) => boolean
  /** 跳转到指定动作（引擎 jumpToAction 接线） */
  onJumpToAction: (actionIndex: number) => void
}>()

/** 当前 tab：讲义（默认，对齐原项目）/ 问答 */
const activeTab = ref<'lecture' | 'chat'>('lecture')

/** 讲义条目：按场景分组、按动作顺序、按 sceneOrder 排序 */
const notes = computed(() => buildLectureNotes(props.scenes))

/** 讲义渲染行：speech 行（含行前动作徽章）或尾随徽章行 */
type LectureRow =
  | { kind: 'speech'; inlineActions: string[]; text: string; actionIndex: number }
  | { kind: 'trailing'; inlineActions: string[] }

/** 把讲义条目组织成渲染行：聚光/激光徽章并入下一条 speech，尾随徽章独立成行 */
function buildRows(items: LectureNoteEntry['items']): LectureRow[] {
  const rows: LectureRow[] = []
  let pending: string[] = []
  for (const item of items) {
    if (item.kind === 'action') {
      pending.push(getLectureActionLabel(item.type))
    } else {
      rows.push({
        kind: 'speech',
        inlineActions: pending,
        text: item.text,
        actionIndex: item.actionIndex,
      })
      pending = []
    }
  }
  if (pending.length > 0) rows.push({ kind: 'trailing', inlineActions: pending })
  return rows
}

/** 点击讲义行跳转：仅当前场景的 speech 行可跳（对齐原项目 LectureNotesView） */
function handleJump(note: LectureNoteEntry, row: LectureRow) {
  if (row.kind !== 'speech') return
  if (note.sceneId !== props.currentSceneId) return
  if (!props.canJumpToAction(row.actionIndex)) return
  props.onJumpToAction(row.actionIndex)
}

const input = ref('')

/** 发送：非空时回调父组件，并清空输入框 */
function submit() {
  const text = input.value.trim()
  if (!text) return
  props.onSend(text)
  input.value = ''
}

/** 语音识别（STT）：先 getUserMedia 权限预检（弹授权窗），final 片段追加进输入框 */
const {
  supported: micSupported,
  listening: micListening,
  requesting: micRequesting,
  error: micError,
  micLevel,
  toggle: toggleMic,
  retry: retryMic,
} = useSpeechRecognition({
  onFinalTranscript: (text) => {
    input.value = input.value ? `${input.value} ${text}` : text
  },
})
</script>

<template>
  <aside class="chat-area">
    <header class="chat-header">
      <!-- 讲义 / 问答双 tab（默认讲义，对齐原项目 chat-area.tsx） -->
      <div class="tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'lecture' }"
          @click="activeTab = 'lecture'"
        >
          讲义
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          问答
        </button>
      </div>
      <span v-if="speakingAgentId && activeTab === 'chat'" class="speaking">老师正在说话…</span>
      <button v-if="isLive" type="button" class="continue-btn" @click="props.onContinue">
        继续讲课
      </button>
    </header>

    <!-- 讲义 tab：按场景分组的讲义，点击当前场景 speech 行跳转播放 -->
    <div v-if="activeTab === 'lecture'" class="lecture-notes">
      <p v-if="notes.length === 0" class="lecture-empty">暂无讲义内容</p>
      <div
        v-for="note in notes"
        :key="note.sceneId"
        class="note-scene"
        :class="{ current: note.sceneId === currentSceneId }"
      >
        <div class="note-head">
          <span class="note-dot" />
          <span class="note-scene-title">{{ note.sceneTitle }}</span>
          <span v-if="note.sceneId === currentSceneId" class="note-current-badge">当前页</span>
        </div>
        <div class="note-items">
          <template v-for="(row, i) in buildRows(note.items)" :key="i">
            <div
              v-if="row.kind === 'speech'"
              class="note-row"
              :class="{
                active:
                  note.sceneId === currentSceneId && row.actionIndex === currentActionIndex,
                jumpable: note.sceneId === currentSceneId && canJumpToAction(row.actionIndex),
              }"
              :title="
                note.sceneId === currentSceneId && canJumpToAction(row.actionIndex)
                  ? '点击跳转到该句'
                  : ''
              "
              @click="handleJump(note, row)"
            >
              <span v-for="(a, j) in row.inlineActions" :key="j" class="note-badge">{{ a }}</span>
              <span class="note-text">{{ row.text }}</span>
            </div>
            <div v-else class="note-trailing">
              <span v-for="(a, j) in row.inlineActions" :key="j" class="note-badge">{{ a }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 问答 tab：消息列表 + 输入区（保留原 Phase 8 全部能力） -->
    <template v-else>
      <div class="chat-messages">
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg"
          :class="m.role === 'user' ? 'user' : 'assistant'"
        >
          <div v-if="m.role === 'assistant'" class="agent-name">{{ m.agentName ?? 'AI 老师' }}</div>
          <div class="bubble">{{ m.text }}</div>
        </div>
        <p v-if="isStreaming" class="typing">老师正在输入…</p>
      </div>
      <div class="chat-input">
        <textarea
          v-model="input"
          rows="2"
          placeholder="向老师提问…"
          @keydown.enter.exact.prevent="submit"
        />
        <div class="input-actions">
          <!-- 麦克风语音输入（STT）：能力检测 + 权限 + 最终片段入框 -->
          <button
            v-if="micSupported"
            type="button"
            class="mic-btn"
            :class="{ listening: micListening, requesting: micRequesting }"
            :disabled="micRequesting"
            :title="
              micRequesting
                ? '正在请求麦克风权限…'
                : micListening
                  ? '点击停止'
                  : '点击开始语音输入'
            "
            @click="toggleMic"
          >
            {{ micRequesting ? '…' : '🎤' }}
          </button>
          <!-- 音量指示条：识别期间随麦克风输入起伏 -->
          <span
            v-if="micSupported && micListening"
            class="mic-level"
            :style="{ width: `${Math.round(micLevel * 60)}px` }"
            :title="`麦克风音量 ${Math.round(micLevel * 100)}%`"
          />
          <button
            type="button"
            class="send-btn"
            :disabled="isStreaming || !input.trim()"
            @click="submit"
          >
            发送
          </button>
        </div>
      </div>
      <div v-if="micError" class="mic-error">
        <p>{{ micError }}</p>
        <button type="button" class="mic-retry" :disabled="micRequesting" @click="retryMic">
          {{ micRequesting ? '请求中…' : '重试' }}
        </button>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.chat-area {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0.15rem;
}
.tab-btn {
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 0.25rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}
.tab-btn.active {
  background: #fff;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.speaking {
  font-size: 0.75rem;
  font-weight: 400;
  color: #2563eb;
}
.continue-btn {
  margin-left: auto;
  border: 1px solid #2563eb;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
}

/* 讲义 tab */
.lecture-notes {
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem;
}
.lecture-empty {
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: center;
  margin-top: 2rem;
}
.note-scene {
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.6rem;
  background: #f8fafc;
}
.note-scene.current {
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}
.note-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}
.note-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}
.note-scene.current .note-dot {
  background: #2563eb;
}
.note-scene-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}
.note-current-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: #2563eb;
  background: #dbeafe;
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
}
.note-items {
  padding-left: 0.65rem;
}
.note-row {
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;
  font-size: 0.75rem;
  line-height: 1.55;
  color: #475569;
  padding: 0.2rem 0.3rem;
  border-radius: 6px;
  cursor: default;
}
.note-row.active {
  background: #dbeafe;
  color: #1e3a8a;
}
.note-row.jumpable {
  cursor: pointer;
}
.note-row.jumpable:hover {
  background: #e0f2fe;
}
.note-badge {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  margin-top: 0.15rem;
}
.note-text {
  flex: 1;
}
.note-trailing {
  display: flex;
  gap: 0.3rem;
  padding: 0.1rem 0.3rem 0.25rem;
}

/* 问答 tab */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.msg.user {
  align-self: flex-end;
}
.msg.assistant {
  align-self: flex-start;
}
.agent-name {
  font-size: 0.72rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}
.bubble {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 240px;
  white-space: pre-wrap;
}
.msg.user .bubble {
  background: #2563eb;
  color: #fff;
}
.msg.assistant .bubble {
  background: #f1f5f9;
  color: #1e293b;
}
.typing {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}
.chat-input {
  border-top: 1px solid #e2e8f0;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.chat-input textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.4rem;
  font-size: 0.85rem;
  resize: none;
  box-sizing: border-box;
}
.input-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}
.mic-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  width: 2rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.mic-btn.listening {
  background: #2563eb;
  animation: mic-pulse 1.2s ease-in-out infinite;
}
.mic-btn.requesting {
  opacity: 0.6;
  cursor: wait;
}
.mic-level {
  height: 6px;
  border-radius: 3px;
  background: #2563eb;
  align-self: center;
  transition: width 80ms linear;
}
@keyframes mic-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.send-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mic-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  color: #dc2626;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
}
.mic-error p {
  margin: 0;
  flex: 1;
}
.mic-retry {
  flex-shrink: 0;
  border: 1px solid #dc2626;
  color: #dc2626;
  background: #fff;
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  font-size: 0.72rem;
  cursor: pointer;
}
.mic-retry:disabled {
  opacity: 0.5;
  cursor: wait;
}
@media (max-width: 900px) {
  .chat-area {
    width: 260px;
  }
  .note-text {
    font-size: 0.7rem;
  }
  .bubble {
    max-width: 200px;
  }
}
</style>
