/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { id: string }
  }
) {
  const { id } = params

  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
    const sceneData = result[0]
    
    if (!sceneData) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    
    let tags = sceneData.tags
    if (typeof tags === 'string') {
      tags = JSON.parse(tags)
    }
    
    // 构建响应数据
    const scene = {
      id: sceneData.id,
      name: sceneData.name,
      category: sceneData.category,
      description: sceneData.description,
      difficulty: sceneData.difficulty,
      duration: sceneData.duration,
      tags: tags || [],
      createdAt: sceneData.created_at,
      updatedAt: sceneData.updated_at
    }
    
    return NextResponse.json(scene, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
