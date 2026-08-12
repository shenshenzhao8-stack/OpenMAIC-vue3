/**
 * 文件头：静态资源路径解析工具
 *
 * 对应改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 3.2（资源路径适配）
 *
 * 功能：把 mock/后端返回的「根相对路径」（如 /audio/a1.mp3）解析为可播放/可访问的
 * 完整地址：
 *   - 独立应用（assetBaseUrl 为空）：保持 `/audio/a1.mp3` 不变（public 目录根路径）；
 *   - Web 宿主（传入资源根）：拼成 `<assetBaseUrl>/audio/a1.mp3`；
 *   - 完整 URL / blob / data URI：原样返回，不改写。
 */

/**
 * 解析资源地址。
 * 参数：path 资源路径；assetBaseUrl 资源根（可空）；
 * 返回：可访问的完整地址。
 * 说明：data URI（如 mock slide 图片）与完整协议 URL 不做任何拼接，避免误改写。
 */
export function resolveAssetUrl(path: string, assetBaseUrl = ''): string {
  // 完整 URL / blob / data URI 原样返回
  if (/^(?:https?:|blob:|data:)/.test(path)) return path
  // 去掉开头的斜杠，去掉 base 结尾的斜杠，再拼接
  const normalizedPath = path.replace(/^\/+/, '')
  const normalizedBase = assetBaseUrl.replace(/\/+$/, '')
  return normalizedBase ? `${normalizedBase}/${normalizedPath}` : `/${normalizedPath}`
}
