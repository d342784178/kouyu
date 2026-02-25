import { NextResponse } from 'next/server'
import { callLLM, Message } from '@/lib/llm'
import { generateSpeech } from '../utils/speechGenerator'

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

    // 构建系统提示词
    const systemPrompt = `
你是${aiRole}，在${scene}场景中。用户是${userRole}。
你的目标是开始一段关于${dialogueGoal}的自然英语对话。

难度等级：${difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

直接生成一句友好、自然的英文开场白，邀请用户回应。保持简短（1-2句话）。

重要要求：
1. 直接输出英文回复，不要思考过程
2. 不要包含任何中文、解释或其他内容
3. 只返回纯英文句子
4. 确保是完整的英文句子

示例：
场景：餐厅 | AI：服务员 | 用户：顾客 | 目标：点餐
Welcome to our restaurant! What can I get for you today?

场景：酒店 | AI：接待员 | 用户：客人 | 目标：办理入住
Good afternoon! Welcome to our hotel. May I help you with your check-in?
    `.trim()

    // 构建消息历史 - GLM API 需要至少一条 user 消息
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请开始对话。' }
    ]

    console.log('[对话初始化] 调用GLM API...')

    // 调用GLM API
    const response = await callLLM(messages, 0.7, 500)
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
