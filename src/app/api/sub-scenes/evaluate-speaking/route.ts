import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type Message } from '@/lib/llm'

/**
 * POST /api/sub-scenes/evaluate-speaking
 * 评测用户的口语回答是否正确
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAnswer, expectedAnswer, context } = body

    console.log('[评测API] 收到请求:', { userAnswer, expectedAnswer, context })

    if (!userAnswer || !expectedAnswer) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 构建评测提示词
    const prompt = `你是英语口语评测专家。请评测用户的英语口语回答是否正确。

对话场景：
- 对方说：${context?.speakerText || expectedAnswer}
- 对方说（中文）：${context?.speakerTextCn || ''}

用户的回答：${userAnswer}

评测标准：
1. 语义是否正确表达了回应的意思
2. 语法是否基本正确
3. 用词是否恰当
4. 不要求完全一致，只要意思对、语法基本正确即可

请返回JSON格式：
{
  "isCorrect": true/false,
  "feedback": "简短的反馈说明（中文，30字以内）"
}

注意：
- 如果用户回答意思正确、语法基本正确，即使用词不完全一样也应判定为正确
- 反馈要简洁、鼓励性，指出优点或改进方向
- 只返回JSON，不要其他内容`

    const messages: Message[] = [
      {
        role: 'system',
        content: '你是英语口语评测专家，擅长评估学习者的口语表达是否正确、恰当。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    // 调用LLM进行评测
    console.log('[评测API] 调用LLM...')
    const llmResponse = await callLLM(messages, 0.7, 500)
    console.log('[评测API] LLM响应:', llmResponse.content)

    // 解析JSON响应
    const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[评测API] LLM响应格式错误:', llmResponse.content)
      throw new Error('LLM响应格式错误')
    }

    // 修复LLM返回的JSON中可能包含的无效转义字符
    // 例如：\' 不是有效的JSON转义序列，需要替换为 '
    let jsonStr = jsonMatch[0].replace(/\\'/g, "'")
    const result = JSON.parse(jsonStr)
    console.log('[评测API] 解析结果:', result)

    return NextResponse.json({
      isCorrect: result.isCorrect ?? false,
      feedback: result.feedback || '评测完成',
    })
  } catch (error) {
    console.error('[评测API] 评测失败:', error)
    return NextResponse.json(
      { error: '评测失败，请重试', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
