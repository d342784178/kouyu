import { NextResponse } from 'next/server'
import { getSubSceneById, getQAPairsBySubSceneId, getSubScenesBySceneId } from '@/lib/db/sub-scenes'
import type { SubSceneDetailResponse } from '@/types'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/sub-scenes/[subSceneId]
 * 获取子场景详情，包含 QA_Pairs 列表和位置信息（totalSubScenes / currentIndex）
 */
export async function GET(
  _request: Request,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    // 获取子场景基本信息
    const subScene = await getSubSceneById(subSceneId)
    if (!subScene) {
      return NextResponse.json({ error: 'Sub-scene not found' }, { status: 404 })
    }

    // 并行获取问答对列表和同场景所有子场景
    const [qaPairs, allSubScenes] = await Promise.all([
      getQAPairsBySubSceneId(subSceneId),
      getSubScenesBySceneId(subScene.sceneId),
    ])

    // 计算当前子场景在场景中的位置（1-based）
    const currentIndex = allSubScenes.findIndex(s => s.id === subSceneId) + 1
    const totalSubScenes = allSubScenes.length

    const response: SubSceneDetailResponse = {
      subScene,
      qaPairs,
      totalSubScenes,
      currentIndex,
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error(`[GET /api/sub-scenes/${subSceneId}] 获取子场景详情失败:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
