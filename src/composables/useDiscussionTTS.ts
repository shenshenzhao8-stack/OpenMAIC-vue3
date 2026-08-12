/**
 * 文件头：问答语音队列（composable）
 *
 * 对应原项目：lib/hooks/use-discussion-tts.ts（React → Vue；本项目仅浏览器 TTS）
 *
 * 功能：
 *   - handleSegmentSealed：收到「完整句子」（StreamBuffer 封口回调）后入队；
 *   - 队列串行用浏览器语音合成（Web Speech API）朗读；
 *   - shouldHold()：供打字机「文字等语音」判断（holding + segmentDone）；
 *   - speakingAgentId：当前正在说话的 agent（音频指示器）。
 *
 * 说明（T-03）：后台 SSE 若携带音频，届时简化为「收到 audioUrl 直接播放」；
 * 当前 mock SSE 只推文本，故用浏览器 TTS 朗读。
 */
import { ref, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '#/stores/settings'
import { createTtsQueue } from '#/utils/tts-queue'

export function useDiscussionTTS() {
  const settings = useSettingsStore()
  const speakingAgentId = ref<string | null>(null)

  // 语音队列：speak 用浏览器合成；播完回调 onSegmentFinished 继续下一句
  const queue = createTtsQueue({
    speak: (item) => {
      speakingAgentId.value = item.agentId
      if (!settings.ttsEnabled || settings.ttsMuted) {
        queue.onSegmentFinished()
        return
      }
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        queue.onSegmentFinished()
        return
      }
      const utterance = new SpeechSynthesisUtterance(item.text)
      utterance.rate = settings.ttsSpeed ?? 1
      utterance.lang = 'zh-CN'
      utterance.onend = () => {
        speakingAgentId.value = null
        queue.onSegmentFinished()
      }
      utterance.onerror = () => {
        speakingAgentId.value = null
        queue.onSegmentFinished()
      }
      window.speechSynthesis.speak(utterance)
    },
  })

  // 卸载清理：停止朗读、清空队列
  onBeforeUnmount(() => {
    reset()
  })

  /** 复位语音队列并停止当前朗读（课程切换时调用，MONOREPO Phase 1） */
  function reset() {
    queue.reset()
    window.speechSynthesis?.cancel()
    speakingAgentId.value = null
  }

  /** 封口回调：完整句子入队（语音只在文字写完才合成） */
  function handleSegmentSealed(
    _messageId: string,
    partId: string,
    fullText: string,
    agentId: string | null,
  ) {
    if (!settings.ttsEnabled || settings.ttsMuted || !fullText.trim()) return
    queue.enqueue({ partId, text: fullText, agentId })
  }

  return {
    handleSegmentSealed,
    shouldHold: queue.shouldHold,
    speakingAgentId,
    reset,
  }
}
