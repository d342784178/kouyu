import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'

// 问答题评测
export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { question, userAnswer, referenceAnswers } = body

    console.log('[问答题评测] 开始处理:', new Date().toISOString())
    console.log('[问答题评测] 题目:', question)
    console.log('[问答题评测] 用户答案:', userAnswer)
    console.log('[问答题评测] 标准回答列表:', referenceAnswers?.map((ra: any) => ra.text).join(', '))

    // 验证必要参数
    if (!question || !userAnswer) {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供题目(question)和用户答案(userAnswer)'
        },
        {
          status: 400
        }
      )
    }

    // 构建标准回答列表文本
    const referenceAnswersText = referenceAnswers && referenceAnswers.length > 0
      ? referenceAnswers.map((ra: any, idx: number) => 
          `${idx + 1}. ${ra.text}${ra.description ? `（${ra.description}）` : ''}`
        ).join('\n')
      : ''

    // 构建系统提示词（参考答案放在 system prompt，避免 user 消息中的措辞矛盾）
    const systemPrompt = `You are an English speaking evaluator. Evaluate whether the user's answer matches the expected expression for the given question.

Evaluation criteria:
1. isCorrect: Compare the user's answer against the expected expressions. Accept synonyms, paraphrases, and grammatical variants that convey the same meaning.
2. analysis: Write in Chinese. Explain why the answer is correct or incorrect. Be specific and constructive. Do NOT mention "参考答案" or "标准回答".
3. suggestions: 2-3 actionable improvement tips in Chinese.

${referenceAnswersText ? `Expected expressions for this question:\n${referenceAnswersText}\n` : ''}
Output ONLY valid JSON, no other text:
{
  "isCorrect": true/false,
  "analysis": "<Chinese explanation>",
  "suggestions": ["<tip1>", "<tip2>", "<tip3>"]
}`.trim()

    // 构建评测内容（user 消息只含题目和用户回答）
    const evaluationContent = `Question: ${question}\n\nUser's answer: ${userAnswer}`

    // 构建消息历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    // 调用LLM API - 问答题评测使用高质量模型
    const response = await callLLMForScene('question-evaluation', messages, 0.7, 500)
    const content = response.content

    // 处理评测响应
    let evaluationResult = {
      isCorrect: false,
      analysis: '回答已提交。',
      suggestions: ['继续保持良好的学习习惯']
    }

    try {
      // 尝试解析JSON格式的评测结果
      if (content) {
        const trimmedContent = content.trim()

        // 提取JSON部分
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0])
          // 验证解析结果是否包含必要字段
          if (typeof parsedResult.isCorrect === 'boolean' && parsedResult.analysis) {
            evaluationResult = {
              isCorrect: parsedResult.isCorrect,
              analysis: parsedResult.analysis,
              suggestions: parsedResult.suggestions || []
            }
          }
        }
      }
    } catch (error) {
      console.error('[问答题评测] 解析评测结果失败:', error)
    }

    return NextResponse.json(evaluationResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '问答题评测API错误'
    console.error('[问答题评测] 处理错误:', errorMessage)
    return NextResponse.json(
      {
        error: errorMessage
      },
      {
        status: 500
      }
    )
  }
}
