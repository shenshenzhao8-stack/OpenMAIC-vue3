/**
 * 文件头：TTS 供应商启用判断（简化版）
 *
 * 对应原项目：lib/audio/provider-enablement.ts
 *
 * 功能：回答「某个 TTS 供应商现在能不能用」：
 *   - isTTSProviderConfigured：是否有可用凭据路径；
 *   - isTTSProviderEnabled：configured 且未被服务端禁用、用户开关未显式关闭。
 *   - browser-native（浏览器语音合成）天然可用，无需凭据。
 *
 * 与原项目的差异（裁剪说明）：
 *   原项目依赖 TTS_PROVIDERS 注册表（lib/audio/constants）与自定义供应商逻辑
 *   （lib/audio/types）；本项目 Phase 1 只有 browser-native 一个内置供应商，
 *   因此裁剪为通用规则：非 browser-native 的供应商需要 apiKey 或 baseUrl。
 *   后续接真实 TTS（后台接口）时再扩展注册表。
 */
/** 浏览器原生语音合成供应商 id */
export const BROWSER_NATIVE_TTS_PROVIDER_ID = 'browser-native-tts' as const;

/** TTS 供应商 id（开放字符串；browser-native 为内置） */
export type TTSProviderId = string;

/** 供应商启用判断依赖的配置切片（字段与原项目一致） */
export interface TTSEnablementConfig {
  apiKey?: string;
  baseUrl?: string;
  /** 用户级开关：缺失/true 允许；false 隐藏 */
  enabled?: boolean;
  isServerConfigured?: boolean;
  serverBaseUrl?: string;
  /** 服务端强制关闭（优先级最高） */
  serverDisabled?: boolean;
  requiresApiKey?: boolean;
}

type ConfigMap = Partial<Record<string, TTSEnablementConfig>>;

function hasText(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/** 该供应商是否有可用凭据路径 */
export function isTTSProviderConfigured(providerId: TTSProviderId, config: TTSEnablementConfig | undefined): boolean {
  // 浏览器原生合成在浏览器内运行，永远可用
  if (providerId === BROWSER_NATIVE_TTS_PROVIDER_ID) return true;
  if (!config) return false;
  if (config.isServerConfigured) return true;
  // 简化规则：有 apiKey 或（显式）baseUrl 即认为可用
  return hasText(config.apiKey) || hasText(config.baseUrl) || hasText(config.serverBaseUrl);
}

/** 该供应商当前是否可用：configured 且未被禁用 */
export function isTTSProviderEnabled(providerId: TTSProviderId, config: TTSEnablementConfig | undefined): boolean {
  if (config?.serverDisabled) return false; // 服务端优先级最高
  if (!isTTSProviderConfigured(providerId, config)) return false;
  return config?.enabled !== false;
}

/** 至少有一个 TTS 供应商可用（含 browser-native） */
export function hasAnyEnabledTTSProvider(config: ConfigMap): boolean {
  return Object.keys(config).some((id) => isTTSProviderEnabled(id, config[id]));
}

/** 全部可用的供应商 id 列表（简化：仅遍历配置键） */
export function listEnabledTTSProviderIds(config: ConfigMap): TTSProviderId[] {
  return Object.keys(config).filter((id) => isTTSProviderEnabled(id, config[id]));
}
