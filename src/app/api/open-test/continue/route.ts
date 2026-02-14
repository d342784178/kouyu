import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'
import { generateSpeech } from '../utils/speechGenerator'

// 定义消息类型
interface ConversationMessage {
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
    console.log('[对话生成] 完整对话历史:', JSON.stringify(conversation, null, 2))

    // 构建系统提示词
    const systemPrompt = `
你是${defaultAiRole}，在${defaultScene}场景中。用户是${defaultUserRole}。
你的目标是继续关于${defaultDialogueGoal}的对话。

难度等级：${difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

重要要求：
1. 只返回英文回复，不要包含任何中文或其他语言
2. 不要包含任何思考过程、解释或其他内容
3. 直接返回最终的英文回复文本
4. 确保回复是完整的句子，符合英文语法
5. 请根据对话历史上下文进行回应

示例：
顾客：I would like to order a hamburger and fries, please.
服务员：Sure! How would you like your hamburger cooked, and would you like a drink with that?
    `.trim()

    // 构建消息历史 - 包含系统提示和所有对话历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      // 将所有历史对话转换为消息格式
      ...conversation.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content
      })),
      // 添加最后一条消息，提示AI继续对话
      { role: 'user', content: '请根据以上对话历史，继续对话。' }
    ]

    console.log('[对话生成] 调用GLM API...')
    console.log('[对话生成] 传递给GLM的消息:', JSON.stringify(messages, null, 2))

    // 调用GLM API
    const response = await callLLM(messages, 0.7, 500)
    const assistantMessage = response.content.trim()
    
    console.log('[对话生成] 大模型回复:', assistantMessage)

    // 检查是否成功提取到回复
    if (!assistantMessage) {
      console.error('[对话生成] 未成功提取到回复')
      return NextResponse.json(
        {
          error: '未成功提取到回复',
          details: '大模型返回的响应中未包含有效的回复'
        },
        {
          status: 500
        }
      )
    }
    
    console.log('[对话生成] 提取回复:', assistantMessage)
    console.log('[对话生成] 消耗tokens:', response.usage?.total_tokens || '未知')

    // 检查是否达到最大轮数
    const isEnd = round >= maxRounds
    console.log('[对话生成] 对话状态:', isEnd ? '结束' : '继续')

    // 生成语音
    let audioUrl: string | undefined
    console.log('[对话生成] 生成语音...')
    
    try {
      // 使用语音生成辅助函数
      const speechResult = await generateSpeech({
        text: assistantMessage,
        voice: 'en-US-AriaNeural'
      })
      
      audioUrl = speechResult.audioUrl
      console.log('[对话生成] 语音生成成功')
    } catch (speechError) {
      console.error('[对话生成] 语音生成失败:', speechError)
    }

    // 构建响应
    const continueResponse: ContinueResponse = {
      message: assistantMessage,
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
