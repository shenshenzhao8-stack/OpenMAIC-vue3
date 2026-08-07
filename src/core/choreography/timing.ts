/**
 * 文件头：播放时序「单一事实来源」
 *
 * 对应原项目：lib/choreography/timing.ts（照搬，注释已翻译为中文）
 *
 * 功能：
 *   - 特效/动作时长常量（聚光自动清除 5s、讨论延迟 3s、白板动画等——白板相关常量
 *     保留但功能裁剪，仅聚光 5s 与本项目相关）；
 *   - 无音频朗读时长估算 estimateSpeechDurationMs：中文 150ms/字、英文 240ms/词、
 *     下限 2s、除以倍速。播放引擎与（原项目）视频导出共用同一套数字，避免漂移。
 *
 * 纯 TS、零依赖，可在纯 Node 环境（如导出器/测试）中解释执行。
 */

// ==================== 特效 / 场景时序 ====================

/** 火速特效（聚光/激光）自动清除前保留的时长（毫秒） */
export const EFFECT_AUTO_CLEAR_MS = 5000

/** 讨论触发卡片显示前的延迟（毫秒）：给上一句语音留出自然收尾时间 */
export const DISCUSSION_TRIGGER_DELAY_MS = 3000

/**
 * 播放模式下讨论卡片自动跳过的倒计时（毫秒）。
 * 无人值守播放时，未跳过的讨论会阻塞
 * `DISCUSSION_TRIGGER_DELAY_MS + DISCUSSION_AUTO_SKIP_MS`。
 */
export const DISCUSSION_AUTO_SKIP_MS = 5000

/** 播放等待视频结束的安全上限（毫秒） */
export const MAX_VIDEO_WAIT_MS = 5 * 60 * 1000

// ==================== 白板 / 组件动作时长 ====================
// 原项目白板动画时长常量（本项目无白板功能，类型保留供照搬引擎引用）。

/** 打开白板动画（慢弹） */
export const WB_OPEN_MS = 2000

/** 白板绘制元素淡入 */
export const WB_DRAW_MS = 800

/** 白板代码行级编辑动画 */
export const WB_EDIT_MS = 600

/** 白板删除元素动画 */
export const WB_DELETE_MS = 300

/** 白板关闭动画 */
export const WB_CLOSE_MS = 700

/** 组件交互（高亮/改状态/注释/揭示）时长 */
export const WIDGET_MS = 300

/** 白板绘制代码：基础 800ms + 每行 50ms，上限 3000ms */
export function wbDrawCodeMs(lineCount: number): number {
  return Math.min(800 + lineCount * 50, 3000)
}

/** 白板清空：基础 380ms + 每元素 55ms，上限 1400ms */
export function wbClearMs(elementCount: number): number {
  return Math.min(380 + elementCount * 55, 1400)
}

// ==================== 无音频朗读时长估算 ====================

/** 计入 CJK 的字符范围（汉字/扩展A/平假名/片假名/谚文） */
const CJK_REGEX = /[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g

/** 文本 CJK 占比阈值：超过 30% 按中文语速估算 */
const CJK_RATIO_THRESHOLD = 0.3

/** 最短朗读时长（毫秒），无论文本多短 */
const MIN_READING_MS = 2000

/** 中文朗读节奏：每字 150ms（一字约一词） */
const CJK_MS_PER_CHAR = 150

/** 非中文朗读节奏：每词 240ms（约 250 词/分钟） */
const NON_CJK_MS_PER_WORD = 240

/** 朗读估算选项 */
export interface SpeechEstimateOptions {
  /** 播放倍速；估算结果除以该值。默认 1 */
  speed?: number
}

/**
 * 估算无音频台词「念完」需要多久（确定性函数——应用与视频导出必须一致）。
 *
 * - CJK 文本（CJK 字符占比 >30%）：约 150ms/字；
 * - 非 CJK 文本：约 240ms/词（≈250 词/分钟）；
 * - 下限 2000ms，再除以播放倍速。
 */
export function estimateSpeechDurationMs(text: string, opts?: SpeechEstimateOptions): number {
  const speed = opts?.speed ?? 1
  const cjkCount = (text.match(CJK_REGEX) || []).length
  const isCJK = cjkCount > text.length * CJK_RATIO_THRESHOLD
  const rawMs = isCJK
    ? Math.max(MIN_READING_MS, text.length * CJK_MS_PER_CHAR)
    : Math.max(MIN_READING_MS, text.split(/\s+/).filter(Boolean).length * NON_CJK_MS_PER_WORD)
  return rawMs / speed
}
