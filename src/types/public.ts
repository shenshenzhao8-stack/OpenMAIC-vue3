/**
 * 文件头：包公开类型（对外契约）
 *
 * 对应改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 2（分离包入口）与
 *           Phase 5.1（公开组件契约）
 *
 * 功能：定义 workspace 包对外暴露的类型，宿主只能通过这些类型与公开入口交互，
 * 不暴露内部 Store、引擎实例与实现细节。
 *
 * 范围说明：首期只公开 classroomId（Phase 1 已实现）；assetBaseUrl（资源根）
 * 与 loadClassroom（可替换 loader）分别在 Phase 3 / 建议项中扩展，避免契约先于实现。
 */
import type { ClassroomData } from '#/api/client'

/** 课堂播放组件 props（首期：课堂 id） */
export interface OpenMaicClassroomProps {
  /** 课堂 id（由宿主从自身路由/业务上下文获取） */
  classroomId: string
}

/** 课堂数据（课程元信息 + 全部场景），load-success 事件负载 */
export type { ClassroomData }
