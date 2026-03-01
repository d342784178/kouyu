import { NextResponse } from 'next/server'
import { getQAPairsBySubSceneId } from '@/lib/db/sub-scenes'
import { generatePracticeQuestions } from '@/lib/scene-learning/practice'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/sub-scenes/[subSceneId]/practice
 * 动态生成子场景练习题（选择题 → 填空题 → 问答题）
 */
export async function GET(
  _request: Request,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    // 获取该子场景下所有问答对
    const qaPairs = await getQAPairsBySubSceneId(subSceneId)

    // 根据问答对生成练习题
    const questions = generatePracticeQuestions(qaPairs)

    return NextResponse.json(
      { questions },
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
    console.error(`[GET /api/sub-scenes/${subSceneId}/practice] 生成练习题失败:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
