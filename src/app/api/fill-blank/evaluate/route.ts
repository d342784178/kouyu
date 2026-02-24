import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'

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

    // 构建系统提示词
    const systemPrompt = `
你是一位专业的英语口语评测专家。请评测用户的问答题回答，判断是否符合题目要求并给出分析。

## 评测标准
1. **正确性判断**（isCorrect）：
   - 将用户回答与标准回答列表进行对比，判断是否表达了相同或相近的意思
   - 考虑同义词、不同表达方式、语法变体等情况
   - 如果用户回答在意图上与任一标准回答一致，即使措辞不同也应判定为正确
   - 如果用户回答存在明显语法错误或语义偏差，则判定为错误

2. **分析内容**（analysis）：
   - 使用中文说明用户回答的质量
   - 指出用户回答的优点（如词汇使用、语法结构等）
   - 指出需要改进的地方
   - 解释为什么判定为正确或错误
   - **分析中不要提到"参考答案"或"标准回答"等字眼**，只描述回答本身的质量

3. **改进建议**（suggestions）：
   - 提供2-3条具体、可操作的中文改进建议
   - 建议应针对用户的具体错误类型（如词汇、语法、表达等）
   - 建议应帮助用户更好地理解和掌握相关知识点

## 输出要求
请以JSON格式输出结果，不要包含任何其他文字：
{
  "isCorrect": true/false,
  "analysis": "使用中文撰写的详细分析说明，只描述用户回答本身的质量",
  "suggestions": ["中文建议1", "中文建议2", "中文建议3"]
}

## 重要提示
1. isCorrect 必须是布尔值（true/false）
2. analysis 必须使用中文撰写，要具体、有建设性，解释判定原因
3. suggestions 数组必须使用中文，包含2-3条实用建议
4. 考虑英语表达的多样性，不要仅因措辞不同就判定为错误
5. 如果用户回答使用了正确的同义词或等价表达，应判定为正确
6. **所有文字输出必须使用中文，除了引用英文单词或句子**
7. **分析中不要提到"参考答案"、"标准回答"等字眼**
`.trim()

    // 构建评测内容
    const evaluationContent = `
题目：${question}
${referenceAnswersText ? `可以参考的回答方式：\n${referenceAnswersText}` : ''}

用户的实际回答：${userAnswer}

请评测用户的回答是否符合题目场景要求，并给出分析。
`.trim()

    // 构建消息历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    // 调用GLM API
    const response = await callLLM(messages, 0.7, 500)
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
