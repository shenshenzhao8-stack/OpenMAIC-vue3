/**
 * 文件头：播放「可跳转性」判断与动作导航辅助
 *
 * 对应原项目：lib/playback/action-navigation.ts（照搬，注释已翻译为中文）
 *
 * 功能：判断能否安全跳转到某句台词并「静默重放」其前缀：
 *   - isUnsafePlaybackNavigationAction：不可重建前缀的动作（视频/讨论/widget）；
 *   - isWhiteboardPlaybackAction：白板动作（引擎静默重放时使用）；
 *   - canReconstructPrefixForAction：目标为 speech 且其前缀不含不可重建动作；
 *   - canJumpWithinReconstructablePrefix：跳转可行性（引擎 jumpToAction 使用）；
 *   - buildActionNavigationTargets 等：台词行号与前后跳转目标。
 */
import type { Action } from '#/types/action'

/** 动作导航目标 */
export interface ActionNavigationTarget {
  actionIndex: number
  actionId: string
  actionType: Action['type']
  /** 台词行号（仅 speech 动作） */
  lineNumber: number
  canJump: boolean
}

/** 台词行进度 */
export interface ActionLineProgress {
  currentLine: number
  totalLines: number
}

/** 不可重建前缀的动作类型集合（跳转时若前缀含这些动作则拒绝） */
const UNSAFE_ACTION_TYPES = new Set<Action['type']>([
  'play_video',
  'discussion',
  'widget_highlight',
  'widget_setState',
  'widget_annotation',
  'widget_reveal',
])

/** 白板动作类型集合 */
const WHITEBOARD_ACTION_TYPES = new Set<Action['type']>([
  'wb_open',
  'wb_draw_text',
  'wb_draw_shape',
  'wb_draw_chart',
  'wb_draw_latex',
  'wb_draw_table',
  'wb_draw_line',
  'wb_draw_code',
  'wb_edit_code',
  'wb_clear',
  'wb_delete',
  'wb_close',
])

/** 是否为不可重建前缀的动作（视频/讨论/widget） */
export function isUnsafePlaybackNavigationAction(action: Action): boolean {
  return UNSAFE_ACTION_TYPES.has(action.type)
}

/** 是否为白板动作 */
export function isWhiteboardPlaybackAction(action: Action): boolean {
  return WHITEBOARD_ACTION_TYPES.has(action.type)
}

/** 目标动作是否可安全重建前缀：目标必须是 speech，且其前缀不含不可重建动作 */
export function canReconstructPrefixForAction(
  actions: readonly Action[],
  actionIndex: number,
): boolean {
  if (!Number.isInteger(actionIndex) || actionIndex < 0 || actionIndex >= actions.length) {
    return false
  }
  if (actions[actionIndex]?.type !== 'speech') return false

  for (let i = 0; i < actionIndex; i++) {
    if (isUnsafePlaybackNavigationAction(actions[i])) {
      return false
    }
  }
  return true
}

/** 能否在可重建前缀内从当前位置跳到目标位置 */
export function canJumpWithinReconstructablePrefix(
  actions: readonly Action[],
  currentActionIndex: number | null | undefined,
  targetActionIndex: number,
): boolean {
  if (!canReconstructPrefixForAction(actions, targetActionIndex)) return false
  const currentLimit = Math.min(actions.length, Math.max(0, currentActionIndex ?? 0))
  for (let i = 0; i < currentLimit; i++) {
    if (isUnsafePlaybackNavigationAction(actions[i])) {
      return false
    }
  }
  return true
}

/** 构建所有 speech 动作的导航目标列表（含行号与可跳转性） */
export function buildActionNavigationTargets(actions: readonly Action[]): ActionNavigationTarget[] {
  let lineNumber = 0
  return actions.flatMap((action, actionIndex) => {
    if (action.type !== 'speech') return []
    lineNumber += 1
    return [
      {
        actionIndex,
        actionId: action.id,
        actionType: action.type,
        lineNumber,
        canJump: canReconstructPrefixForAction(actions, actionIndex),
      },
    ]
  })
}

/** 当前所在台词行号（相对全部台词） */
export function getActionLineProgress(
  actions: readonly Action[],
  currentActionIndex: number | null | undefined,
): ActionLineProgress {
  const targets = buildActionNavigationTargets(actions)
  if (targets.length === 0) {
    return { currentLine: 0, totalLines: 0 }
  }

  const cursor = Math.max(0, currentActionIndex ?? 0)
  const exactOrPrevious = [...targets].reverse().find((target) => target.actionIndex <= cursor)
  const currentLine = exactOrPrevious?.lineNumber ?? targets[0].lineNumber
  return { currentLine, totalLines: targets.length }
}

/** 上一个可安全跳转的 speech 动作序号（不存在返回 null） */
export function getPreviousSafeSpeechActionIndex(
  actions: readonly Action[],
  currentActionIndex: number | null | undefined,
): number | null {
  const cursor = Math.max(0, currentActionIndex ?? 0)
  const target = [...buildActionNavigationTargets(actions)]
    .reverse()
    .find((candidate) => candidate.canJump && candidate.actionIndex < cursor)
  return target?.actionIndex ?? null
}

/** 下一个可安全跳转的 speech 动作序号（不存在返回 null） */
export function getNextSafeSpeechActionIndex(
  actions: readonly Action[],
  currentActionIndex: number | null | undefined,
): number | null {
  const cursor = Math.max(0, currentActionIndex ?? 0)
  const target = buildActionNavigationTargets(actions).find(
    (candidate) => candidate.canJump && candidate.actionIndex > cursor,
  )
  return target?.actionIndex ?? null
}
