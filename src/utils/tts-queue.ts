/**
 * 文件头：语音队列纯逻辑（串行朗读 + segmentDone 计数）
 *
 * 对应原项目：lib/hooks/use-discussion-tts.ts 的队列部分（React → Vue，抽成纯模块）
 *
 * 功能：
 *   - enqueue：把「完整句子」入队；空闲时立即开播，否则排队（一次只播一句）；
 *   - onSegmentFinished：当前句播完回调（由具体播音实现调用）→ segmentDone+1 → 播下一句；
 *   - shouldHold：供打字机「文字等语音」判断（holding = 正在播或队列非空；
 *     segmentDone 变化表示「某段刚播完」，打字机据此放行）。
 */
export interface TtsQueueItem {
  partId: string;
  text: string;
  agentId: string | null;
}

export interface TtsQueueHandlers {
  /** 实际播音实现（浏览器 speechSynthesis 等）；播完必须调用 onSegmentFinished */
  speak: (item: TtsQueueItem) => void;
}

export interface TtsHoldState {
  holding: boolean;
  segmentDone: number;
}

export function createTtsQueue(handlers: TtsQueueHandlers) {
  const queue: TtsQueueItem[] = [];
  let isPlaying = false;
  let segmentDone = 0;

  /** 入队：空闲即播，否则排队 */
  function enqueue(item: TtsQueueItem) {
    queue.push(item);
    if (!isPlaying) processNext();
  }

  /** 取队首开播（串行：一次一句） */
  function processNext() {
    if (isPlaying || queue.length === 0) return;
    isPlaying = true;
    const item = queue.shift()!;
    handlers.speak(item);
  }

  /** 当前句播完：计数+1，继续下一句 */
  function onSegmentFinished() {
    isPlaying = false;
    segmentDone += 1;
    processNext();
  }

  /** 打字机等语音判断 */
  function shouldHold(): TtsHoldState {
    return { holding: isPlaying || queue.length > 0, segmentDone };
  }

  /** 清理（卸载/停止时） */
  function reset() {
    queue.length = 0;
    isPlaying = false;
    segmentDone = 0;
  }

  return { enqueue, onSegmentFinished, shouldHold, reset };
}
