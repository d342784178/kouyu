import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'

// 填空题评测
export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { question, userAnswer, correctAnswer } = body

    console.log('[填空题评测] 开始处理:', new Date().toISOString())
    console.log('[填空题评测] 题目:', question)
    console.log('[填空题评测] 用户答案:', userAnswer)
    console.log('[填空题评测] 正确答案:', correctAnswer)

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

    // 构建系统提示词
    const systemPrompt = `
你是一位专业的英语评测专家。请评测用户的填空题回答，判断是否符合题目要求并给出分析。

## 评测标准
1. 判断用户回答是否符合题目要求（isCorrect: true/false）
2. 分析用户回答的优点和不足
3. 给出具体的改进建议

## 输出要求
请以JSON格式输出结果：
{
  "isCorrect": true,
  "analysis": "用户回答基本符合题目要求，语法正确，表达清晰。",
  "suggestions": ["建议1", "建议2"]
}

## 重要提示
1. isCorrect 表示回答是否正确（布尔值）
2. analysis 要具体、有建设性，解释为什么对或错
3. suggestions 要实用、可操作，帮助用户改进
4. 即使用户回答与标准答案不完全一致，只要符合题目要求也可以认为是正确的
`.trim()

    // 构建评测内容
    const evaluationContent = `
题目：${question}
${correctAnswer ? `参考答案：${correctAnswer}` : ''}
用户回答：${userAnswer}

请评测用户的回答是否符合题目要求，并给出分析。
`.trim()

    // 构建消息历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    console.log('[填空题评测] 调用GLM API...')

    try {
      // 调用GLM API
      const response = await callLLM(messages, 0.7, 500)
      const content = response.content

      console.log('[填空题评测] 原始评测结果:', content)

      // 处理评测响应
      let evaluationResult = {
        isCorrect: correctAnswer 
          ? userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
          : true,
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
              console.log('[填空题评测] 解析的评测结果:', evaluationResult)
            } else {
              console.log('[填空题评测] 解析结果缺少必要字段，使用默认评测结果')
            }
          } else {
            console.log('[填空题评测] 使用默认评测结果')
          }
        }
      } catch (error) {
        console.error('[填空题评测] 解析评测结果失败:', error)
      }

      console.log('[填空题评测] 评测完成:', evaluationResult)
      console.log('[填空题评测] 处理时间:', Date.now() - startTime, 'ms')

      return NextResponse.json(evaluationResult)
    } catch (error) {
      console.error('[填空题评测] GLM API调用失败:', error)
      // 返回默认结果
      return NextResponse.json({
        isCorrect: correctAnswer 
          ? userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
          : true,
        analysis: '回答已提交，请参考参考答案。',
        suggestions: ['对比你的答案和参考答案', '注意语法和词汇的使用']
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '填空题评测API错误'
    console.error('[填空题评测] 处理错误:', errorMessage)
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
