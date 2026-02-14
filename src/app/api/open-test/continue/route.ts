import { NextResponse } from 'next/server'
import { generateSpeech } from '../utils/speechGenerator'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 定义响应类型
interface ContinueResponse {
  message: string
  audioUrl?: string
  isEnd: boolean
  round: number
}

// OpenRouter API配置
const OPENROUTER_API_KEY = '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'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free'

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { sceneId, testId, conversation, round, maxRounds, scene, aiRole, userRole, dialogueGoal, difficultyLevel } = body

    // 验证必要的参数
    if (!difficultyLevel || !conversation || !Array.isArray(conversation)) {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供难度等级和对话历史'
        },
        {
          status: 400
        }
      )
    }
    
    // 为可选参数设置默认值
    const defaultScene = scene || '餐厅'
    const defaultAiRole = aiRole || '服务员'
    const defaultUserRole = userRole || '顾客'
    const defaultDialogueGoal = dialogueGoal || '顾客与服务员对话'

    // 验证对话历史是否为空
    if (conversation.length === 0) {
      return NextResponse.json(
        {
          error: '对话历史为空',
          details: '请提供至少一条对话记录'
        },
        {
          status: 400
        }
      )
    }

    console.log('[对话生成] 开始处理:', new Date().toISOString())
    console.log('[对话生成] 场景:', sceneId, '测试:', testId, `轮数: ${round}/${maxRounds}`)
    console.log('[对话生成] 场景:', defaultScene, 'AI角色:', defaultAiRole, '用户角色:', defaultUserRole)
    console.log('[对话生成] 对话目标:', defaultDialogueGoal, '难度等级:', difficultyLevel)
    console.log('[对话生成] 对话历史长度:', conversation.length)

    // 构建系统提示词
    const systemPrompt = `
你是${defaultAiRole}，在${defaultScene}场景中。用户是${defaultUserRole}。

你的目标是继续关于${defaultDialogueGoal}的对话。

难度等级：${difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

分析以下完整对话历史，并以${defaultAiRole}的身份自然用英语回应：

${conversation.map(msg => `${msg.role === 'user' ? defaultUserRole : defaultAiRole}: ${msg.content}`).join('\n')}

保持回应简短（1-2句话）。

重要要求：
1. 只返回英文回复，不要包含任何中文或其他语言
2. 不要包含任何思考过程、解释或其他内容
3. 直接返回最终的英文回复文本
4. 确保回复是完整的句子，符合英文语法

示例：

顾客：I would like to order a hamburger and fries, please.
Sure! How would you like your hamburger cooked, and would you like a drink with that?

客人：I have a reservation for tonight.
Great! Could you please provide your name and reservation number?
    `.trim()

    // 构建消息历史
    const messages = [
      { role: 'system', content: systemPrompt }
    ]

    console.log('[对话生成] 调用OpenRouter API...')
    console.log('[对话生成] 对话历史:', JSON.stringify(conversation, null, 2))
    console.log('[对话生成] 请求内容:', JSON.stringify(messages, null, 2))

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
      console.error('[对话生成] API错误:', response.status, errorData)
      console.error('[对话生成] 调用时间:', apiCallTime, 'ms')
      // 返回真实错误信息
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
    
    console.log('[对话生成] 处理API响应...')

    // 从响应中提取完整的对话回复
    let assistantMessage = ''
    
    // 1. 首先检查 content 字段
    if (message?.content) {
      const content = message.content.trim()
      console.log('[对话生成] 大模型回复:', content)
      if (content.length > 0) {
        assistantMessage = content
        console.log('[对话生成] 从content字段提取回复:', assistantMessage)
      }
    }
    

    
    // 4. 如果仍然没有提取到回复，使用默认的英文回复
    if (assistantMessage === '') {
      assistantMessage = 'Sure! How would you like your hamburger cooked, and would you like a drink with that?'
      console.log('[对话生成] 使用默认英文回复:', assistantMessage)
    }
    
    // 最终检查，确保回复主要是英文的
    // 允许英文字母、空格、标点符号和常见的特殊字符（包括软连字符、普通连字符、各种撇号等）
    if (!/^[A-Za-z\s.,!?"'\'\-\u00AD\u2019]+$/.test(assistantMessage)) {
      console.log('[对话生成] 回复包含非英文内容，保持为空')
      assistantMessage = ''
    } else {
      console.log('[对话生成] 回复是英文的，直接使用')
    }
    
    // 检查是否成功提取到回复
    if (assistantMessage === '') {
      console.error('[对话生成] 未成功提取到回复')
      return NextResponse.json(
        {
          error: '未成功提取到回复',
          details: '大模型返回的响应中未包含有效的英文回复'
        },
        {
          status: 500
        }
      )
    }
    
    console.log('[对话生成] 提取回复:', assistantMessage)
    console.log('[对话生成] 消耗tokens:', data.usage?.total_tokens || '未知')
    console.log('[对话生成] 完整响应:', JSON.stringify(data, null, 2))

    // 检查是否达到最大轮数
    const isEnd = round >= maxRounds
    console.log('[对话生成] 对话状态:', isEnd ? '结束' : '继续')

    // 生成语音
    let audioUrl: string | undefined
    console.log('[对话生成] 生成语音...')
    
    try {
      // 使用语音生成辅助函数
      const speechResult = await generateSpeech({
        text: assistantMessage.trim(),
        voice: 'en-US-AriaNeural'
      })
      
      audioUrl = speechResult.audioUrl
      console.log('[对话生成] 语音生成成功')
    } catch (speechError) {
      console.error('[对话生成] 语音生成失败:', speechError)
    }

    // 构建响应
    const continueResponse: ContinueResponse = {
      message: assistantMessage.trim(),
      audioUrl: audioUrl,
      isEnd: isEnd,
      round: round + 1,
    }

    console.log('[对话生成] 处理完成:', Date.now() - startTime, 'ms')

    return NextResponse.json(continueResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '对话生成API错误'
    console.error('[对话生成] 处理错误:', errorMessage)
    // 返回真实错误信息
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
