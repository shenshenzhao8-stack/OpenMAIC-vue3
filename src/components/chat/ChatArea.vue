<!--
  文件头：问答聊天面板
  对应原项目：components/chat/chat-area.tsx（简化版）
  功能：展示「登录用户 ↔ 老师」多轮一问一答；输入框发送；直播/讨论中显示「继续讲课」。
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessage } from '@/composables/useChatSession'

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
      <button type="button" class="send-btn" :disabled="isStreaming || !input.trim()" @click="submit">
        发送
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
  gap: 0.4rem;
}
.chat-input textarea {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.4rem;
  font-size: 0.85rem;
  resize: none;
}
.send-btn {
  align-self: flex-end;
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
</style>
