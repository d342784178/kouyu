/**
 * 子场景数据访问模块
 * 提供子场景（sub_scenes）和问答对（qa_pairs）的数据库查询函数
 */
import { eq, asc } from 'drizzle-orm'
import { db } from './index'
import { subScenes, qaPairs } from './schema'
import type { SubScene, QAPair } from './schema'

/**
 * 获取某场景下所有子场景，按 order 升序排列
 * @param sceneId - 场景ID
 * @returns 子场景列表，若无数据则返回空数组
 */
export async function getSubScenesBySceneId(sceneId: string): Promise<SubScene[]> {
  try {
    const result = await db
      .select()
      .from(subScenes)
      .where(eq(subScenes.sceneId, sceneId))
      .orderBy(asc(subScenes.order))

    return result
  } catch (error) {
    console.error(`[getSubScenesBySceneId] 获取场景 ${sceneId} 的子场景失败:`, error)
    return []
  }
}

/**
 * 获取单个子场景详情
 * @param subSceneId - 子场景ID
 * @returns 子场景数据，若不存在则返回 null
 */
export async function getSubSceneById(subSceneId: string): Promise<SubScene | null> {
  try {
    const result = await db
      .select()
      .from(subScenes)
      .where(eq(subScenes.id, subSceneId))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return result[0]
  } catch (error) {
    console.error(`[getSubSceneById] 获取子场景 ${subSceneId} 失败:`, error)
    return null
  }
}

/**
 * 获取某子场景下所有问答对，按 order 升序排列
 * @param subSceneId - 子场景ID
 * @returns 问答对列表，若无数据则返回空数组
 */
export async function getQAPairsBySubSceneId(subSceneId: string): Promise<QAPair[]> {
  try {
    const result = await db
      .select()
      .from(qaPairs)
      .where(eq(qaPairs.subSceneId, subSceneId))
      .orderBy(asc(qaPairs.order))

    return result
  } catch (error) {
    console.error(`[getQAPairsBySubSceneId] 获取子场景 ${subSceneId} 的问答对失败:`, error)
    return []
  }
}
