import { NextRequest, NextResponse } from 'next/server'
import { getSubSceneById, getQAPairsBySubSceneId } from '@/lib/db/sub-scenes'
import { callLLM } from '@/lib/llm'
import type { ReviewRequest, ReviewResponse, ReviewHighlight, QAResponse } from '@/types'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sub-scenes/[subSceneId]/review
 * 对 passed=false 的对话条目调用 GLM-4-Flash 生成更地道的表达建议
 * LLM 调用失败时降级返回空 highlights 数组
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    // 解析请求体
    const body: ReviewRequest = await request.json()
    const { dialogueHistory } = body

    // 获取子场景信息
    const subScene = await getSubSceneById(subSceneId)
    if (!subScene) {
      return NextResponse.json({ error: 'Sub-scene not found' }, { status: 404 })
    }

    // 筛选出未通过的对话条目
    const failedEntries = dialogueHistory.filter(entry => !entry.passed)

    // 若无未通过条目，直接返回空 highlights
    if (failedEntries.length === 0) {
      const response: ReviewResponse = { highlights: [] }
      return NextResponse.json(response, { status: 200 })
    }

    // 获取问答对数据，用于提供参考回应
    const qaPairs = await getQAPairsBySubSceneId(subSceneId)
    const qaPairMap = new Map(qaPairs.map(qa => [qa.id, qa]))

    // 对每个未通过条目调用 LLM 生成建议（并行处理，降级容错）
    const highlightPromises = failedEntries.map(async (entry): Promise<ReviewHighlight | null> => {
      const qa = qaPairMap.get(entry.qaId)
      if (!qa) return null

      // 获取参考回应
      const responses: QAResponse[] = Array.isArray(qa.responses)
        ? (qa.responses as QAResponse[])
        : []
      const referenceText = responses.map(r => r.text).join(' / ')

      try {
        const messages = [
          {
            role: 'system' as const,
            content: `你是英语口语教练，专注于帮助学习者说出更地道的英语表达。
请分析用户的表达，指出问题并给出更地道的说法。
返回 JSON 格式：
{
  "issue": "问题描述（中文，20字以内）",
  "betterExpression": "更地道的英文表达"
}
只返回 JSON，不要有其他内容。`,
          },
          {
            role: 'user' as const,
            content: `场景：${subScene.name}
对方说：${qa.speakerText}（${qa.speakerTextCn}）
参考回应：${referenceText}
用户实际说的：${entry.userText}

请分析用户表达的问题，并给出更地道的说法。`,
          },
        ]

        const llmResult = await callLLM(messages, 0.5, 200, 'glm')

        // 解析 LLM 返回的 JSON
        const jsonMatch = llmResult.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return null

        const parsed = JSON.parse(jsonMatch[0])
        if (!parsed.issue || !parsed.betterExpression) return null

        return {
          qaId: entry.qaId,
          userText: entry.userText,
          issue: parsed.issue,
          betterExpression: parsed.betterExpression,
        }
      } catch (err) {
        // 单条 LLM 调用失败时跳过，不影响其他条目
        console.warn(`[review] qaId=${entry.qaId} LLM 分析失败，跳过:`, err)
        return null
      }
    })

    // 等待所有并行请求完成，过滤掉失败的条目
    const results = await Promise.all(highlightPromises)
    const highlights: ReviewHighlight[] = results.filter(
      (h): h is ReviewHighlight => h !== null
    )

    const response: ReviewResponse = { highlights }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    // 整体失败时降级返回空 highlights，不影响前端流程
    console.error(`[POST /api/sub-scenes/${subSceneId}/review] 处理失败，降级返回空结果:`, error)
    const response: ReviewResponse = { highlights: [] }
    return NextResponse.json(response, { status: 200 })
  }
}
