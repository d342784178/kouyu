import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'

/**
 * 填空题（Pattern Drill）语义评测 API
 * 接收用户填写的答案，调用 GLM-4-Flash 进行语义评测
 */
export async function POST(request: Request) {
  try {
    const body: any = await request.json()
    const { template, userAnswers, referenceAnswer, keywords, scenarioHint } = body

    console.log('[填空题评测] 开始处理:', new Date().toISOString())
    console.log('[填空题评测] 模板:', template)
    console.log('[填空题评测] 用户答案:', userAnswers)

    // 参数校验：template 和 userAnswers 为必填
    if (!template || !userAnswers) {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供句型模板(template)和用户答案(userAnswers)'
        },
        { status: 400 }
      )
    }

    // 将用户答案填入模板，生成完整句子
    let filledSentence = template
    const answersArray: string[] = Array.isArray(userAnswers) ? userAnswers : [userAnswers]
    answersArray.forEach((answer: string) => {
      filledSentence = filledSentence.replace('___', answer)
    })

    // 构建系统提示词
    const systemPrompt = `You are an English language evaluator for a speaking practice app. 
Evaluate whether the user's filled-in sentence is appropriate for the given scenario.

Evaluation criteria:
1. isCorrect: Whether the filled answer(s) are semantically appropriate for the scenario and grammatically correct. Accept synonyms and reasonable alternatives.
2. semanticAnalysis: Write in Chinese. Analyze the semantic appropriateness of the user's answer. Be specific.
3. feedback: Write in Chinese. Provide constructive feedback. If correct, affirm and explain why it works well. If incorrect, explain what would be better.

${referenceAnswer ? `Reference answer: ${referenceAnswer}` : ''}
${keywords && keywords.length > 0 ? `Suggested keywords: ${keywords.join(', ')}` : ''}
${scenarioHint ? `Scenario context: ${scenarioHint}` : ''}

Output ONLY valid JSON, no other text:
{
  "isCorrect": true/false,
  "semanticAnalysis": "<Chinese analysis>",
  "feedback": "<Chinese feedback>"
}`.trim()

    // 构建用户消息
    const evaluationContent = `Template: ${template}
User's filled sentence: ${filledSentence}
User's answers: ${answersArray.join(', ')}`

    // 构建消息列表
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    // 调用 LLM 进行语义评测
    const response = await callLLMForScene('question-evaluation', messages, 0.7, 500)
    const content = response.content

    // 默认评测结果
    let evaluationResult = {
      isCorrect: false,
      referenceAnswer: referenceAnswer || '',
      semanticAnalysis: '答案已提交。',
      feedback: '请继续练习，加油！'
    }

    try {
      // 解析 LLM 返回的 JSON
      if (content) {
        const trimmedContent = content.trim()
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0])
          if (typeof parsedResult.isCorrect === 'boolean' && parsedResult.semanticAnalysis) {
            evaluationResult = {
              isCorrect: parsedResult.isCorrect,
              referenceAnswer: referenceAnswer || '',
              semanticAnalysis: parsedResult.semanticAnalysis,
              feedback: parsedResult.feedback || ''
            }
          }
        }
      }
    } catch (error) {
      console.error('[填空题评测] 解析评测结果失败:', error)
    }

    return NextResponse.json(evaluationResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '填空题评测API错误'
    console.error('[填空题评测] 处理错误:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
