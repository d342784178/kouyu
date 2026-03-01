import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'
import { generateSpeech } from '../utils/speechGenerator'
import { generateContinuePrompt } from '@/lib/prompts/role-play-prompts'

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
  isComplete?: boolean // 对话是否已完成标志
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

    // 生成系统提示词（只含角色规则，不含对话历史）
    const systemPrompt = generateContinuePrompt(
      defaultScene,
      defaultAiRole,
      defaultUserRole,
      defaultDialogueGoal,
      difficultyLevel
    )

    console.log('[对话生成] 生成的提示词:\n', systemPrompt)

    // 构建消息：system prompt + 对话历史（避免重复传递）
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    console.log('[对话生成] 调用对话生成模型API...')
    console.log('[对话生成] 传递给模型的消息:', JSON.stringify(messages, null, 2))

    // 调用对话生成模型API (meta/llama-3.1-8b-instruct)
    const response = await callLLMForScene('dialogue-generation', messages, 0.7, 500)
    const content = response.content.trim()
    
    console.log('[对话生成] 大模型回复:', content)

    // 检查是否成功提取到回复
    if (!content) {
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
    
    // 解析大模型返回的JSON
    let isComplete = false
    let assistantMessage = ''
    
    try {
      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        
        // 验证必要字段
        if (typeof parsedResult.isComplete === 'boolean' && parsedResult.message) {
          isComplete = parsedResult.isComplete
          assistantMessage = parsedResult.message
          console.log('[对话生成] 解析结果:', { isComplete, message: assistantMessage })
        } else {
          console.log('[对话生成] 解析结果缺少必要字段，使用原始内容')
          assistantMessage = content
        }
      } else {
        console.log('[对话生成] 未找到JSON格式，使用原始内容')
        assistantMessage = content
      }
    } catch (error) {
      console.error('[对话生成] 解析JSON失败:', error)
      // 如果解析失败，使用原始内容
      assistantMessage = content
    }
    
    console.log('[对话生成] 提取回复:', assistantMessage)
    console.log('[对话生成] 对话完成状态:', isComplete ? '已完成' : '未完成')
    console.log('[对话生成] 消耗tokens:', response.usage?.total_tokens || '未知')

    // 检查是否达到最大轮数（作为后备条件）
    const isMaxRoundsReached = round >= maxRounds
    const finalIsEnd = isComplete || isMaxRoundsReached
    
    console.log('[对话生成] 最终对话状态:', finalIsEnd ? '结束' : '继续')
    if (isMaxRoundsReached && !isComplete) {
      console.log('[对话生成] 达到最大轮数，强制结束对话')
    }

    // 生成语音
    let audioUrl: string | undefined
    console.log('[对话生成] 生成语音...')

    try {
      // 使用语音生成辅助函数，传入难度等级以调整语速
      const speechResult = await generateSpeech({
        text: assistantMessage,
        voice: 'en-US-AriaNeural',
        difficultyLevel: difficultyLevel
      })

      audioUrl = speechResult.audioUrl
      console.log('[对话生成] 语音生成成功，语速配置:', difficultyLevel)
    } catch (speechError) {
      console.error('[对话生成] 语音生成失败:', speechError)
    }

    // 构建响应
    const continueResponse: ContinueResponse = {
      message: assistantMessage,
      audioUrl: audioUrl,
      isEnd: finalIsEnd,
      isComplete: isComplete,
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
