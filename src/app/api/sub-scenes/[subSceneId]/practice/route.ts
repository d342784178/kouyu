import { NextResponse } from 'next/server'
import { getPracticeQuestionsBySubSceneId } from '@/lib/db/sub-scenes'
import type { PracticeQuestion } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/sub-scenes/[subSceneId]/practice
 * 从数据库获取子场景练习题（选择题 → 填空题 → 问答题）
 */
export async function GET(
  _request: Request,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    const dbQuestions = await getPracticeQuestionsBySubSceneId(subSceneId)

    const questions = dbQuestions.map(q => q.content as PracticeQuestion)

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
    console.error(`[GET /api/sub-scenes/${subSceneId}/practice] 获取练习题失败:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
