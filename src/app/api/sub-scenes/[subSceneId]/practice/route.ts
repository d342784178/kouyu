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

    const questions = dbQuestions.map(q => {
      const content = q.content as any
      // 处理填空题字段不匹配问题：responseTemplate -> template
      if (content.type === 'fill_blank' && content.responseTemplate) {
        content.template = content.responseTemplate
        delete content.responseTemplate
      }
      // 处理字段名称映射：speakerText -> triggerText, speakerTextCn -> triggerTextCn
      if (content.speakerText) {
        content.triggerText = content.speakerText
        delete content.speakerText
      }
      if (content.speakerTextCn) {
        content.triggerTextCn = content.speakerTextCn
        delete content.speakerTextCn
      }
      return content as PracticeQuestion
    })

    // 按题型排序：选择题 -> 填空题 -> 问答题
    const typeOrder: Record<string, number> = {
      choice: 1,
      fill_blank: 2,
      speaking: 3,
    }
    questions.sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99))

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
