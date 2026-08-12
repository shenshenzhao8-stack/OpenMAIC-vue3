<!--
  文件头：问答聊天面板
  对应原项目：components/chat/chat-area.tsx（简化版）+ components/ai-elements/prompt-input.tsx（麦克风输入）
  功能：展示「登录用户 ↔ 老师」多轮一问一答；输入框 + 麦克风语音输入；直播/讨论中显示「继续讲课」。
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessage } from '@/composables/useChatSession'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
  isLive: boolean
  speakingAgentId: string | null
  onSend: (text: string) => void
  onContinue: () => void
}>()

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
      <span>问答</span>
      <span v-if="speakingAgentId" class="speaking">老师正在说话…</span>
      <button v-if="isLive" type="button" class="continue-btn" @click="props.onContinue">
        继续讲课
      </button>
    </header>
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
          :title="micRequesting ? '正在请求麦克风权限…' : micListening ? '点击停止' : '点击开始语音输入'"
          @click="toggleMic"
        >
          {{ micRequesting ? '…' : '🎤' }}
        </button>
        <!-- 音量指示条：识别期间随麦克风输入起伏，作为「麦克风可用」的调试反馈 -->
        <span
          v-if="micSupported && micListening"
          class="mic-level"
          :style="{ width: `${Math.round(micLevel * 60)}px` }"
          :title="`麦克风音量 ${Math.round(micLevel * 100)}%`"
        />
        <button type="button" class="send-btn" :disabled="isStreaming || !input.trim()" @click="submit">
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
</style>
