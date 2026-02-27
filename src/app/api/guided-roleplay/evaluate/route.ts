import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'

// 情景再现评测 API
export async function POST(request: Request) {
  try {
    const body: any = await request.json()
    const { dialogueGoal, userAnswer, keywords, evaluationDimensions } = body

    console.log('[情景再现评测] 开始处理:', new Date().toISOString())
    console.log('[情景再现评测] 对话目标:', dialogueGoal)
    console.log('[情景再现评测] 用户答案:', userAnswer)

    // 验证必要参数
    if (!dialogueGoal || !userAnswer) {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供对话目标(dialogueGoal)和用户答案(userAnswer)'
        },
        { status: 400 }
      )
    }

    // 构建评测维度文本
    const dimensionsText = evaluationDimensions && evaluationDimensions.length > 0
      ? evaluationDimensions.join('、')
      : '意图达成度、语言自然度、词汇使用'

    // 构建关键词提示文本
    const keywordsText = keywords && keywords.length > 0
      ? `参考关键词：${keywords.join(', ')}`
      : ''

    // 构建系统提示词
    const systemPrompt = `You are an English speaking coach evaluating a student's role-play response.

Evaluation dimensions: ${dimensionsText}
${keywordsText}

Evaluate the student's answer based on the dialogue goal. If the answer is completely unrelated to the goal, intentScore should be ≤ 20.

Output ONLY valid JSON, no other text:
{
  "intentScore": <number 0-100>,
  "naturalness": "<Chinese evaluation of language naturalness>",
  "vocabularyFeedback": "<Chinese evaluation of vocabulary usage>",
  "suggestions": ["<Chinese tip 1>", "<Chinese tip 2>", "<Chinese tip 3>"],
  "referenceExpression": "<English reference expression>"
}`.trim()

    // 构建用户消息
    const userContent = `Dialogue goal: ${dialogueGoal}\n\nStudent's answer: ${userAnswer}`

    // 构建消息历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]

    // 调用 LLM 进行评测
    const response = await callLLMForScene('question-evaluation', messages, 0.7, 600)
    const content = response.content

    // 默认评测结果（解析失败时使用）
    let evaluationResult = {
      intentScore: 50,
      naturalness: '回答已提交，请继续练习。',
      vocabularyFeedback: '词汇使用基本合理。',
      suggestions: ['尝试使用更多场景相关词汇', '注意语言的自然流畅度'],
      referenceExpression: ''
    }

    try {
      // 解析 JSON 格式的评测结果
      if (content) {
        const trimmedContent = content.trim()
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0])
          // 验证必要字段
          if (typeof parsedResult.intentScore === 'number') {
            evaluationResult = {
              intentScore: Math.max(0, Math.min(100, parsedResult.intentScore)),
              naturalness: parsedResult.naturalness || evaluationResult.naturalness,
              vocabularyFeedback: parsedResult.vocabularyFeedback || evaluationResult.vocabularyFeedback,
              suggestions: Array.isArray(parsedResult.suggestions) ? parsedResult.suggestions : evaluationResult.suggestions,
              referenceExpression: parsedResult.referenceExpression || ''
            }
          }
        }
      }
    } catch (error) {
      console.error('[情景再现评测] 解析评测结果失败:', error)
    }

    return NextResponse.json(evaluationResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '情景再现评测API错误'
    console.error('[情景再现评测] 处理错误:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
