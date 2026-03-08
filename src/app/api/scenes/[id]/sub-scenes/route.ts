import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSubScenesBySceneId } from '@/lib/db/sub-scenes'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/scenes/[id]/sub-scenes
 * 获取指定场景下的所有子场景列表，同时返回场景基本信息
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const neonSql = neon(process.env.DATABASE_URL || '')

    // 并行获取场景信息和子场景列表
    const [sceneResult, subScenes] = await Promise.all([
      neonSql`SELECT id, name, description, category, difficulty FROM scenes WHERE id = ${id}`,
      getSubScenesBySceneId(id),
    ])

    // 场景不存在时返回 404
    if (!sceneResult || sceneResult.length === 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const scene = sceneResult[0]

    return NextResponse.json(
      { scene, subScenes },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error(`[GET /api/scenes/${id}/sub-scenes] 获取子场景列表失败:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
