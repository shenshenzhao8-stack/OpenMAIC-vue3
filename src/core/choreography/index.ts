/**
 * 文件头：choreography 模块出口（裁剪版）
 *
 * 对应原项目：lib/choreography/index.ts
 *
 * 原项目还导出 timeline（index→time 展开）与 descriptors（动画描述符），
 * 本项目裁剪范围不需要（无视频导出、无 GSAP 动画），故只保留：
 *   - timing.ts：时序常量 + 朗读时长估算；
 *   - cursor.ts：播放游标解析。
 */
export * from './timing'
export * from './cursor'
