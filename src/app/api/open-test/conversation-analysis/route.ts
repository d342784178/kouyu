import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'

// ==================== 类型定义 ====================

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

interface ConversationAnalysisResult {
  overallScore: number
  dimensions: {
    content: number
    contentExplanation?: string
    grammar: number
    grammarExplanation?: string
    vocabulary: number
    vocabularyExplanation?: string
    pronunciation: number
    pronunciationExplanation?: string
    fluency: number
    fluencyExplanation?: string
  }
  suggestions: string[]
  conversationFlow: string
  transcript?: ConversationMessage[]
  audioUrl?: string
}

// ==================== 主入口 ====================

/**
 * 对话分析接口 - 不带缓存
 * 用于分析用户的对话表现，每次对话都是独特的，不需要缓存
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { conversation, rounds } = body

    console.log('[对话分析] 收到请求:', { rounds, messageCount: conversation?.length })

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      return NextResponse.json(
        { error: '缺少必要的参数', details: '请提供对话历史(conversation)' },
        { status: 400 }
      )
    }

    // 调用LLM进行分析（不带缓存）
    const result = await analyzeConversationWithLLM(conversation, rounds || 0)
    
    // 添加对话记录到结果
    const finalResult = { ...result, transcript: conversation }

    console.log('[对话分析] 完成:', Date.now() - startTime, 'ms')
    return NextResponse.json(finalResult)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '对话分析API错误'
    console.error('[对话分析] 处理错误:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ==================== 业务逻辑 ====================

/**
 * 调用LLM分析对话
 */
async function analyzeConversationWithLLM(
  conversation: ConversationMessage[],
  rounds: number
): Promise<ConversationAnalysisResult> {
  const systemPrompt = buildConversationAnalysisPrompt()
  
  const conversationText = conversation.map(msg => 
    `${msg.role === 'assistant' ? 'AI' : '用户'}: ${msg.content}`
  ).join('\n')
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析以下对话（共${rounds}轮）：\n\n${conversationText}` }
  ]

  try {
    const response = await callLLM(messages, 0.7, 1000)
    const content = response.content?.trim()
    
    if (!content) {
      console.log('[对话分析] LLM返回空内容，使用默认结果')
      return generateMockAnalysis(conversation)
    }
    
    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('[对话分析] 未找到JSON格式，使用默认结果')
      return generateMockAnalysis(conversation)
    }
    
    const parsedResult = JSON.parse(jsonMatch[0])
    
    // 验证必要字段（LLM 不再返回 overallScore，由代码计算）
    if (
      parsedResult.dimensions &&
      typeof parsedResult.dimensions.content === 'number' &&
      Array.isArray(parsedResult.suggestions)
    ) {
      const d = parsedResult.dimensions
      // overallScore = 5个维度均值，代码层计算更可靠
      const overallScore = Math.round(
        ((d.content ?? 70) + (d.grammar ?? 70) + (d.vocabulary ?? 70) + (d.pronunciation ?? 70) + (d.fluency ?? 70)) / 5
      )
      return {
        overallScore,
        dimensions: {
          content: d.content ?? 70,
          contentExplanation: d.contentExplanation,
          grammar: d.grammar ?? 70,
          grammarExplanation: d.grammarExplanation,
          vocabulary: d.vocabulary ?? 70,
          vocabularyExplanation: d.vocabularyExplanation,
          pronunciation: d.pronunciation ?? 70,
          pronunciationExplanation: d.pronunciationExplanation,
          fluency: d.fluency ?? 70,
          fluencyExplanation: d.fluencyExplanation,
        },
        suggestions: parsedResult.suggestions,
        conversationFlow: parsedResult.conversationFlow || '对话分析完成',
        transcript: conversation,
        audioUrl: undefined
      }
    }
    
    console.log('[对话分析] JSON验证失败，使用默认结果')
    return generateMockAnalysis(conversation)
    
  } catch (error) {
    console.error('[对话分析] LLM调用或解析失败:', error)
    return generateMockAnalysis(conversation)
  }
}

/**
 * 构建对话分析 Prompt - 精简版托福标准
 * overallScore 由代码层计算（5维度均值），LLM 只负责各维度评分和文字说明
 */
function buildConversationAnalysisPrompt(): string {
  return `You are a TOEFL Speaking examiner. Evaluate the USER's English performance in the conversation below. Focus only on the user's turns, not the AI's.

Score each dimension 0-100 using TOEFL standards:
- 90-100: Near-native, rare
- 75-89: Good, minor issues
- 60-74: Limited, errors affect understanding
- 40-59: Weak, frequent errors
- 0-39: Unable to communicate

Dimensions:
- content: relevance, completeness, depth of response
- grammar: accuracy and variety of structures
- vocabulary: range, accuracy, idiomatic usage
- pronunciation: clarity, stress, intonation (infer from text patterns)
- fluency: coherence, natural pacing, absence of fillers

Output ONLY valid JSON, no other text:
{
  "dimensions": {
    "content": <number>,
    "contentExplanation": "<specific issue + improvement tip in Chinese>",
    "grammar": <number>,
    "grammarExplanation": "<specific issue + improvement tip in Chinese>",
    "vocabulary": <number>,
    "vocabularyExplanation": "<specific issue + improvement tip in Chinese>",
    "pronunciation": <number>,
    "pronunciationExplanation": "<specific issue + improvement tip in Chinese>",
    "fluency": <number>,
    "fluencyExplanation": "<specific issue + improvement tip in Chinese>"
  },
  "suggestions": ["<actionable tip in Chinese>", "<actionable tip in Chinese>", "<actionable tip in Chinese>"],
  "conversationFlow": "<overall assessment in Chinese, 2-3 sentences>"
}`
}

/**
 * 生成默认兜底结果（LLM 调用或解析失败时使用）
 * 注意：这是兜底数据，不代表真实评测结果
 */
function generateMockAnalysis(conversation: ConversationMessage[]): ConversationAnalysisResult {
  return {
    overallScore: 70,
    dimensions: {
      content: 70,
      contentExplanation: '评测服务暂时不可用，请稍后重试',
      grammar: 70,
      grammarExplanation: '评测服务暂时不可用，请稍后重试',
      vocabulary: 70,
      vocabularyExplanation: '评测服务暂时不可用，请稍后重试',
      pronunciation: 70,
      pronunciationExplanation: '评测服务暂时不可用，请稍后重试',
      fluency: 70,
      fluencyExplanation: '评测服务暂时不可用，请稍后重试',
    },
    transcript: conversation,
    audioUrl: undefined,
    suggestions: ['评测服务暂时不可用，请稍后重试'],
    conversationFlow: '评测服务暂时不可用，无法完成本次对话分析，请稍后重试。',
  }
}
