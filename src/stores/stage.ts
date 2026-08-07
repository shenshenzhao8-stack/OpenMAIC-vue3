/**
 * 文件头：stage store（Pinia）
 *
 * 对应原项目：lib/store/stage.ts（Zustand）——「舞台 / 世界状态」
 *
 * 功能：课堂播放的核心数据仓库：
 *   - stage：课程元信息；
 *   - scenes：全部场景（剧本本体）；
 *   - currentSceneId：当前第几页（翻页的唯一真相源）；
 *   - mode：播放 / 编辑模式。
 *
 * 为什么仿写为 Pinia：原 store 还有生成/大纲/聊天持久化等大量状态，
 * 本项目裁剪后只保留播放必需部分；字段名与 action 名
 * （setScenes / setCurrentSceneId / updateScene / setMode ...）保持一致，
 * 供后续场景渲染器与播放引擎接线使用。
 */
import { defineStore } from 'pinia'
import type { Scene, Stage, StageMode } from '@/types/stage'

/** stage store 状态 */
interface StageState {
  stage: Stage | null
  scenes: Scene[]
  currentSceneId: string | null
  mode: StageMode
}

export const useStageStore = defineStore('stage', {
  state: (): StageState => ({
    stage: null,
    scenes: [],
    currentSceneId: null,
    mode: 'playback',
  }),
  getters: {
    /** 当前场景（按 currentSceneId 查找；没有则返回 null） */
    currentScene(state): Scene | null {
      if (!state.currentSceneId) return null
      return state.scenes.find((s) => s.id === state.currentSceneId) ?? null
    },
  },
  actions: {
    setStage(stage: Stage) {
      this.stage = stage
    },
    setScenes(scenes: Scene[]) {
      this.scenes = scenes
    },
    /** 设置当前页（翻页的唯一入口，后续播放引擎/侧边栏都调它） */
    setCurrentSceneId(sceneId: string | null) {
      this.currentSceneId = sceneId
    },
    setMode(mode: StageMode) {
      this.mode = mode
    },
    /**
     * 更新某个场景（合并 Partial 字段）。
     * 注意：Scene 是判别联合（type 与 content 强绑定），展开 Partial 会丢失判别
     * 信息，因此这里显式断言为 Scene —— 调用方需保证不混用 type/content。
     */
    updateScene(sceneId: string, updates: Partial<Scene>) {
      const index = this.scenes.findIndex((s) => s.id === sceneId)
      if (index >= 0) {
        this.scenes[index] = { ...this.scenes[index], ...updates } as Scene
      }
    },
    /** 按 id 查找场景 */
    getSceneById(sceneId: string): Scene | null {
      return this.scenes.find((s) => s.id === sceneId) ?? null
    },
    /** 清空舞台（切换课程时调用） */
    clearStore() {
      this.stage = null
      this.scenes = []
      this.currentSceneId = null
      this.mode = 'playback'
    },
  },
})
