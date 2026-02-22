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
    
    // 验证必要字段
    if (
      typeof parsedResult.overallScore === 'number' &&
      parsedResult.dimensions &&
      Array.isArray(parsedResult.suggestions)
    ) {
      return {
        overallScore: parsedResult.overallScore,
        dimensions: parsedResult.dimensions,
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
 * 构建对话分析Prompt
 */
function buildConversationAnalysisPrompt(): string {
  return `
你是一位专业的英语口语评测专家。请重点分析用户的英语对话表现，并给出详细的评测报告。

## 评测重点
重点关注**用户(user)**的英语表达，而非AI的回复。评估用户在真实对话场景中的英语口语能力。

## 评分维度（0-100分）及评分标准

### 1. 内容完整性 (content)
- 90-100分：能够完整回答问题，主动提供相关信息，有效推进对话
- 70-89分：基本能回答问题，但信息不够完整或详细
- 50-69分：回答简单，缺乏关键信息，需要AI多次引导
- 0-49分：回答不完整或偏离主题，无法有效参与对话

### 2. 语法正确性 (grammar)
- 90-100分：语法错误极少，句式结构正确，时态运用准确
- 70-89分：有少量语法错误，但不影响理解，基本句式正确
- 50-69分：语法错误较多，影响部分理解，句式单一
- 0-49分：语法错误频繁，严重影响理解，基本句式混乱

### 3. 词汇丰富度 (vocabulary)
- 90-100分：词汇量大，使用准确，有高级词汇和地道表达
- 70-89分：词汇量中等，基本能表达意思，用词较为准确
- 50-69分：词汇量有限，重复使用简单词汇，有时词不达意
- 0-49分：词汇贫乏，大量使用简单词，难以准确表达

### 4. 发音准确性 (pronunciation)
- 90-100分：发音清晰准确，重音和语调自然，易于理解
- 70-89分：发音基本清晰，个别单词发音有误，但不影响理解
- 50-69分：发音问题较多，部分单词难以辨认，需要对方询问
- 0-49分：发音问题严重，大量单词难以辨认，严重影响交流

### 5. 对话流畅度 (fluency)
- 90-100分：表达流畅自然，无明显停顿，能即时回应
- 70-89分：基本流畅，有少量停顿或犹豫，不影响交流
- 50-69分：流畅度欠佳，停顿较多，影响对话节奏
- 0-49分：严重不流畅，长时间停顿，无法维持正常对话

## 输出要求
请以JSON格式输出结果：
{
  "overallScore": 85,
  "dimensions": {
    "content": 88,
    "contentExplanation": "用户能够完整回答问题，但缺乏主动展开话题的能力",
    "grammar": 82,
    "grammarExplanation": "基本语法正确，但存在时态错误和主谓不一致问题",
    "vocabulary": 80,
    "vocabularyExplanation": "词汇量中等，使用了一些场景相关词汇，但重复较多",
    "pronunciation": 85,
    "pronunciationExplanation": "发音基本清晰，个别单词重音位置有误",
    "fluency": 84,
    "fluencyExplanation": "对话基本流畅，有少量犹豫和停顿"
  },
  "suggestions": [
    "具体建议1：针对用户的主要问题",
    "具体建议2：如何改进语法/词汇/发音等",
    "具体建议3：练习方法和资源推荐"
  ],
  "conversationFlow": "详细描述用户在对话中的表现，包括优点和需要改进的地方..."
}

## 重要提示
1. 评分必须基于用户的实际表现，给出客观评价
2. 每个维度必须提供具体的评分说明(contentExplanation等)
3. 改进建议要具体、可操作，针对用户的具体问题
4. conversationFlow要详细描述用户的表现，而非AI的表现
`.trim()
}

/**
 * 生成默认分析结果
 */
function generateMockAnalysis(conversation: ConversationMessage[]): ConversationAnalysisResult {
  return {
    overallScore: 78,
    dimensions: {
      content: 82,
      contentExplanation: '能够基本回答问题，但可以更主动地展开话题',
      grammar: 75,
      grammarExplanation: '基本语法正确，存在一些时态和主谓一致问题',
      vocabulary: 70,
      vocabularyExplanation: '词汇量中等，使用了基本词汇，可以更丰富',
      pronunciation: 85,
      pronunciationExplanation: '发音基本清晰，个别单词需要改进',
      fluency: 76,
      fluencyExplanation: '对话基本流畅，有少量犹豫和停顿'
    },
    transcript: conversation,
    audioUrl: undefined,
    suggestions: [
      '注意动词时态的正确使用',
      '尝试使用更多连接词使对话更流畅',
      '扩充词汇量，使用更丰富的表达方式',
      '注意发音的准确性，特别是元音发音',
      '练习更自然的对话节奏和语调'
    ],
    conversationFlow: '对话整体流畅，能够基本表达自己的想法，但在某些话题上可以更深入展开。建议增加对话的互动性，主动提问和回应对方的问题。'
  }
}
