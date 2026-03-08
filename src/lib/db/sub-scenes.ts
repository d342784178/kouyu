/**
 * 子场景数据访问模块
 * 提供子场景（sub_scenes）和问答对（qa_pairs）的数据库查询函数
 */
import { eq, asc } from 'drizzle-orm'
import { db } from './index'
import { subScenes, qaPairs, subScenePracticeQuestions } from './schema'
import type { SubScene, QAPair, SubScenePracticeQuestion, NewSubScenePracticeQuestion } from './schema'

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

/**
 * 获取某子场景下所有练习题，按 order 升序排列
 * @param subSceneId - 子场景ID
 * @returns 练习题列表，若无数据则返回空数组
 */
export async function getPracticeQuestionsBySubSceneId(subSceneId: string): Promise<SubScenePracticeQuestion[]> {
  try {
    const result = await db
      .select()
      .from(subScenePracticeQuestions)
      .where(eq(subScenePracticeQuestions.subSceneId, subSceneId))
      .orderBy(asc(subScenePracticeQuestions.order))

    return result
  } catch (error) {
    console.error(`[getPracticeQuestionsBySubSceneId] 获取子场景 ${subSceneId} 的练习题失败:`, error)
    return []
  }
}

/**
 * 批量插入练习题
 * @param questions - 要插入的练习题数组
 * @returns 插入的记录数
 */
export async function insertPracticeQuestions(questions: NewSubScenePracticeQuestion[]): Promise<number> {
  try {
    if (questions.length === 0) return 0
    await db.insert(subScenePracticeQuestions).values(questions)
    return questions.length
  } catch (error) {
    console.error('[insertPracticeQuestions] 批量插入练习题失败:', error)
    return 0
  }
}

/**
 * 删除某子场景的所有练习题
 * @param subSceneId - 子场景ID
 * @returns 删除的记录数
 */
export async function deletePracticeQuestionsBySubSceneId(subSceneId: string): Promise<number> {
  try {
    const result = await db
      .delete(subScenePracticeQuestions)
      .where(eq(subScenePracticeQuestions.subSceneId, subSceneId))
      .returning({ id: subScenePracticeQuestions.id })
    return result.length
  } catch (error) {
    console.error(`[deletePracticeQuestionsBySubSceneId] 删除子场景 ${subSceneId} 的练习题失败:`, error)
    return 0
  }
}

/**
 * 获取所有子场景 ID 列表
 * @returns 子场景 ID 数组
 */
export async function getAllSubSceneIds(): Promise<string[]> {
  try {
    const result = await db
      .select({ id: subScenes.id })
      .from(subScenes)
    return result.map(r => r.id)
  } catch (error) {
    console.error('[getAllSubSceneIds] 获取所有子场景ID失败:', error)
    return []
  }
}

/**
 * 检查某子场景是否已有练习题
 * @param subSceneId - 子场景ID
 * @returns 是否存在练习题
 */
export async function hasPracticeQuestions(subSceneId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: subScenePracticeQuestions.id })
      .from(subScenePracticeQuestions)
      .where(eq(subScenePracticeQuestions.subSceneId, subSceneId))
      .limit(1)
    return result.length > 0
  } catch (error) {
    console.error(`[hasPracticeQuestions] 检查子场景 ${subSceneId} 练习题失败:`, error)
    return false
  }
}
