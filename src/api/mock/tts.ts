/**
 * 文件头：mock TTS 合成
 *
 * 对应原项目：app/api/generate/tts/route.ts（返回 base64 音频）
 *
 * 功能：mock 阶段返回一段「静音 WAV」的 base64，让音频播放链路（AudioPlayer）
 * 能真正走通（能播、能触发 onEnded）。真实后台接入后替换为真实音频。
 *
 * 裁剪/临时性说明：本文件是 Phase 2 的占位实现，TTS 是否保留取决于后台
 * 是否自带音频（TODO T-01）；若后台数据自带音频，本文件可整体移除。
 */

/** 生成指定时长的静音 WAV（8kHz、8bit、单声道）并返回 data URL */
function buildSilenceWavDataUrl(durationSeconds: number): string {
  const sampleRate = 8000
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const dataSize = numSamples // 8bit 单声道：每采样 1 字节
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF 头
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  // fmt 块
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt 块大小
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // 单声道
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true) // 字节率（8bit 单声道 = sampleRate）
  view.setUint16(32, 1, true) // 块对齐
  view.setUint16(34, 8, true) // 位深
  // data 块
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  // 其余为 0（静音）

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

/** 在 DataView 指定偏移写入 ASCII 字符串 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

/** mock TTS 入参（与真实接口字段对齐） */
export interface MockTtsInput {
  text: string
  voice?: string
  speed?: number
}

/** mock TTS 出参：返回静音音频的 data URL（AudioPlayer 直接可播） */
export function mockSynthesizeTts(input: MockTtsInput): { format: string; audioUrl: string } {
  // 按文本长度粗略估计朗读时长（短文本至少 1 秒），保证 onEnded 正常触发
  const seconds = Math.max(1, Math.min(5, Math.ceil(input.text.length / 20)))
  return { format: 'wav', audioUrl: buildSilenceWavDataUrl(seconds) }
}
