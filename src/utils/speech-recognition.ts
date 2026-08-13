/**
 * 文件头：语音识别（STT）能力检测与错误映射纯函数
 *
 * 对应原项目：components/ai-elements/prompt-input.tsx（麦克风输入按钮）
 *             + components/settings/asr-settings.tsx（麦克风权限预检与测试）
 *
 * 功能：
 *   - isSpeechRecognitionSupported：检测浏览器是否支持 Web Speech API 识别
 *     （SpeechRecognition / webkitSpeechRecognition）；
 *   - requestMicrophoneAccess：通过 getUserMedia 显式申请麦克风权限（对齐原项目
 *     asr-settings.tsx 的权限申请路径，让浏览器弹出授权弹窗并确认麦克风可用），
 *     返回音频流供调用方做音量指示或测试；
 *   - isPermissionDeniedError：把识别错误码映射为「权限被拒绝」判断；
 *   - getMicrophoneErrorType：把 getUserMedia 抛出的错误分类为
 *     「无设备 / 权限被拒 / 非安全上下文 / 环境不支持 / 其他」，避免把所有失败
 *     都误报为权限问题，并让 UI 能透出具体错误名辅助定位。
 */
/** 浏览器是否支持语音识别（Web Speech API） */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/** 是否为「麦克风权限被拒绝」类错误（not-allowed / service-not-allowed） */
export function isPermissionDeniedError(error: string): boolean {
  return error === 'not-allowed' || error === 'service-not-allowed';
}

/**
 * 麦克风错误类型：供 UI 区分「无设备 / 权限被拒 / 其他」三种情况，
 * 避免把无麦克风或环境受限误报成「权限被拒绝」。
 */
export type MicrophoneErrorType = 'no-device' | 'denied' | 'insecure-context' | 'unsupported' | 'other';

/**
 * 把 getUserMedia 的异常分类为 MicrophoneErrorType。
 * 注意：getUserMedia 的权限拒绝错误码统一是 NotAllowedError，
 * 无设备错误码是 NotFoundError / DevicesNotFoundError。
 */
export function getMicrophoneErrorType(error: unknown): MicrophoneErrorType {
  const name = error instanceof DOMException ? error.name : (error as { name?: string } | null)?.name;
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'no-device';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'SecurityError') return 'insecure-context';
  // mediaDevices 缺失或 getUserMedia 不存在时，可能是受限浏览器/非安全上下文，
  // 单独归类便于提示「环境不支持」而非让用户去查系统权限
  if (name === 'NotSupportedError' || name === 'TypeError') return 'unsupported';
  return 'other';
}

/**
 * 显式申请麦克风权限（getUserMedia 预检）并返回音频流。
 *
 * 为什么这样做：SpeechRecognition.start() 在部分环境下不弹权限窗、直接以
 * not-allowed 失败（权限曾被拒、无麦克风、受限浏览器等）；而 getUserMedia 是
 * 标准权限申请入口，能可靠拉起浏览器授权弹窗。本函数模拟原项目 asr-settings.tsx
 * 的权限申请流程；返回的音频流由调用方决定使用（音量指示）与释放时机。
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('当前环境不支持麦克风访问', 'NotSupportedError');
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}
