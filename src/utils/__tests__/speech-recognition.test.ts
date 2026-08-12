/**
 * 文件头：语音识别（STT）工具测试
 *
 * 功能：验证能力检测（node 环境无 window → false）、权限错误映射、
 *       getUserMedia 错误分类（无设备/权限被拒/非安全上下文/环境不支持/其他）
 *       与权限预检行为。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isSpeechRecognitionSupported,
  isPermissionDeniedError,
  getMicrophoneErrorType,
  requestMicrophoneAccess,
} from '@/utils/speech-recognition'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('语音识别工具', () => {
  it('node 环境（无 window）检测为不支持', () => {
    expect(isSpeechRecognitionSupported()).toBe(false)
  })

  it('权限拒绝错误映射', () => {
    expect(isPermissionDeniedError('not-allowed')).toBe(true)
    expect(isPermissionDeniedError('service-not-allowed')).toBe(true)
    expect(isPermissionDeniedError('no-speech')).toBe(false)
  })

  it('getUserMedia 错误分类：无设备 / 权限被拒 / 非安全上下文 / 环境不支持 / 其他', () => {
    expect(getMicrophoneErrorType(new DOMException('', 'NotFoundError'))).toBe('no-device')
    expect(getMicrophoneErrorType(new DOMException('', 'NotAllowedError'))).toBe('denied')
    expect(getMicrophoneErrorType(new DOMException('', 'SecurityError'))).toBe('insecure-context')
    expect(getMicrophoneErrorType(new DOMException('', 'NotSupportedError'))).toBe('unsupported')
    expect(getMicrophoneErrorType(new Error('boom'))).toBe('other')
  })

  it('requestMicrophoneAccess：支持时返回 getUserMedia 的音频流', async () => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    })
    await expect(requestMicrophoneAccess()).resolves.toBe(fakeStream)
  })

  it('requestMicrophoneAccess：环境不支持 getUserMedia 时抛 NotSupportedError', async () => {
    vi.stubGlobal('navigator', {})
    await expect(requestMicrophoneAccess()).rejects.toMatchObject({
      name: 'NotSupportedError',
    })
  })
})
