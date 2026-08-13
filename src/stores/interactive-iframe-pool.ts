/**
 * 文件头：交互 iframe 保活池（Pinia）
 *
 * 对应原项目：lib/store/interactive-iframe-pool.ts（Zustand）——「托管抽屉」
 *
 * 功能：把交互场景的 iframe「养」在全局 store 里，切页只隐藏不销毁：
 *   - entries[sceneId] = { srcDoc, rect, owner, tick }；
 *   - mount：登记内容（内容相同则走保活快路径，不重建 iframe）；
 *   - setRect：占位组件实时上报屏幕矩形（Host 按它定位）；
 *   - claim/release：可见权归属（owner 机制防止旧占位误释放新 iframe）；
 *   - LRU 淘汰：最多保留 IFRAME_POOL_CAP（3）个，太久没用的被移除。
 *
 * 为什么做成全局 store：iframe 必须独立于场景子树存活，因此由 ClassroomPage
 * 挂载的 InteractiveIframeHost 统一渲染，本 store 是占位组件与 Host 之间的协调层。
 */
import { defineStore } from 'pinia';

/** 保活池容量上限（LRU 淘汰阈值） */
export const IFRAME_POOL_CAP = 3;

/** iframe 在屏幕上的矩形（像素） */
export interface IframeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 保活池单条记录 */
export interface IframePoolEntry {
  /** 打补丁后的 HTML（srcdoc）；与 src 二选一 */
  srcDoc?: string;
  /** 外部 URL（src）；与 srcDoc 二选一 */
  src?: string;
  /** 当前屏幕矩形；未测量时为 null */
  rect: IframeRect | null;
  /** 可见权归属：正在使用的占位组件 id；null = 无人使用（隐藏） */
  owner: string | null;
  /** 最近使用时间戳（LRU 用） */
  tick: number;
}

/** 挂载入参 */
export interface MountInput {
  srcDoc?: string;
  src?: string;
}

interface InteractiveIframePoolState {
  entries: Record<string, IframePoolEntry>;
  activeSceneId: string | null;
  /** 单调递增计数（每次 mount/touch 取下一个值） */
  tick: number;
}

/**
 * LRU 淘汰：保留最近使用的至多 CAP 个；活动场景永不淘汰。
 * 返回新的 entries 映射。
 */
function evictLru(
  entries: Record<string, IframePoolEntry>,
  activeSceneId: string | null,
): Record<string, IframePoolEntry> {
  const ids = Object.keys(entries);
  if (ids.length <= IFRAME_POOL_CAP) return entries;
  const evictable = ids.filter((id) => id !== activeSceneId).sort((a, b) => entries[a].tick - entries[b].tick);
  const next = { ...entries };
  let overflow = ids.length - IFRAME_POOL_CAP;
  for (const id of evictable) {
    if (overflow <= 0) break;
    delete next[id];
    overflow--;
  }
  return next;
}

export const useInteractiveIframePool = defineStore('openmaic-interactive-iframe-pool', {
  state: (): InteractiveIframePoolState => ({
    entries: {},
    activeSceneId: null,
    tick: 0,
  }),
  actions: {
    /**
     * 挂载/登记内容：
     * - 同一场景内容未变 → 只刷新最近使用时间（保活快路径，iframe 不重建）；
     * - 新场景或内容变化 → 重建记录（这是唯一的「有意重载」路径），并触发 LRU 淘汰。
     */
    mount(sceneId: string, input: MountInput) {
      const tick = this.tick + 1;
      const existing = this.entries[sceneId];
      // 内容相同：保活（保持原 srcDoc/src 引用，Host 不会重新设置从而触发重载）
      if (existing && existing.srcDoc === input.srcDoc && existing.src === input.src) {
        this.entries = { ...this.entries, [sceneId]: { ...existing, tick } };
        this.tick = tick;
        return;
      }
      const entry: IframePoolEntry = {
        srcDoc: input.srcDoc,
        src: input.src,
        rect: existing?.rect ?? null,
        owner: existing?.owner ?? null,
        tick,
      };
      this.entries = evictLru({ ...this.entries, [sceneId]: entry }, this.activeSceneId);
      this.tick = tick;
    },
    /** 上报屏幕矩形（占位组件 rAF 循环调用；无变化则不更新） */
    setRect(sceneId: string, rect: IframeRect) {
      const existing = this.entries[sceneId];
      if (!existing) return;
      const r = existing.rect;
      if (r && r.left === rect.left && r.top === rect.top && r.width === rect.width && r.height === rect.height) {
        return;
      }
      this.entries = { ...this.entries, [sceneId]: { ...existing, rect } };
    },
    /** 声明可见权：占位组件挂载时调用（记录 owner id） */
    claim(sceneId: string, owner: string) {
      const existing = this.entries[sceneId];
      if (!existing || existing.owner === owner) return;
      this.entries = { ...this.entries, [sceneId]: { ...existing, owner } };
    },
    /**
     * 释放可见权：仅当前 owner 可释放。
     * 旧占位在卸载清理时若发现 owner 已不是自己（被新占位重新认领），则 no-op，
     * 避免模式切换交叉淡入时误隐藏仍在使用中的 iframe。
     */
    release(sceneId: string, owner: string) {
      const existing = this.entries[sceneId];
      if (!existing || existing.owner !== owner) return;
      this.entries = { ...this.entries, [sceneId]: { ...existing, owner: null } };
    },
    /** 设置当前活动场景（Host 据此决定可见性） */
    setActive(sceneId: string) {
      this.activeSceneId = sceneId;
    },
    /** 移除某个场景的 iframe（内容变化重载或主动清除用） */
    evict(sceneId: string) {
      if (!this.entries[sceneId]) return;
      const entries = { ...this.entries };
      delete entries[sceneId];
      this.entries = entries;
      if (this.activeSceneId === sceneId) this.activeSceneId = null;
    },
    /** 清空全部（切换课堂时调用，防止旧课堂 iframe 残留） */
    reset() {
      this.entries = {};
      this.activeSceneId = null;
      this.tick = 0;
    },
  },
});
