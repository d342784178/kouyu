import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'
import { generateSpeech } from '../utils/speechGenerator'
import { generateInitiatePrompt } from '@/lib/prompts/role-play-prompts'

// 定义响应类型
interface InitiateResponse {
  message: string
  audioUrl?: string
  isEnd: boolean
  round: number
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { sceneId, testId, scene, aiRole, userRole, dialogueGoal, difficultyLevel } = body

    // 验证必要的参数
    if (!scene || !aiRole || !userRole || !dialogueGoal || !difficultyLevel) {
      return NextResponse.json(
        {
          error: '缺少必要的参数',
          details: '请提供场景、AI角色、用户角色、对话目标和难度等级'
        },
        {
          status: 400
        }
      )
    }

    console.log('[对话初始化] 开始处理:', new Date().toISOString())
    console.log('[对话初始化] 场景:', sceneId, '测试:', testId)
    console.log('[对话初始化] 场景:', scene, 'AI角色:', aiRole, '用户角色:', userRole)
    console.log('[对话初始化] 对话目标:', dialogueGoal, '难度等级:', difficultyLevel)

    // 使用新的提示词模板生成系统提示词
    const systemPrompt = generateInitiatePrompt(scene, aiRole, userRole, dialogueGoal, difficultyLevel)

    console.log('[对话初始化] 生成的提示词:\n', systemPrompt)

    // 构建消息历史 - GLM API 需要至少一条 user 消息
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请开始对话。' }
    ]

    console.log('[对话初始化] 调用对话生成模型API...')

    // 调用对话生成模型API (meta/llama-3.1-8b-instruct)
    const response = await callLLMForScene('dialogue-generation', messages, 0.7, 500)
    const assistantMessage = response.content.trim()
    
    console.log('[对话初始化] 大模型回复:', assistantMessage)

    // 检查是否成功提取到回复
    if (!assistantMessage) {
      console.error('[对话初始化] 未成功提取到回复')
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
    
    console.log('[对话初始化] 提取回复:', assistantMessage)
    console.log('[对话初始化] 消耗tokens:', response.usage?.total_tokens || '未知')

    // 对话初始化时，轮数为1，对话未结束
    const isEnd = false
    const round = 1
    console.log('[对话初始化] 对话状态:', isEnd ? '结束' : '继续')

    // 生成语音
    let audioUrl: string | undefined
    console.log('[对话初始化] 生成语音...')

    try {
      // 使用语音生成辅助函数，传入难度等级以调整语速
      const speechResult = await generateSpeech({
        text: assistantMessage,
        voice: 'en-US-AriaNeural',
        difficultyLevel: difficultyLevel
      })

      audioUrl = speechResult.audioUrl
      console.log('[对话初始化] 语音生成成功，语速配置:', difficultyLevel)
    } catch (speechError) {
      console.error('[对话初始化] 语音生成失败:', speechError)
    }

    // 构建响应
    const initiateResponse: InitiateResponse = {
      message: assistantMessage,
      audioUrl: audioUrl,
      isEnd: isEnd,
      round: round,
    }

    console.log('[对话初始化] 处理完成:', Date.now() - startTime, 'ms')

    return NextResponse.json(initiateResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '对话初始化API错误'
    console.error('[对话初始化] 处理错误:', errorMessage)
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
