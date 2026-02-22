/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    
    // 返回数据，禁用缓存
    return NextResponse.json(allScenes, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error fetching scenes:', error)
    // 服务器错误，返回空数组
    return NextResponse.json([], { status: 500 })
  }
}
