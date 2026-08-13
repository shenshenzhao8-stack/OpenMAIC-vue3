/**
 * 文件头：播放游标解析
 *
 * 对应原项目：lib/choreography/cursor.ts（照搬，注释已翻译为中文）
 *
 * 功能：给定 (sceneIndex, actionIndex) 游标，在场景列表上定位当前应执行的 Action：
 *   - 当前场景 actions 耗尽自动推进到下一场景；
 *   - 无 actions 的场景产生一次「空白 speech 停留拍」（EMPTY_SCENE_DWELL），
 *     让该页至少停留一个朗读计时而不是瞬间跳过；
 *   - 所有场景消费完返回 null（播放结束）。
 *
 * 纯函数：不修改入参，由调用方采用返回的游标。
 */
import type { Action, SceneCore } from '@openmaic/dsl';

/**
 * 无动作场景的合成停留拍：空文本 speech。
 * 引擎会把它路由到与空白语音相同的朗读计时（页面停留约一个朗读计时而非被跳过）。
 * 因此 `actions: []` 的场景行为等价于携带一条空白 speech 的场景。
 */
export const EMPTY_SCENE_DWELL: Action = {
  id: '__empty_scene_dwell__',
  type: 'speech',
  text: '',
} as Action;

/** 游标解析结果 */
export interface CursorResult {
  action: Action;
  sceneId: string;
  /** 引擎应采用（可能已推进）的场景游标 */
  sceneIndex: number;
  /** 引擎应采用（可能已推进）的动作游标 */
  actionIndex: number;
}

/**
 * 从 (sceneIndex, actionIndex) 解析当前播放动作，越过 actions 已耗尽的场景。
 * 无 actions 的场景在其动作游标仍为 0 时产生一次 {@link EMPTY_SCENE_DWELL} 停留拍。
 * 所有场景消费完后返回 null。
 *
 * 类型基于 SceneCore（只读取 id + actions），因此应用侧扩展了 content 的
 * Scene 可直接传入，无需断言。
 */
export function resolvePlaybackCursor(
  scenes: SceneCore[],
  sceneIndex: number,
  actionIndex: number,
): CursorResult | null {
  let si = sceneIndex;
  let ai = actionIndex;
  while (si < scenes.length) {
    const actions = scenes[si].actions ?? [];
    if (actions.length === 0) {
      if (ai === 0) {
        return {
          action: EMPTY_SCENE_DWELL,
          sceneId: scenes[si].id,
          sceneIndex: si,
          actionIndex: ai,
        };
      }
      si++;
      ai = 0;
      continue;
    }
    if (ai < actions.length) {
      return { action: actions[ai], sceneId: scenes[si].id, sceneIndex: si, actionIndex: ai };
    }
    si++;
    ai = 0;
  }
  return null;
}
