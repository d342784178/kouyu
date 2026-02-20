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
1. **正确性判断**（isCorrect）：
   - 对比用户答案和参考答案，判断是否表达了相同或相近的意思
   - 考虑同义词、不同表达方式、语法变体等情况
   - 如果用户答案在语义上与参考答案一致，即使措辞不同也应判定为正确
   - 如果用户答案存在明显语法错误或语义偏差，则判定为错误

2. **分析内容**（analysis）：
   - 说明用户答案与参考答案的对比结果
   - 指出用户答案的优点（如词汇使用、语法结构等）
   - 指出需要改进的地方
   - 解释为什么判定为正确或错误

3. **改进建议**（suggestions）：
   - 提供2-3条具体、可操作的改进建议
   - 建议应针对用户的具体错误类型（如词汇、语法、表达等）
   - 建议应帮助用户更好地理解和掌握相关知识点

## 输出要求
请以JSON格式输出结果，不要包含任何其他文字：
{
  "isCorrect": true/false,
  "analysis": "详细的分析说明，包括对比结果、优点和不足",
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"]
}

## 重要提示
1. isCorrect 必须是布尔值（true/false）
2. analysis 要具体、有建设性，解释判定原因
3. suggestions 数组应包含2-3条实用建议
4. 考虑英语表达的多样性，不要仅因措辞不同就判定为错误
5. 如果用户答案使用了正确的同义词或等价表达，应判定为正确
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
      // 返回错误信息
      return NextResponse.json(
        {
          error: 'GLM API调用失败',
          message: error instanceof Error ? error.message : '未知错误'
        },
        {
          status: 500
        }
      )
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
