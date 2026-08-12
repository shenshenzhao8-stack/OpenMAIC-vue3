/**
 * 文件头：语音识别（STT）composable —— 麦克风输入
 *
 * 对应原项目：components/ai-elements/prompt-input.tsx 的 PromptInputSpeechButton
 *            （React → Vue；行为对齐：能力检测/仅提交 final 片段）
 *            + components/settings/asr-settings.tsx（getUserMedia 权限预检，
 *            让浏览器可靠弹出麦克风授权并验证麦克风可用）
 *
 * 功能：
 *   - supported：浏览器是否支持（不支持则 UI 隐藏/禁用按钮）；
 *   - toggle：点击先做 getUserMedia 权限预检（拉起浏览器授权弹窗，对齐原项目
 *     设置页行为），通过后再 start/stop；预检失败按「无设备/权限被拒/其他」
 *     分类提示，并提供 retry 重新申请；
 *   - requesting：预检进行中状态（UI 显示「请求中…」，防止重复点击）；
 *   - micLevel：识别期间实时音量（0~1），供 UI 显示「麦克风有声音」的调试反馈；
 *   - onresult：只把「最终识别片段（isFinal）」通过 onFinalTranscript 回调追加到输入框；
 *   - onerror：权限拒绝给出友好提示，其他错误给出错误码；
 *   - 预检失败会把浏览器返回的「具体错误名」透出到提示文案（如 NotAllowedError /
 *     NotFoundError / SecurityError），便于定位是系统、浏览器还是页面环境的问题。
 *   - 卸载时 stop（停止识别）。
 *
 * 说明：原项目接口把识别片段字段声明为 `script`（疑为笔误），浏览器标准字段为
 * `transcript`，本项目按标准使用 transcript。
 */
import { ref, onBeforeUnmount } from 'vue'
import {
  isSpeechRecognitionSupported,
  isPermissionDeniedError,
  getMicrophoneErrorType,
  requestMicrophoneAccess,
} from '@/utils/speech-recognition'

// 浏览器实验性 API 无全局类型，本地声明最小接口（对齐原项目 prompt-input.tsx）
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

type SpeechRecognitionResultList = {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionResult = {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

export interface UseSpeechRecognitionOptions {
  /** 最终识别片段回调（追加到输入框） */
  onFinalTranscript?: (text: string) => void
  /** 识别语言（默认 zh-CN） */
  lang?: string
}

/** 根据 getUserMedia 错误生成面向用户的中文提示（按错误类型分类） */
function describeMicError(error: unknown): string {
  const type = getMicrophoneErrorType(error)
  const name = error instanceof Error ? error.name : String(error)
  if (type === 'no-device') {
    return '未检测到麦克风设备，请连接麦克风后重试'
  }
  if (type === 'denied') {
    return '麦克风权限被拒绝：请点击地址栏左侧的权限图标允许麦克风访问，或在浏览器设置中开启后重试'
  }
  if (type === 'insecure-context') {
    return '当前页面不是安全上下文（需 https:// 或 localhost），浏览器禁止麦克风访问，请改用 https 访问'
  }
  if (type === 'unsupported') {
    return '当前浏览器/环境不支持麦克风访问（未提供 mediaDevices），请改用真实 Chrome 并以 https 或 localhost 访问'
  }
  // 未知错误：透出具体错误名，便于区分系统权限、浏览器限制还是页面环境问题
  return `无法访问麦克风（${name}）：请检查系统「隐私与安全 → 麦克风」是否允许当前浏览器，并确认使用真实 Chrome 以 https 或 localhost 访问`
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  /** 浏览器是否支持语音识别 */
  const supported = ref(isSpeechRecognitionSupported())
  /** 是否正在监听 */
  const listening = ref(false)
  /** 错误提示（权限拒绝等） */
  const error = ref<string | null>(null)
  /** 是否正在申请麦克风权限（防止重复点击，UI 显示「请求中…」） */
  const requesting = ref(false)
  /** 识别期间实时音量 0~1（麦克风调试反馈） */
  const micLevel = ref(0)

  let recognition: SpeechRecognition | null = null
  /** 预检返回的音频流：既是权限凭证，也是音量指示的数据源 */
  let levelStream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let rafId = 0
  /** 组件卸载标记，避免异步回调写已卸载状态 */
  let disposed = false

  /** 用预检流做音量分析：麦克风有声音时 UI 指示条随之起伏（可调试反馈） */
  function startLevelMeter(stream: MediaStream) {
    stopLevelMeter()
    // 竞态保护：用户可能在 getUserMedia 尚未返回时就点了停止，
    // 此时识别已停止，不应再持有麦克风流
    if (!listening.value) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }
    levelStream = stream
    if (typeof window === 'undefined') return
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) {
      // 无 AudioContext 时无法做音量指示，释放预检流避免麦克风常开
      stopLevelMeter()
      return
    }
    try {
      audioContext = new Ctx()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const sample = () => {
        if (!analyser || disposed) return
        analyser.getByteFrequencyData(data)
        // 取中频段平均强度归一化到 0~1，避免低频环境噪声让指示条常亮
        let sum = 0
        for (let i = 8; i < 64; i++) sum += data[i]
        micLevel.value = Math.min(1, sum / (56 * 255 * 0.35))
        rafId = requestAnimationFrame(sample)
      }
      sample()
    } catch {
      // 音量指示失败不影响识别主链路，静默降级
      stopLevelMeter()
    }
  }

  /** 停止音量分析并释放预检流 */
  function stopLevelMeter() {
    cancelAnimationFrame(rafId)
    rafId = 0
    levelStream?.getTracks().forEach((track) => track.stop())
    levelStream = null
    void audioContext?.close().catch(() => {})
    audioContext = null
    analyser = null
    micLevel.value = 0
  }

  if (supported.value && typeof window !== 'undefined') {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition
      webkitSpeechRecognition?: new () => SpeechRecognition
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (Ctor) {
      recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = options.lang ?? 'zh-CN'

      recognition.onstart = () => {
        listening.value = true
        error.value = null
      }
      recognition.onend = () => {
        listening.value = false
        stopLevelMeter()
      }
      recognition.onresult = (event) => {
        // 只收集「最终识别片段」（isFinal），按序拼接后回调
        let finalText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]
          if (r.isFinal) finalText += r[0]?.transcript ?? ''
        }
        if (finalText) options.onFinalTranscript?.(finalText)
      }
      recognition.onerror = (event) => {
        listening.value = false
        stopLevelMeter()
        // 权限已在预检阶段显式申请并得到用户授权，此时再报权限类错误
        // 多为识别服务/环境受限（如无设备、网络不通），按通用提示处理
        error.value = isPermissionDeniedError(event.error)
          ? '语音识别服务不可用（可能是浏览器不支持该服务或网络受限），请重试或改用文本输入'
          : `语音识别失败：${event.error}`
      }
    }
  }

  /** 点击切换：先 getUserMedia 权限预检（可靠拉起浏览器授权弹窗），通过后再开始识别 */
  async function toggle() {
    error.value = null
    if (!recognition) {
      error.value = '语音识别初始化失败，请刷新页面后重试'
      return
    }
    if (listening.value) {
      recognition.stop()
      return
    }
    requesting.value = true
    try {
      // 权限预检：对齐原项目 asr-settings.tsx 的 getUserMedia 申请路径；
      // 返回的流继续用于音量指示（同一份流，不重复申请权限）
      const stream = await requestMicrophoneAccess()
      startLevelMeter(stream)
      recognition.start()
    } catch (err) {
      // 预检或 start 失败：按错误类型给出可操作的提示（无设备/权限被拒/其他）
      error.value = describeMicError(err)
      // 保留原始错误到控制台，方便联调时看具体 name/message
      console.error('[useSpeechRecognition] 麦克风预检失败：', err)
    } finally {
      requesting.value = false
    }
  }

  /** 清除错误并重新申请权限（UI 的「重试」按钮） */
  function retry() {
    error.value = null
    void toggle()
  }

  /** 停止识别（卸载/发送前可调用） */
  function stop() {
    recognition?.stop()
  }

  onBeforeUnmount(() => {
    disposed = true
    stopLevelMeter()
    recognition?.stop()
  })

  return { supported, listening, requesting, error, micLevel, toggle, retry, stop }
}
