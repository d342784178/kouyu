import { NextResponse } from 'next/server'

// OpenRouter API配置
const OPENROUTER_API_KEY = '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'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { topic, conversation, rounds } = body

    // 判断是题目分析还是对话分析
    if (topic) {
      return analyzeQuestion(topic, startTime)
    } else if (conversation && Array.isArray(conversation)) {
      return analyzeConversation(conversation, rounds || 0, startTime)
    } else {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供测试题目(topic)或对话历史(conversation)'
        },
        {
          status: 400
        }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '分析API错误'
    console.error('[分析] 处理错误:', errorMessage)
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

// 题目分析
async function analyzeQuestion(topic: string, startTime: number) {
  console.log('[题目分析] 开始处理:', new Date().toISOString())
  console.log('[题目分析] 测试题目:', topic)

  // 构建系统提示词
  const systemPrompt = `
你是一位英语学习助手。请分析以下测试题目并提取：
1. 场景：对话发生的地点（必须用中文回答）
2. 角色：对话参与者（必须用中文回答，作为列表）
3. 对话目标：对话的主题（必须用中文回答）

重要要求：
- 所有输出必须使用中文，即使是英文题目也要翻译成中文
- 角色名称要使用中文表达（如：顾客、服务员、医生、患者等）
- 场景名称要使用中文表达（如：餐厅、医院、酒店等）

仅以JSON格式输出这三个部分的内容。

示例输入：
How would you start the conversation with the waiter?

示例输出：
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}

另一个示例输入：
At the hotel reception

示例输出：
{
  "scene": "酒店前台",
  "roles": ["客人", "酒店接待员"],
  "dialogueGoal": "客人在酒店办理入住"
}
  `.trim()

  // 构建消息历史
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: topic }
  ]

  console.log('[题目分析] 调用OpenRouter API...')
  console.log('[题目分析] 请求内容:', JSON.stringify(messages, null, 2))

  // 调用OpenRouter API
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://your-application.com',
      'X-Title': 'English Learning Scene Test',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  })

  const endTime = Date.now()
  const apiCallTime = endTime - startTime

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[题目分析] API错误:', response.status, errorData)
    console.error('[题目分析] 调用时间:', apiCallTime, 'ms')
    return NextResponse.json(
      {
        error: '大模型API调用失败',
        details: errorData,
        status: response.status
      },
      {
        status: response.status
      }
    )
  }

  const data = await response.json()
  const message = data.choices[0]?.message

  console.log('[题目分析] 处理API响应...')

  // 处理题目分析请求的响应
  let analysisResult = {
    scene: '餐厅',
    roles: ['顾客', '服务员'],
    dialogueGoal: '顾客与服务员开始对话'
  }

  try {
    // 尝试解析JSON格式的分析结果
    if (message?.content) {
      const content = message.content.trim()
      console.log('[题目分析] 原始分析结果:', content)

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        // 验证解析结果是否包含必要字段
        if (parsedResult.scene && parsedResult.roles && parsedResult.dialogueGoal) {
          analysisResult = parsedResult
          console.log('[题目分析] 解析的题目分析结果:', analysisResult)
        } else {
          console.log('[题目分析] 解析结果缺少必要字段，使用默认分析结果')
        }
      } else {
        // 如果不是JSON格式，使用默认分析结果
        console.log('[题目分析] 使用默认题目分析结果:', analysisResult)
      }
    }
  } catch (error) {
    console.error('[题目分析] 解析分析结果失败:', error)
  }

  console.log('[题目分析] 分析完成:', analysisResult)
  console.log('[题目分析] 处理时间:', Date.now() - startTime, 'ms')

  return NextResponse.json(analysisResult)
}

// 对话分析
async function analyzeConversation(conversation: Message[], rounds: number, startTime: number) {
  console.log('[对话分析] 开始处理:', new Date().toISOString())
  console.log('[对话分析] 对话轮数:', rounds)
  console.log('[对话分析] 对话历史:', JSON.stringify(conversation, null, 2))

  // 构建系统提示词
  const systemPrompt = `
你是一位专业的英语口语评测专家。请分析以下英语对话，并给出详细的评测报告。

请从以下几个维度进行评分（0-100分）：
1. 内容完整性：对话内容是否完整、恰当
2. 语法正确性：语法错误数量和严重程度
3. 词汇丰富度：词汇使用的多样性和准确性
4. 发音准确性：基于文本推断的发音准确度
5. 对话流畅度：对话的自然程度和连贯性

同时请提供：
1. 总体评分（0-100分）
2. 改进建议（3-5条具体建议）
3. 对话流程分析（简要描述对话的整体表现）

请以JSON格式输出结果：
{
  "overallScore": 85,
  "dimensions": {
    "content": 88,
    "grammar": 82,
    "vocabulary": 80,
    "pronunciation": 85,
    "fluency": 84
  },
  "suggestions": [
    "建议1",
    "建议2",
    "建议3"
  ],
  "conversationFlow": "对话整体流畅，能够基本表达意图..."
}
  `.trim()

  // 构建对话文本
  const conversationText = conversation.map(msg => {
    const role = msg.role === 'assistant' ? 'AI' : '用户'
    return `${role}: ${msg.content}`
  }).join('\n')

  // 构建消息历史
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析以下对话（共${rounds}轮）：\n\n${conversationText}` }
  ]

  console.log('[对话分析] 调用OpenRouter API...')
  console.log('[对话分析] 请求内容:', JSON.stringify(messages, null, 2))

  // 调用OpenRouter API
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://your-application.com',
      'X-Title': 'English Learning Scene Test',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  })

  const endTime = Date.now()
  const apiCallTime = endTime - startTime

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[对话分析] API错误:', response.status, errorData)
    console.error('[对话分析] 调用时间:', apiCallTime, 'ms')
    // 返回模拟数据
    return NextResponse.json(generateMockAnalysis(conversation))
  }

  const data = await response.json()
  const message = data.choices[0]?.message

  console.log('[对话分析] 处理API响应...')

  // 处理对话分析响应
  let analysisResult = generateMockAnalysis(conversation)

  try {
    // 尝试解析JSON格式的分析结果
    if (message?.content) {
      const content = message.content.trim()
      console.log('[对话分析] 原始分析结果:', content)

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        // 验证解析结果是否包含必要字段
        if (parsedResult.overallScore && parsedResult.dimensions && parsedResult.suggestions) {
          analysisResult = {
            ...parsedResult,
            transcript: conversation,
            audioUrl: undefined
          }
          console.log('[对话分析] 解析的对话分析结果:', analysisResult)
        } else {
          console.log('[对话分析] 解析结果缺少必要字段，使用默认分析结果')
        }
      } else {
        console.log('[对话分析] 使用默认对话分析结果')
      }
    }
  } catch (error) {
    console.error('[对话分析] 解析分析结果失败:', error)
  }

  console.log('[对话分析] 分析完成')
  console.log('[对话分析] 处理时间:', Date.now() - startTime, 'ms')

  return NextResponse.json(analysisResult)
}

// 生成模拟分析数据
function generateMockAnalysis(conversation: Message[]) {
  return {
    overallScore: 78,
    dimensions: {
      content: 82,
      grammar: 75,
      vocabulary: 70,
      pronunciation: 85,
      fluency: 76,
    },
    transcript: conversation,
    audioUrl: undefined,
    suggestions: [
      '注意动词时态的正确使用',
      '尝试使用更多连接词使对话更流畅',
      '扩充词汇量，使用更丰富的表达方式',
      '注意发音的准确性，特别是元音发音',
      '练习更自然的对话节奏和语调',
    ],
    conversationFlow: '对话整体流畅，能够基本表达自己的想法，但在某些话题上可以更深入展开。建议增加对话的互动性，主动提问和回应对方的问题。',
  }
}
