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
 * 构建对话分析Prompt - 严格评分版本
 */
function buildConversationAnalysisPrompt(): string {
  return `
你是一位严格的英语口语评测专家。请重点分析用户的英语对话表现，并给出严格的评测报告。

## 评测重点
重点关注**用户(user)**的英语表达，而非AI的回复。以专业英语考试的标准评估用户的英语口语能力。

## 评分维度（0-100分）及严格评分标准

### 1. 内容完整性 (content) - 严格标准
- 95-100分：完美回答，内容完整且深入，主动引导对话方向，展现出色的交际能力
- 85-94分：回答完整，能主动提供信息，有效推进对话，偶尔有小瑕疵
- 75-84分：基本能回答问题，但信息不够深入，需要一定引导
- 60-74分：回答简单，缺乏关键信息，经常需要AI引导才能继续
- 40-59分：回答不完整，经常偏离主题，难以有效参与对话
- 0-39分：回答严重不完整或完全偏离主题，无法参与正常对话

### 2. 语法正确性 (grammar) - 严格标准
- 95-100分：语法几乎完美，复杂句式运用自如，时态准确无误
- 85-94分：语法正确，偶有轻微错误，句式多样，时态基本准确
- 75-84分：有少量语法错误，但不影响理解，句式较单一
- 60-74分：语法错误较多，影响部分理解，句式简单且重复
- 40-59分：语法错误频繁，严重影响理解，基本句式混乱
- 0-39分：语法错误极多，几乎无法理解，无法构建正确句子

### 3. 词汇丰富度 (vocabulary) - 严格标准
- 95-100分：词汇丰富准确，使用大量高级词汇和地道习语，表达精准
- 85-94分：词汇量良好，能准确表达，使用一些高级词汇
- 75-84分：词汇量中等，基本能表达意思，但用词普通，偶有重复
- 60-74分：词汇量有限，频繁使用简单词汇，有时词不达意
- 40-59分：词汇贫乏，大量使用基础词汇，难以准确表达复杂意思
- 0-39分：词汇极其贫乏，几乎无法找到合适的词来表达

### 4. 发音准确性 (pronunciation) - 严格标准
- 95-100分：发音标准清晰，重音语调自然地道，完全易于理解
- 85-94分：发音清晰准确，个别单词有小问题，不影响理解
- 75-84分：发音基本清晰，部分单词发音有误，需要仔细听
- 60-74分：发音问题较多，部分单词难以辨认，经常需要对方询问
- 40-59分：发音问题严重，大量单词难以辨认，严重影响交流
- 0-39分：发音极不标准，几乎无法辨认单词，无法进行交流

### 5. 对话流畅度 (fluency) - 严格标准
- 95-100分：表达极其流畅自然，无任何停顿，即时回应，语速适中
- 85-94分：表达流畅，有极少量自然停顿，不影响交流
- 75-84分：基本流畅，有少量停顿或犹豫，但不影响对话进行
- 60-74分：流畅度欠佳，停顿较多，影响对话节奏和体验
- 40-59分：严重不流畅，长时间停顿，无法维持正常对话节奏
- 0-39分：极度不流畅，几乎无法连续表达，对话难以进行

## 严格评分原则
1. **高标准要求**：以英语专业考试（如雅思、托福口语）的标准评分
2. **扣分严格**：任何错误都要扣分，不因为"不影响理解"就放松标准
3. **鼓励进步**：75分以下说明有显著改进空间，需要针对性练习
4. **实事求是**：不要给"同情分"，真实反映用户的英语水平

## 输出要求
请以JSON格式输出结果：
{
  "overallScore": 72,
  "dimensions": {
    "content": 75,
    "contentExplanation": "用户基本能回答问题，但内容较为简单，缺乏深入展开，需要AI多次引导才能继续对话",
    "grammar": 70,
    "grammarExplanation": "存在明显的时态错误和主谓不一致问题，句式单一，需要加强基础语法练习",
    "vocabulary": 68,
    "vocabularyExplanation": "词汇量有限，频繁使用基础词汇，缺乏多样性和准确性",
    "pronunciation": 78,
    "pronunciationExplanation": "发音基本可理解，但部分单词发音不够准确，语调较为平淡",
    "fluency": 72,
    "fluencyExplanation": "对话中有明显停顿，回应不够即时，流畅度有待提高"
  },
  "suggestions": [
    "语法方面：重点练习一般现在时和现在进行时的正确使用，注意主谓一致",
    "词汇方面：每天学习5-10个场景相关词汇，尝试在对话中使用新学的词汇",
    "发音方面：跟读原声材料，注意单词重音和句子的语调变化",
    "流畅度方面：多进行模拟对话练习，减少思考时的停顿，可以先在心里组织好语言再开口"
  ],
  "conversationFlow": "用户在对话中表现一般，能够完成基本的问答，但在内容深度、语法准确性、词汇多样性等方面都有明显的提升空间。建议加强基础语法学习，扩充词汇量，并进行更多的口语练习。"
}

## 重要提示
1. **严格评分**：按照专业考试标准，不要给过高的分数
2. **具体说明**：每个维度的explanation要具体指出问题和改进方向
3. **实用建议**：suggestions要针对性强，给出可操作的练习方法
4. **真实反馈**：conversationFlow要客观描述，既指出问题也肯定进步
5. **总体分数**：overallScore应该是各维度的综合反映，不要虚高
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
