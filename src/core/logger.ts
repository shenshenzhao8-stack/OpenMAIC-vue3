/**
 * 文件头：轻量日志工具
 *
 * 对应原项目：lib/logger.ts
 *
 * 功能：带模块前缀的 console 日志封装，用于引擎/循环等核心模块的调试输出。
 * 原项目使用自定义 logger（支持级别/格式化），本项目裁剪为最小实现：
 *   - 所有方法透传 console；
 *   - 前缀格式：`[模块名] 消息`。
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/** 创建一个带模块前缀的 logger */
export function createLogger(module: string): Logger {
  const prefix = `[${module}]`
  return {
    debug: (message, ...args) => console.debug(prefix, message, ...args),
    info: (message, ...args) => console.info(prefix, message, ...args),
    warn: (message, ...args) => console.warn(prefix, message, ...args),
    error: (message, ...args) => console.error(prefix, message, ...args),
  }
}
