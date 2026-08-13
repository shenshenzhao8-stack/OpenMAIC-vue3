/**
 * 文件头：包公开类型（对外契约）
 *
 * 对应改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 2（分离包入口）与
 *           Phase 5.1（公开组件契约）
 *
 * 功能：定义 workspace 包对外暴露的类型，宿主只能通过这些类型与公开入口交互，
 * 不暴露内部 Store、引擎实例与实现细节。
 *
 * 范围说明：classroomId 与 assetBaseUrl（资源根）已落地（Phase 1/3）；
 * loadClassroom（可替换 loader）为建议项，待 Web 真实需求时扩展。
 */
// 公共类型文件使用相对路径，避免对外暴露只能在包内解析的 alias
import type { ClassroomData } from '../api/client';

/** 课堂播放组件 props（首期：课堂 id） */
export interface OpenMaicClassroomProps {
  /** 课堂 id（由宿主从自身路由/业务上下文获取） */
  classroomId: string;
  /**
   * 资源根（可选）：用于解析 mock/后端返回的根相对路径（如 /audio/a1.mp3）。
   * 独立应用不传（保持根路径）；Web 宿主传自己的资源域名/前缀。
   */
  assetBaseUrl?: string;
}

/** 课堂数据（课程元信息 + 全部场景），load-success 事件负载 */
export type { ClassroomData };
