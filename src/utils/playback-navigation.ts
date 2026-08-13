/**
 * 文件头：播放导航纯函数
 *
 * 对应原项目：lib/api/stage-api-navigation.ts（StageAPI.navigation 的 next/previous/goTo）
 *
 * 功能：按场景列表与当前场景 id 计算「上一页/下一页」目标 id。
 * 原项目的导航 API 直接改 store.currentSceneId；本项目把"算目标"抽成纯函数，
 * 便于单元测试，并在页面组件中调用后写入 stage store（翻页的唯一入口）。
 *
 * 说明：Phase 3 的手动翻页只影响「展示中的场景」（引擎播放进度仍由引擎游标管理），
 * 后续 Phase 7/8 再对接引擎的 jumpToAction / 讨论恢复语义。
 */
import type { Scene } from '#/types/stage';

/**
 * 获取相邻场景 id。
 * @param scenes 全部场景（按 order 排列）
 * @param currentId 当前场景 id
 * @param direction 1=下一页，-1=上一页
 * @returns 目标场景 id；不存在（首/尾越界或场景为空）返回 null
 */
export function getAdjacentSceneId(
  scenes: readonly Scene[],
  currentId: string | null,
  direction: 1 | -1,
): string | null {
  if (scenes.length === 0 || !currentId) return null;
  const index = scenes.findIndex((s) => s.id === currentId);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= scenes.length) return null;
  return scenes[target].id;
}

/** 获取第一个场景 id（进入课堂时默认显示第一页） */
export function getFirstSceneId(scenes: readonly Scene[]): string | null {
  return scenes[0]?.id ?? null;
}

/**
 * 取「当前场景」构成的单例数组（供播放引擎使用）。
 *
 * 对应原项目：components/edit/PlaybackChromeRoot.tsx —— 引擎按 `[currentScene]` 创建，
 * 每节课（场景）独立播放，播完即停，切场景由 UI 驱动（不会自动连播整堂课）。
 *
 * @returns 含当前场景的单元素数组；当前场景不存在时返回空数组
 */
export function getSceneForPlayback(scenes: readonly Scene[], currentSceneId: string | null): Scene[] {
  const scene = scenes.find((s) => s.id === currentSceneId);
  return scene ? [scene] : [];
}
