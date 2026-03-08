/**
 * 场景数据获取模块
 * 用于服务端组件中获取场景数据
 */
import { neon } from '@neondatabase/serverless'
import type { Scene } from '@/types'

// 数据库返回的原始场景数据类型
interface RawSceneData {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  duration: number
  tags: string | string[]
  created_at: string
  updated_at: string
}

/**
 * 从数据库获取场景详情
 * @param id - 场景ID
 * @returns 场景数据或null
 */
export async function getSceneById(id: string): Promise<Scene | null> {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
    
    if (!result || result.length === 0) {
      return null
    }
    
    const sceneData = result[0] as RawSceneData
    
    let tags = sceneData.tags
    if (typeof tags === 'string') {
      tags = JSON.parse(tags)
    }
    
    return {
      id: sceneData.id,
      name: sceneData.name,
      category: sceneData.category,
      description: sceneData.description,
      difficulty: sceneData.difficulty,
      duration: sceneData.duration,
      tags: (tags as string[]) || [],
      createdAt: sceneData.created_at,
      updatedAt: sceneData.updated_at
    }
  } catch (error) {
    console.error(`[getSceneById] 获取场景 ${id} 失败:`, error)
    return null
  }
}

/**
 * 获取所有场景ID列表
 * 用于 generateStaticParams
 */
export async function getAllSceneIds(): Promise<string[]> {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    const result = await neonSql`SELECT id FROM scenes`
    return (result as { id: string }[]).map((row) => row.id)
  } catch (error) {
    console.error('[getAllSceneIds] 获取场景ID列表失败:', error)
    return []
  }
}

/**
 * 获取场景元数据（用于SEO）
 * @param id - 场景ID
 */
export async function getSceneMetadata(id: string): Promise<{
  title: string
  description: string
  category: string
  difficulty: string
  tags: string[]
} | null> {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    const result = await neonSql`
      SELECT name, description, category, difficulty, tags 
      FROM scenes 
      WHERE id = ${id}
    `
    
    if (!result || result.length === 0) {
      return null
    }
    
    const data = result[0] as {
      name: string
      description: string
      category: string
      difficulty: string
      tags: string | string[]
    }
    
    let tags = data.tags
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags)
      } catch {
        tags = []
      }
    }
    
    return {
      title: data.name,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      tags: (tags as string[]) || []
    }
  } catch (error) {
    console.error(`[getSceneMetadata] 获取场景 ${id} 元数据失败:`, error)
    return null
  }
}
