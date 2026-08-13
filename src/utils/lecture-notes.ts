/**
 * 文件头：讲义（Lecture Notes）构建纯函数
 *
 * 对应原项目：lib/chat/lecture-notes.ts（照搬，逻辑逐行一致）
 *             + lib/types/chat.ts 的 LectureNoteItem / LectureNoteEntry 类型
 *
 * 功能：
 *   - 把课堂场景按「动作顺序」构造成讲义条目：speech 显示逐字稿文本，
 *     spotlight / laser 作为行内动作徽章（放在下一条 speech 开头）；
 *   - 按场景分组、按 sceneOrder 排序，供聊天区的「讲义 tab」渲染；
 *   - 每个条目保留 actionIndex / actionId，讲义行点击可跳转到对应播放动作。
 *
 * 与原文的差异（裁剪记录，规则六）：
 *   - 原项目 LECTURE_NOTE_ACTION_TYPES 含 speech / spotlight / laser /
 *     play_video / discussion / widget_highlight / widget_setState /
 *     widget_annotation / widget_reveal；本项目教学动作仅保留
 *     speech / spotlight / laser（见 AGENTS.md 规则三），其余类型
 *     （play_video / discussion / widget_*）随动作裁剪一并移除，
 *     若将来恢复动作，需同步加回对应类型。
 */
import type { Scene } from '#/types/stage';

/** 参与讲义的动作类型（本项目仅三种教学动作） */
const LECTURE_NOTE_ACTION_TYPES = new Set(['speech', 'spotlight', 'laser']);

/**
 * 讲义条目：要么是一条 speech 文本，要么是一个动作徽章。
 * 顺序与场景内动作顺序一致（对齐原项目 lib/types/chat.ts）。
 */
export type LectureNoteItem =
  | {
      kind: 'speech';
      text: string;
      actionIndex: number;
      actionId: string;
      actionType: string;
    }
  | {
      kind: 'action';
      type: string;
      label?: string;
      actionIndex: number;
      actionId: string;
      actionType: string;
    };

/** 一个场景的讲义分组（对齐原项目 lib/types/chat.ts） */
export interface LectureNoteEntry {
  sceneId: string;
  sceneTitle: string;
  sceneOrder: number;
  items: LectureNoteItem[];
  completedAt: number;
}

/**
 * 从场景列表构建讲义条目。
 * 参数：scenes 课堂全部场景；
 * 返回：按场景分组、按 sceneOrder 排序的讲义列表；
 * 只保留动作数 > 0 的场景，且只保留 LECTURE_NOTE_ACTION_TYPES 内的动作。
 */
export function buildLectureNotes(scenes: readonly Scene[]): LectureNoteEntry[] {
  return scenes
    .filter((scene) => scene.actions && scene.actions.length > 0)
    .map((scene) => ({
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneOrder: scene.order,
      items: scene
        // eslint-disable-next-line antfu/consistent-chaining -- 保持 prettier 单行链式格式
        .actions!.map((action, actionIndex): LectureNoteItem | null => {
          if (!LECTURE_NOTE_ACTION_TYPES.has(action.type)) return null;
          const base = {
            actionIndex,
            actionId: action.id,
            actionType: action.type,
          };
          if (action.type === 'speech') {
            return {
              ...base,
              kind: 'speech',
              text: action.text,
            };
          }
          return {
            ...base,
            kind: 'action',
            type: action.type,
          };
        })
        .filter((item): item is LectureNoteItem => item !== null),
      completedAt: scene.updatedAt || scene.createdAt || 0,
    }))
    .sort((a, b) => a.sceneOrder - b.sceneOrder);
}

/**
 * 取动作的讲义徽章文案（spotlight → 聚光、laser → 激光）。
 * 参数：action 类型；返回：中文徽章文本（未知类型返回空串，UI 不显示徽章）。
 */
export function getLectureActionLabel(type: string): string {
  if (type === 'spotlight') return '聚光';
  if (type === 'laser') return '激光';
  return '';
}
