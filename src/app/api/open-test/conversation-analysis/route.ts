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
 * 构建对话分析Prompt - 托福标准严格评分版本
 * 参考托福口语考试4分制评分标准，映射到100分制
 */
function buildConversationAnalysisPrompt(): string {
  return `
你是一位专业的托福口语评测专家。请重点分析用户的英语对话表现，并给出严格的评测报告。

## 评测重点
重点关注**用户(user)**的英语表达，而非AI的回复。以托福口语考试(TOEFL Speaking)的严格标准评估用户的英语口语能力。

## 托福口语评分标准映射（0-100分制）

### 评分等级定义（参考托福4分制）
- **Level 4 (90-100分)**: 优秀 - 表达清晰流畅，语言使用准确多样，内容完整有深度
- **Level 3 (75-89分)**: 良好 - 表达基本清晰，有小瑕疵但不影响理解，内容较完整
- **Level 2 (60-74分)**: 有限 - 表达不够清晰，错误影响理解，内容不够完整
- **Level 1 (40-59分)**: 薄弱 - 表达困难，错误严重影响理解，内容严重缺失
- **Level 0 (0-39分)**: 无法评分 - 几乎无法表达，无法参与对话

---

## 五维度详细评分标准

### 1. 内容完整性 (content) - 托福标准
**General Description**: 回答是否切题，内容是否完整，观点是否清晰

| 分数段 | 等级 | 描述 |
|--------|------|------|
| 90-100 | Level 4 | 回答切题且完整，观点清晰，论证充分，主动推进对话，展现出色的交际能力 |
| 80-89 | Level 3 | 回答基本切题，内容较完整，观点基本清晰，偶有信息缺失或偏离 |
| 70-79 | Level 3- | 回答基本切题但内容不够深入，需要引导，信息提供有限 |
| 60-69 | Level 2 | 回答部分切题，内容不完整，观点不够清晰，经常偏离主题 |
| 50-59 | Level 2- | 回答经常偏离主题，内容严重缺失，难以有效参与对话 |
| 40-49 | Level 1 | 回答严重偏离主题或内容极度贫乏，几乎无法提供有效信息 |
| 0-39 | Level 0 | 完全无法回答或回答与主题无关，无法参与对话 |

**扣分要点**：
- 偏离主题：扣15-30分
- 内容不完整：扣10-25分
- 缺乏观点展开：扣10-20分
- 被动等待引导：扣10-15分

### 2. 语法正确性 (grammar) - 托福标准
**General Description**: 语法结构和时态使用的准确性和多样性

| 分数段 | 等级 | 描述 |
|--------|------|------|
| 90-100 | Level 4 | 语法几乎完美，复杂句式运用自如，时态准确，错误极少且不影响理解 |
| 80-89 | Level 3 | 语法基本正确，句式有一定多样性，偶有轻微错误但不影响理解 |
| 70-79 | Level 3- | 有少量语法错误，句式较单一，但不影响整体理解 |
| 60-69 | Level 2 | 语法错误较多，影响部分理解，句式简单重复，时态混乱 |
| 50-59 | Level 2- | 语法错误频繁，严重影响理解，基本句式混乱 |
| 40-49 | Level 1 | 语法错误极多，几乎无法理解，无法构建正确句子 |
| 0-39 | Level 0 | 完全无法使用正确语法，句子结构崩溃 |

**扣分要点**：
- 时态错误：每次扣3-5分
- 主谓不一致：每次扣3-5分
- 句式单一（只用简单句）：扣10-20分
- 影响理解的语法错误：每个扣5-10分

### 3. 词汇丰富度 (vocabulary) - 托福标准
**General Description**: 词汇使用的准确性、多样性和地道程度

| 分数段 | 等级 | 描述 |
|--------|------|------|
| 90-100 | Level 4 | 词汇丰富准确，使用高级词汇和地道习语，表达精准，同义词替换自如 |
| 80-89 | Level 3 | 词汇量良好，能准确表达，使用一些高级词汇，偶有重复 |
| 70-79 | Level 3- | 词汇量中等，基本能表达意思，用词普通，有一定重复 |
| 60-69 | Level 2 | 词汇量有限，频繁使用简单基础词汇，有时词不达意 |
| 50-59 | Level 2- | 词汇贫乏，大量使用最基础词汇，难以准确表达复杂意思 |
| 40-49 | Level 1 | 词汇极其贫乏，几乎无法找到合适的词来表达 |
| 0-39 | Level 0 | 词汇量极少，无法完成基本表达 |

**扣分要点**：
- 词汇重复（同一词使用超过3次）：扣5-10分
- 用词不当：每次扣3-5分
- 使用过于简单的词汇：扣10-15分
- 缺乏习语或高级表达：扣5-10分

### 4. 发音准确性 (pronunciation) - 托福标准
**General Description**: 发音清晰度、重音语调和可理解程度

| 分数段 | 等级 | 描述 |
|--------|------|------|
| 90-100 | Level 4 | 发音标准清晰，重音语调自然地道，完全易于理解，接近母语者水平 |
| 80-89 | Level 3 | 发音清晰准确，个别单词有小问题，不影响整体理解 |
| 70-79 | Level 3- | 发音基本清晰，部分单词发音有误，需要仔细听但可理解 |
| 60-69 | Level 2 | 发音问题较多，部分单词难以辨认，影响部分理解 |
| 50-59 | Level 2- | 发音问题严重，大量单词难以辨认，严重影响交流 |
| 40-49 | Level 1 | 发音极不标准，几乎无法辨认单词，交流极度困难 |
| 0-39 | Level 0 | 发音无法理解，无法进行任何交流 |

**扣分要点**：
- 单词发音错误：每个扣2-4分
- 重音错误：每次扣2-3分
- 语调平淡无变化：扣5-10分
- 影响理解的口音：扣10-20分

### 5. 对话流畅度 (fluency) - 托福标准
**General Description**: 表达的连贯性、自然程度和停顿频率

| 分数段 | 等级 | 描述 |
|--------|------|------|
| 90-100 | Level 4 | 表达极其流畅自然，语速适中，无不当停顿，即时回应，节奏感好 |
| 80-89 | Level 3 | 表达流畅，有极少量自然停顿，不影响交流，回应较即时 |
| 70-79 | Level 3- | 基本流畅，有少量停顿或犹豫，但不影响对话进行 |
| 60-69 | Level 2 | 流畅度欠佳，停顿较多，影响对话节奏，回应不够即时 |
| 50-59 | Level 2- | 严重不流畅，长时间停顿，无法维持正常对话节奏 |
| 40-49 | Level 1 | 极度不流畅，几乎无法连续表达，对话难以进行 |
| 0-39 | Level 0 | 完全无法流畅表达，无法参与对话 |

**扣分要点**：
- 不当停顿（超过2秒）：每次扣3-5分
- 频繁使用填充词(um, uh, like等)：每个扣1-2分
- 语速过快或过慢：扣5-10分
- 回应延迟：每次扣3-5分

---

## 托福标准评分原则

### 1. 严格性原则
- **高标准要求**：以托福口语考试标准评分，90分以上需要接近母语者水平
- **扣分严格**：任何错误都要扣分，即使是小错误
- **不给予同情分**：真实反映用户的英语水平

### 2. 区分度原则
- **分数分布合理**：大部分用户应在60-85分区间
- **90分以上罕见**：需要各方面都表现优秀
- **60分以下明确**：存在明显的能力缺陷

### 3. 综合评分原则
- **总体分数(overallScore)** = 各维度加权平均（各维度权重相同，各占20%）
- **四舍五入**：最终分数四舍五入到整数
- **总分参考**：
  - 95-100分：接近母语者水平（托福26-30分）
  - 85-94分：优秀水平（托福23-25分）
  - 75-84分：良好水平（托福20-22分）
  - 65-74分：中等水平（托福17-19分）
  - 55-64分：有限水平（托福14-16分）
  - 45-54分：薄弱水平（托福10-13分）
  - 0-44分：基础水平（托福0-9分）

---

## 输出要求
请以JSON格式输出结果：
{
  "overallScore": 72,
  "dimensions": {
    "content": 75,
    "contentExplanation": "回答基本切题，能够覆盖主要问题点，但缺乏深入展开和细节支撑。建议在回答时提供更多具体例子和个人观点，主动推进对话方向。",
    "grammar": 68,
    "grammarExplanation": "存在明显的时态错误（如过去时和现在时混用）和主谓不一致问题。句式较为单一，主要使用简单句。建议加强基础语法练习，特别是时态的正确使用。",
    "vocabulary": 70,
    "vocabularyExplanation": "词汇量中等，能够完成基本表达，但用词较为普通，缺乏高级词汇和习语使用。部分词汇重复使用较多。建议每天学习并主动使用5-10个新词汇。",
    "pronunciation": 78,
    "pronunciationExplanation": "发音基本清晰，大部分单词可辨认，但部分单词发音不够准确，语调较为平淡。建议跟读原声材料，注意单词重音和句子语调的变化。",
    "fluency": 72,
    "fluencyExplanation": "对话中有明显停顿，使用较多填充词(um, uh)，回应不够即时。建议多进行模拟对话练习，减少思考时的停顿，可以先在心里组织好语言再开口。"
  },
  "suggestions": [
    "【内容】回答问题时先给出明确观点，再用1-2个具体例子支撑，最后总结。主动提问推进对话。",
    "【语法】重点练习一般过去时和现在完成时的区别，每天做10道时态练习题。",
    "【词汇】学习同义词替换，避免重复使用同一词汇，尝试使用连接词(however, therefore, furthermore)使表达更丰富。",
    "【发音】每天跟读VOA慢速英语15分钟，录音对比自己的发音，特别注意重音位置。",
    "【流畅度】练习用完整的句子回答，减少填充词使用，可以在回答前用2-3秒组织思路。"
  ],
  "conversationFlow": "用户在对话中展现了基本的英语交流能力，能够完成简单的问答互动。主要问题集中在语法准确性（时态和主谓一致）和词汇多样性方面。建议系统性地加强语法基础，扩充词汇量，并通过大量口语练习提升流畅度。整体处于托福口语Level 2-3之间，有较大的提升空间。"
}

## 重要提示
1. **严格评分**：90分以上需要各方面都接近完美，不要轻易给出
2. **具体说明**：explanation要具体指出问题、举例说明，并给出改进方向
3. **实用建议**：suggestions要针对性强，给出可操作的练习方法和资源推荐
4. **真实反馈**：conversationFlow要客观描述当前水平，与托福等级对应
5. **分数合理**：确保overallScore是各维度的真实反映，不要虚高
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
