/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景列表
    let rawScenes
    try {
      rawScenes = await neonSql`SELECT * FROM scenes ORDER BY category, name`
    } catch (error) {
      console.error('Error fetching scenes from database:', error)
      // 数据库查询失败，返回空数组
      return NextResponse.json([], { status: 500 })
    }
    
    // 手动映射数据
    const allScenes = rawScenes.map((scene: any) => ({
      id: scene.id,
      name: scene.name,
      category: scene.category,
      description: scene.description,
      difficulty: scene.difficulty,
      duration: scene.duration,
      tags: scene.tags,
      dialogue: scene.dialogue,
      vocabulary: scene.vocabulary,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at
    }))
    
    return NextResponse.json(allScenes, { status: 200 })
  } catch (error) {
    console.error('Error fetching scenes:', error)
    // 服务器错误，返回空数组
    return NextResponse.json([], { status: 500 })
  }
}
