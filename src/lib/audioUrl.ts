/**
 * 音频URL构建工具
 * 支持多种存储协议，便于切换存储服务商
 */

// 存储配置映射
const STORAGE_CONFIG: Record<string, { baseUrl: string; bucket?: string }> = {
  // 腾讯云 COS
  COS: {
    baseUrl: process.env.NEXT_PUBLIC_COS_BASE_URL || '',
  },
  // 腾讯云 COS (别名)
  TX_COS: {
    baseUrl: process.env.NEXT_PUBLIC_COS_BASE_URL || '',
  },
  // Vercel Blob
  BLOB: {
    baseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL || '',
  },
  // AWS S3
  S3: {
    baseUrl: process.env.NEXT_PUBLIC_S3_BASE_URL || '',
  },
  // 阿里云 OSS
  OSS: {
    baseUrl: process.env.NEXT_PUBLIC_OSS_BASE_URL || '',
  },
};

/**
 * 是否使用代理模式访问音频
 * 设置为 true 时，前端通过后端接口代理访问音频文件
 * 设置为 false 时，前端直接访问存储服务
 */
const USE_PROXY_MODE = true;

/**
 * 构建完整的音频URL（直接访问存储服务）
 * @param relativePath - 相对路径，格式: "PROTOCOL:/path/to/file.mp3"
 * @returns 完整的音频URL
 * 
 * 示例:
 * - buildAudioUrl('COS:/scene/dialogues/daily_001_round1_speaker1.mp3')
 *   -> 'https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/scene/dialogues/daily_001_round1_speaker1.mp3'
 * 
 * - buildAudioUrl('BLOB:/audio/scene_1.mp3')
 *   -> 'https://xxx.vercel-storage.com/audio/scene_1.mp3'
 */
export function buildAudioUrl(relativePath: string | null | undefined): string {
  if (!relativePath) {
    return '';
  }

  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // 解析协议和路径
  const match = relativePath.match(/^([A-Z_]+):\/(.*)$/);
  if (!match) {
    console.warn('Invalid audio path format:', relativePath);
    return relativePath;
  }

  const [, protocol, path] = match;
  const config = STORAGE_CONFIG[protocol];

  if (!config) {
    console.warn('Unknown storage protocol:', protocol);
    return relativePath;
  }

  return `${config.baseUrl}/${path}`;
}

/**
 * 构建音频代理URL（通过后端接口访问）
 * @param relativePath - 相对路径，格式: "PROTOCOL:/path/to/file.mp3"
 * @returns 音频代理URL
 * 
 * 示例:
 * - buildAudioProxyUrl('COS:/scene/dialogues/daily_001_round1_speaker1.mp3')
 *   -> '/api/audio/proxy?path=COS%3A%2Fscene%2Fdialogues%2Fdaily_001_round1_speaker1.mp3'
 */
export function buildAudioProxyUrl(relativePath: string | null | undefined): string {
  if (!relativePath) {
    return '';
  }

  // 如果已经是完整URL，转换为代理格式
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return `/api/audio/proxy?path=${encodeURIComponent(relativePath)}`;
  }

  // 验证路径格式
  const match = relativePath.match(/^([A-Z_]+):\/(.*)$/);
  if (!match) {
    console.warn('Invalid audio path format:', relativePath);
    return relativePath;
  }

  return `/api/audio/proxy?path=${encodeURIComponent(relativePath)}`;
}

/**
 * 获取音频URL（根据配置决定使用直接访问还是代理模式）
 * @param relativePath - 相对路径，格式: "PROTOCOL:/path/to/file.mp3"
 * @returns 音频URL
 */
export function getAudioUrl(relativePath: string | null | undefined): string {
  if (USE_PROXY_MODE) {
    return buildAudioProxyUrl(relativePath);
  }
  return buildAudioUrl(relativePath);
}

/**
 * 批量构建音频URL
 * @param paths - 相对路径数组
 * @returns 完整URL数组
 */
export function buildAudioUrls(paths: (string | null | undefined)[]): string[] {
  return paths.map(buildAudioUrl);
}

/**
 * 检查路径是否为相对路径格式
 * @param path - 路径字符串
 */
export function isRelativePath(path: string): boolean {
  return /^[A-Z_]+:\//.test(path);
}

/**
 * 获取当前使用的存储协议
 * @param path - 路径字符串
 */
export function getStorageProtocol(path: string): string | null {
  const match = path.match(/^([A-Z_]+):\//);
  return match ? match[1] : null;
}
