import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// POST /api/sub-scenes/[subSceneId]/speaking-practice
// 开口练习评估接口（空实现）
// ============================================================

interface SpeakingPracticeRequest {
  /** 用户语音识别文本 */
  userText: string
  /** 目标答案文本 */
  targetText: string
  /** 目标答案索引 */
  answerIndex: number
  /** QA Pair ID */
  qaId: string
}

interface SpeakingPracticeResponse {
  /** 是否通过 */
  passed: boolean
  /** 评估分数（0-100） */
  score: number
  /** 反馈消息 */
  feedback: string
  /** 是否为空实现 */
  isEmptyImplementation: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: { subSceneId: string } }
) {
  try {
    const { subSceneId } = params
    const body: SpeakingPracticeRequest = await request.json()

    const { userText, targetText, answerIndex, qaId } = body

    if (!userText || !targetText) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log('[Speaking Practice API] 收到请求:', {
      subSceneId,
      qaId,
      answerIndex,
      userText,
      targetText,
    })

    // 空实现：简单的文本匹配判断
    const normalizeText = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

    const normalizedUser = normalizeText(userText)
    const normalizedTarget = normalizeText(targetText)

    // 计算相似度（简单的词匹配）
    const userWords = normalizedUser.split(/\s+/).filter(Boolean)
    const targetWords = normalizedTarget.split(/\s+/).filter(Boolean)

    let matchCount = 0
    for (const word of userWords) {
      if (targetWords.includes(word)) {
        matchCount++
      }
    }

    const similarity = targetWords.length > 0 ? matchCount / targetWords.length : 0
    const passed = similarity >= 0.6
    const score = Math.round(similarity * 100)

    const response: SpeakingPracticeResponse = {
      passed,
      score,
      feedback: passed
        ? '很好！发音正确'
        : `匹配度 ${score}%，再试一次`,
      isEmptyImplementation: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Speaking Practice API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
