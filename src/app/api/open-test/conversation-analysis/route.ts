import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'
import type { PronunciationAssessmentResult, WordFeedback } from '@/types'

// ==================== 类型定义 ====================

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
  // 发音评估结果（仅用户语音消息有）
  pronunciationAssessment?: PronunciationAssessmentResult
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
  // 发音评估详细维度（新增）
  pronunciationDetails?: {
    accuracyScore: number
    fluencyScore: number
    prosodyScore: number
    completenessScore: number
    // 常见发音问题单词
    problemWords: Array<{
      word: string
      score: number
      errorType?: string
    }>
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

    // 提取真实发音评估数据
    const pronunciationData = extractPronunciationData(conversation)
    console.log('[对话分析] 发音评估数据:', pronunciationData ? '有数据' : '无数据')
    
    // 调用LLM进行分析（不带缓存）
    const result = await analyzeConversationWithLLM(conversation, rounds || 0, pronunciationData)
    
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

// ==================== 发音评估数据处理 ====================

interface PronunciationData {
  hasRealData: boolean
  avgAccuracy: number
  avgFluency: number
  avgProsody: number
  avgCompleteness: number
  avgPronunciation: number
  problemWords: Array<{ word: string; score: number; errorType?: string }>
}

/**
 * 从对话消息中提取发音评估数据
 */
function extractPronunciationData(conversation: ConversationMessage[]): PronunciationData | null {
  // 筛选有发音评估结果的用户消息
  const userMessagesWithAssessment = conversation.filter(
    msg => msg.role === 'user' && msg.pronunciationAssessment
  )
  
  if (userMessagesWithAssessment.length === 0) {
    return null
  }
  
  // 收集所有评估结果
  const assessments = userMessagesWithAssessment.map(msg => msg.pronunciationAssessment!)
  
  // 计算平均分
  const avgAccuracy = Math.round(
    assessments.reduce((sum, a) => sum + a.accuracyScore, 0) / assessments.length
  )
  const avgFluency = Math.round(
    assessments.reduce((sum, a) => sum + a.fluencyScore, 0) / assessments.length
  )
  const avgProsody = Math.round(
    assessments.reduce((sum, a) => sum + (a.prosodyScore || 0), 0) / assessments.length
  )
  const avgCompleteness = Math.round(
    assessments.reduce((sum, a) => sum + a.completenessScore, 0) / assessments.length
  )
  const avgPronunciation = Math.round(
    assessments.reduce((sum, a) => sum + a.pronunciationScore, 0) / assessments.length
  )
  
  // 收集问题单词（得分低于60或有错误类型的单词）
  const allWordFeedback: WordFeedback[] = assessments.flatMap(a => a.wordFeedback || [])
  const problemWordsMap = new Map<string, { totalScore: number; count: number; errorTypes: Set<string> }>()
  
  allWordFeedback.forEach(word => {
    if (word.accuracyScore < 70 || (word.errorType && word.errorType !== 'None')) {
      const existing = problemWordsMap.get(word.word)
      if (existing) {
        existing.totalScore += word.accuracyScore
        existing.count++
        if (word.errorType && word.errorType !== 'None') {
          existing.errorTypes.add(word.errorType)
        }
      } else {
        problemWordsMap.set(word.word, {
          totalScore: word.accuracyScore,
          count: 1,
          errorTypes: word.errorType && word.errorType !== 'None' ? new Set([word.errorType]) : new Set()
        })
      }
    }
  })
  
  // 转换为问题单词列表，按平均分排序
  const problemWords = Array.from(problemWordsMap.entries())
    .map(([word, data]) => ({
      word,
      score: Math.round(data.totalScore / data.count),
      errorType: Array.from(data.errorTypes)[0] // 取第一个错误类型
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10) // 最多返回10个问题单词
  
  return {
    hasRealData: true,
    avgAccuracy,
    avgFluency,
    avgProsody,
    avgCompleteness,
    avgPronunciation,
    problemWords
  }
}

// ==================== 业务逻辑 ====================

/**
 * 调用LLM分析对话
 */
async function analyzeConversationWithLLM(
  conversation: ConversationMessage[],
  rounds: number,
  pronunciationData: PronunciationData | null
): Promise<ConversationAnalysisResult> {
  const systemPrompt = buildConversationAnalysisPrompt(pronunciationData)
  
  const conversationText = conversation.map(msg => 
    `${msg.role === 'assistant' ? 'AI' : '用户'}: ${msg.content}`
  ).join('\n')
  
  // 构建用户消息，包含发音评估数据（如果有）
  let userContent = `请分析以下对话（共${rounds}轮）：\n\n${conversationText}`
  
  if (pronunciationData?.hasRealData) {
    userContent += `\n\n【真实发音评估数据】
- 综合发音分: ${pronunciationData.avgPronunciation}
- 准确度: ${pronunciationData.avgAccuracy}
- 流畅度: ${pronunciationData.avgFluency}
- 韵律度: ${pronunciationData.avgProsody}
- 完整度: ${pronunciationData.avgCompleteness}
${pronunciationData.problemWords.length > 0 ? `
问题单词（需改进）:
${pronunciationData.problemWords.map(w => `- ${w.word}: ${w.score}分${w.errorType ? ` (${translateErrorType(w.errorType)})` : ''}`).join('\n')}
` : ''}`
  }
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ]

  try {
    const response = await callLLM(messages, 0.7, 1000)
    const content = response.content?.trim()
    
    if (!content) {
      console.log('[对话分析] LLM返回空内容，使用默认结果')
      return generateMockAnalysis(conversation, pronunciationData)
    }
    
    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('[对话分析] 未找到JSON格式，使用默认结果')
      return generateMockAnalysis(conversation, pronunciationData)
    }
    
    const parsedResult = JSON.parse(jsonMatch[0])
    
    // 验证必要字段（LLM 不再返回 overallScore，由代码计算）
    if (
      parsedResult.dimensions &&
      typeof parsedResult.dimensions.content === 'number' &&
      Array.isArray(parsedResult.suggestions)
    ) {
      const d = parsedResult.dimensions
      
      // 使用真实发音评估分数（如果有），否则使用 LLM 推断的分数
      const pronunciationScore = pronunciationData?.hasRealData 
        ? pronunciationData.avgPronunciation 
        : (d.pronunciation ?? 70)
      
      // overallScore = 5个维度均值，代码层计算更可靠
      const overallScore = Math.round(
        ((d.content ?? 70) + (d.grammar ?? 70) + (d.vocabulary ?? 70) + pronunciationScore + (d.fluency ?? 70)) / 5
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
          pronunciation: pronunciationScore,
          pronunciationExplanation: d.pronunciationExplanation,
          fluency: d.fluency ?? 70,
          fluencyExplanation: d.fluencyExplanation,
        },
        // 添加发音评估详细维度
        pronunciationDetails: pronunciationData?.hasRealData ? {
          accuracyScore: pronunciationData.avgAccuracy,
          fluencyScore: pronunciationData.avgFluency,
          prosodyScore: pronunciationData.avgProsody,
          completenessScore: pronunciationData.avgCompleteness,
          problemWords: pronunciationData.problemWords
        } : undefined,
        suggestions: parsedResult.suggestions,
        conversationFlow: parsedResult.conversationFlow || '对话分析完成',
        transcript: conversation,
        audioUrl: undefined
      }
    }
    
    console.log('[对话分析] JSON验证失败，使用默认结果')
    return generateMockAnalysis(conversation, pronunciationData)
    
  } catch (error) {
    console.error('[对话分析] LLM调用或解析失败:', error)
    return generateMockAnalysis(conversation, pronunciationData)
  }
}

/**
 * 构建对话分析 Prompt - 精简版托福标准
 * overallScore 由代码层计算（5维度均值），LLM 只负责各维度评分和文字说明
 */
function buildConversationAnalysisPrompt(pronunciationData: PronunciationData | null): string {
  // 如果有真实发音评估数据，提示 LLM 不要评估发音维度
  const pronunciationInstruction = pronunciationData?.hasRealData
    ? `IMPORTANT: Real pronunciation assessment data is provided below. Do NOT score pronunciation - use the provided score instead. Focus your pronunciationExplanation on analyzing the problem words and giving improvement tips.`
    : `- pronunciation: clarity, stress, intonation (infer from text patterns)`
  
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
${pronunciationInstruction}
- fluency: coherence, natural pacing, absence of fillers

${pronunciationData?.hasRealData ? pronunciationInstruction : ''}

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
    "pronunciationExplanation": "<specific issue + improvement tip in Chinese, focus on problem words if provided>",
    "fluency": <number>,
    "fluencyExplanation": "<specific issue + improvement tip in Chinese>"
  },
  "suggestions": ["<actionable tip in Chinese>", "<actionable tip in Chinese>", "<actionable tip in Chinese>"],
  "conversationFlow": "<overall assessment in Chinese, 2-3 sentences>"
}`
}

/**
 * 翻译错误类型
 */
function translateErrorType(errorType: string): string {
  const translations: Record<string, string> = {
    'Mispronunciation': '发音错误',
    'Omission': '遗漏',
    'Insertion': '多余',
    'None': ''
  }
  return translations[errorType] || errorType
}

/**
 * 生成默认兜底结果（LLM 调用或解析失败时使用）
 * 注意：这是兜底数据，不代表真实评测结果
 */
function generateMockAnalysis(
  conversation: ConversationMessage[], 
  pronunciationData: PronunciationData | null
): ConversationAnalysisResult {
  // 使用真实发音评估分数（如果有）
  const pronunciationScore = pronunciationData?.hasRealData 
    ? pronunciationData.avgPronunciation 
    : 70
  
  const overallScore = pronunciationData?.hasRealData
    ? Math.round((70 + 70 + 70 + pronunciationScore + 70) / 5)
    : 70
  
  return {
    overallScore,
    dimensions: {
      content: 70,
      contentExplanation: '评测服务暂时不可用，请稍后重试',
      grammar: 70,
      grammarExplanation: '评测服务暂时不可用，请稍后重试',
      vocabulary: 70,
      vocabularyExplanation: '评测服务暂时不可用，请稍后重试',
      pronunciation: pronunciationScore,
      pronunciationExplanation: pronunciationData?.hasRealData 
        ? `发音评估完成，综合得分 ${pronunciationScore} 分。${pronunciationData.problemWords.length > 0 ? '建议重点练习以下单词：' + pronunciationData.problemWords.slice(0, 3).map(w => w.word).join('、') : ''}`
        : '评测服务暂时不可用，请稍后重试',
      fluency: 70,
      fluencyExplanation: '评测服务暂时不可用，请稍后重试',
    },
    // 添加发音评估详细维度
    pronunciationDetails: pronunciationData?.hasRealData ? {
      accuracyScore: pronunciationData.avgAccuracy,
      fluencyScore: pronunciationData.avgFluency,
      prosodyScore: pronunciationData.avgProsody,
      completenessScore: pronunciationData.avgCompleteness,
      problemWords: pronunciationData.problemWords
    } : undefined,
    transcript: conversation,
    audioUrl: undefined,
    suggestions: ['评测服务暂时不可用，请稍后重试'],
    conversationFlow: '评测服务暂时不可用，无法完成本次对话分析，请稍后重试。',
  }
}
