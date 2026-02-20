import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'
import { db } from '@/lib/db'
import { sceneTests, scenes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// 定义消息类型
interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

// 定义分析结果类型
interface AnalysisResult {
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

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { topic, conversation, rounds, testId, sceneId, sceneName, userAnswer, correctAnswer, evaluationType } = body

    // 判断请求类型
    if (evaluationType === 'qa' && userAnswer) {
      // 问答题评测
      console.log('[分析] 问答题评测请求')
      return evaluateQAAnswer(topic, userAnswer, correctAnswer, startTime)
    } else if (topic) {
      console.log('[分析] 题目分析请求 - topic:', topic, 'sceneId:', sceneId, 'sceneName:', sceneName)
      // 如果传入了 sceneId，查询场景名称
      let sceneNameFromDb = sceneName
      if (sceneId && !sceneName) {
        console.log('[分析] 开始查询场景名称, sceneId:', sceneId)
        try {
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, sceneId)
          })
          console.log('[分析] 查询场景结果:', scene)
          if (scene) {
            sceneNameFromDb = scene.name
            console.log('[分析] 获取到场景名称:', sceneNameFromDb)
          } else {
            console.log('[分析] 未找到场景, sceneId:', sceneId)
          }
        } catch (err) {
          console.error('[分析] 查询场景名称失败:', err)
        }
      }
      console.log('[分析] 最终传递给 analyzeQuestion 的 sceneName:', sceneNameFromDb)
      return analyzeQuestion(topic, sceneNameFromDb, testId, startTime)
    } else if (conversation && Array.isArray(conversation)) {
      return analyzeConversation(conversation, rounds || 0, testId, startTime)
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
async function analyzeQuestion(topic: string, sceneName: string | undefined, testId: string | undefined, startTime: number) {
  console.log('[题目分析] 开始处理:', new Date().toISOString())
  console.log('[题目分析] 测试题目:', topic)
  console.log('[题目分析] 场景名称:', sceneName)
  console.log('[题目分析] 测试ID:', testId)

  // 如果有testId，先检查缓存
  if (testId) {
    try {
      console.log('[题目分析] 检查缓存...')
      const cachedTest = await db.query.sceneTests.findFirst({
        where: eq(sceneTests.id, testId)
      })

      if (cachedTest?.content && typeof cachedTest.content === 'object') {
        const content = cachedTest.content as any
        // 检查是否有缓存的题目分析结果
        if (content.questionAnalysis) {
          console.log('[题目分析] 命中缓存，返回缓存结果')
          return NextResponse.json({
            ...content.questionAnalysis,
            cached: true
          })
        }
      }
    } catch (error) {
      console.error('[题目分析] 检查缓存失败:', error)
      // 缓存检查失败继续执行分析
    }
  }

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
${sceneName ? `- 参考场景名称："${sceneName}"，请结合这个场景名称来分析题目` : ''}

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
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: topic }
  ]

  console.log('[题目分析] 系统提示词:', systemPrompt)
  console.log('[题目分析] 调用GLM API...')

  try {
    // 调用GLM API
    const response = await callLLM(messages, 0.7, 500)
    const content = response.content

    console.log('[题目分析] 原始分析结果:', content)

    // 处理题目分析请求的响应
    let analysisResult = {
      scene: '餐厅',
      roles: ['顾客', '服务员'],
      dialogueGoal: '顾客与服务员开始对话'
    }

    try {
      // 尝试解析JSON格式的分析结果
      if (content) {
        const trimmedContent = content.trim()

        // 提取JSON部分
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
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

    // 保存到缓存
    if (testId) {
      try {
        console.log('[题目分析] 保存结果到缓存...')
        const cachedTest = await db.query.sceneTests.findFirst({
          where: eq(sceneTests.id, testId)
        })

        if (cachedTest) {
          const currentContent = cachedTest.content as any || {}
          await db
            .update(sceneTests)
            .set({
              content: {
                ...currentContent,
                questionAnalysis: analysisResult
              }
            })
            .where(eq(sceneTests.id, testId))
          console.log('[题目分析] 缓存保存成功')
        }
      } catch (error) {
        console.error('[题目分析] 保存缓存失败:', error)
        // 缓存保存失败不影响返回结果
      }
    }

    console.log('[题目分析] 分析完成:', analysisResult)
    console.log('[题目分析] 处理时间:', Date.now() - startTime, 'ms')

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error('[题目分析] GLM API调用失败:', error)
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
}

// 问答题评测
async function evaluateQAAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  startTime: number
) {
  console.log('[问答题评测] 开始处理:', new Date().toISOString())
  console.log('[问答题评测] 题目:', question)
  console.log('[问答题评测] 用户答案:', userAnswer)
  console.log('[问答题评测] 正确答案:', correctAnswer)

  // 构建系统提示词
  const systemPrompt = `
你是一位专业的英语评测专家。请评测用户的英语回答，并给出评分和反馈。

## 评分标准（0-100分）
- 90-100分：回答完全正确，表达清晰准确
- 70-89分：回答基本正确，有小错误
- 50-69分：回答部分正确，需要改进
- 0-49分：回答不正确或偏离主题

## 输出要求
请以JSON格式输出结果：
{
  "score": 85,
  "feedback": "回答基本正确，但可以更完整一些。",
  "suggestions": ["建议1", "建议2"]
}

## 重要提示
1. 评分要客观公正
2. feedback要具体、有建设性
3. suggestions要实用、可操作
`.trim()

  // 构建评测内容
  const evaluationContent = `
题目：${question}
正确答案：${correctAnswer}
用户回答：${userAnswer}

请评测用户的回答。
`.trim()

  // 构建消息历史
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: evaluationContent }
  ]

  console.log('[问答题评测] 调用GLM API...')

  try {
    // 调用GLM API
    const response = await callLLM(messages, 0.7, 500)
    const content = response.content

    console.log('[问答题评测] 原始评测结果:', content)

    // 处理评测响应
    let evaluationResult = {
      score: 70,
      feedback: '回答基本正确，但可以更完整一些。',
      suggestions: ['尝试使用更完整的句子', '注意语法结构']
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
          if (typeof parsedResult.score === 'number' && parsedResult.feedback) {
            evaluationResult = {
              score: parsedResult.score,
              feedback: parsedResult.feedback,
              suggestions: parsedResult.suggestions || []
            }
            console.log('[问答题评测] 解析的评测结果:', evaluationResult)
          } else {
            console.log('[问答题评测] 解析结果缺少必要字段，使用默认评测结果')
          }
        } else {
          console.log('[问答题评测] 使用默认评测结果')
        }
      }
    } catch (error) {
      console.error('[问答题评测] 解析评测结果失败:', error)
    }

    console.log('[问答题评测] 评测完成:', evaluationResult)
    console.log('[问答题评测] 处理时间:', Date.now() - startTime, 'ms')

    return NextResponse.json(evaluationResult)
  } catch (error) {
    console.error('[问答题评测] GLM API调用失败:', error)
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
}

// 填空题评测
async function evaluateFillBlankAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  startTime: number
) {
  console.log('[填空题评测] 开始处理:', new Date().toISOString())
  console.log('[填空题评测] 题目:', question)
  console.log('[填空题评测] 用户答案:', userAnswer)
  console.log('[填空题评测] 正确答案:', correctAnswer)

  // 构建系统提示词
  const systemPrompt = `
你是一位专业的英语评测专家。请评测用户的填空题回答，判断是否符合题目要求并给出分析。

## 评测标准
1. 判断用户回答是否符合题目要求（isCorrect: true/false）
2. 分析用户回答的优点和不足
3. 给出具体的改进建议

## 输出要求
请以JSON格式输出结果：
{
  "isCorrect": true,
  "analysis": "用户回答基本符合题目要求，语法正确，表达清晰。",
  "suggestions": ["建议1", "建议2"]
}

## 重要提示
1. isCorrect 表示回答是否正确（布尔值）
2. analysis 要具体、有建设性，解释为什么对或错
3. suggestions 要实用、可操作，帮助用户改进
4. 即使用户回答与标准答案不完全一致，只要符合题目要求也可以认为是正确的
`.trim()

  // 构建评测内容
  const evaluationContent = `
题目：${question}
参考答案：${correctAnswer}
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
      isCorrect: userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim(),
      analysis: '回答已提交，请参考参考答案。',
      suggestions: ['对比你的答案和参考答案', '注意语法和词汇的使用']
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
}

// 对话分析
async function analyzeConversation(
  conversation: ConversationMessage[],
  rounds: number,
  testId: string,
  startTime: number
) {
  console.log('[对话分析] 开始处理:', new Date().toISOString())
  console.log('[对话分析] 对话轮数:', rounds)
  console.log('[对话分析] 测试ID:', testId)

  // 如果有testId，先检查缓存
  if (testId) {
    try {
      console.log('[对话分析] 检查缓存...')
      const cachedTest = await db.query.sceneTests.findFirst({
        where: eq(sceneTests.id, testId)
      })

      if (cachedTest?.content && typeof cachedTest.content === 'object') {
        const content = cachedTest.content as any
        // 检查是否有缓存的分析结果
        if (content.analysisResult) {
          console.log('[对话分析] 命中缓存，返回缓存结果')
          return NextResponse.json({
            ...content.analysisResult,
            transcript: conversation,
            cached: true
          })
        }
      }
    } catch (error) {
      console.error('[对话分析] 检查缓存失败:', error)
      // 缓存检查失败继续执行分析
    }
  }

  console.log('[对话分析] 对话历史:', JSON.stringify(conversation, null, 2))

  // 构建系统提示词
  const systemPrompt = `
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

  // 构建对话文本
  const conversationText = conversation.map(msg => {
    const role = msg.role === 'assistant' ? 'AI' : '用户'
    return `${role}: ${msg.content}`
  }).join('\n')

  // 构建消息历史
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析以下对话（共${rounds}轮）：\n\n${conversationText}` }
  ]

  console.log('[对话分析] 调用GLM API...')

  try {
    // 调用GLM API
    const response = await callLLM(messages, 0.7, 1000)
    const content = response.content

    console.log('[对话分析] 原始分析结果:', content)

    // 处理对话分析响应
    let analysisResult: AnalysisResult = generateMockAnalysis(conversation)

    try {
      // 尝试解析JSON格式的分析结果
      if (content) {
        const trimmedContent = content.trim()

        // 提取JSON部分
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
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

    // 保存到缓存
    if (testId) {
      try {
        console.log('[对话分析] 保存结果到缓存...')
        const cachedTest = await db.query.sceneTests.findFirst({
          where: eq(sceneTests.id, testId)
        })

        if (cachedTest) {
          const currentContent = cachedTest.content as any || {}
          await db
            .update(sceneTests)
            .set({
              content: {
                ...currentContent,
                analysisResult: {
                  overallScore: analysisResult.overallScore,
                  dimensions: analysisResult.dimensions,
                  suggestions: analysisResult.suggestions,
                  conversationFlow: analysisResult.conversationFlow
                }
              }
            })
            .where(eq(sceneTests.id, testId))
          console.log('[对话分析] 缓存保存成功')
        }
      } catch (error) {
        console.error('[对话分析] 保存缓存失败:', error)
        // 缓存保存失败不影响返回结果
      }
    }

    console.log('[对话分析] 分析完成')
    console.log('[对话分析] 处理时间:', Date.now() - startTime, 'ms')

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error('[对话分析] GLM API调用失败:', error)
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
}

// 生成模拟分析数据
function generateMockAnalysis(conversation: ConversationMessage[]) {
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
