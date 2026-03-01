/**
 * 学习进度管理工具函数（客户端工具，使用 localStorage）
 * 注意：这些函数仅在客户端运行，需要处理服务端渲染（SSR）的情况
 */

import type { SubSceneProgress } from '@/types'

/**
 * localStorage key 前缀
 */
const PROGRESS_KEY_PREFIX = 'sub_scene_progress_'

/**
 * 判断当前是否在客户端环境（避免 SSR 报错）
 */
function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * 保存子场景学习进度到 localStorage
 * key 格式：`sub_scene_progress_${subSceneId}`
 *
 * @param subSceneId 子场景 id
 * @param progress 进度对象
 */
export function saveProgress(subSceneId: string, progress: SubSceneProgress): void {
  // SSR 环境下跳过
  if (!isClient()) return

  try {
    const key = `${PROGRESS_KEY_PREFIX}${subSceneId}`
    localStorage.setItem(key, JSON.stringify(progress))
  } catch {
    // localStorage 不可用时静默失败（如隐私模式或存储已满）
    console.warn(`[progress] 保存进度失败，subSceneId: ${subSceneId}`)
  }
}

/**
 * 从 localStorage 读取子场景学习进度
 *
 * @param subSceneId 子场景 id
 * @returns 进度对象，不存在时返回 null
 */
export function loadProgress(subSceneId: string): SubSceneProgress | null {
  // SSR 环境下返回 null
  if (!isClient()) return null

  try {
    const key = `${PROGRESS_KEY_PREFIX}${subSceneId}`
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as SubSceneProgress
  } catch {
    // JSON 解析失败时返回 null
    console.warn(`[progress] 读取进度失败，subSceneId: ${subSceneId}`)
    return null
  }
}

/**
 * 验证填空题答案是否有效
 * 纯空白字符串（空格、制表符、换行等）返回 false
 * 有实际内容返回 true
 *
 * @param answer 用户填写的答案
 * @returns 答案是否有效
 */
export function validateFillBlankAnswer(answer: string): boolean {
  return answer.trim().length > 0
}
