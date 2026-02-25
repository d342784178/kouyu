import { NextResponse } from 'next/server'
import { callLLMForScene, Message as LLMMessage } from '@/lib/llm'
import { generateSpeech } from '../utils/speechGenerator'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 定义请求类型
interface ChatRequest {
  sceneId: string
  testId: string
  conversation: Message[]
  round: number
  maxRounds: number
  isInitialization?: boolean
}

// 定义响应类型
interface ChatResponse {
  message: string
  audioUrl?: string
  isEnd: boolean
  round: number
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body: any = await request.json()
    const { sceneId, testId, conversation, round, maxRounds, isInitialization, analysisRequest, scene, aiRole, userRole, dialogueGoal, difficultyLevel } = body

    console.log('[大模型对话] 开始处理:', new Date().toISOString())
    console.log('[大模型对话] 场景:', sceneId, '测试:', testId, `轮数: ${round}/${maxRounds}`)
    console.log('[大模型对话] 类型:', isInitialization ? '初始化' : '继续', '分析:', analysisRequest)
    console.log('[大模型对话] 角色:', aiRole, '(AI) vs', userRole, '(用户)')
    console.log('[大模型对话] 场景:', scene, '目标:', dialogueGoal, '难度:', difficultyLevel)

    // 根据操作类型构建不同的系统提示词
    let systemPrompt
    if (analysisRequest) {
      // 题目分析：分析测试题目，提取场景、角色和对话目标
      systemPrompt = `
你是一位英语学习助手。请分析以下测试题目并提取：
1. 场景：对话发生的地点
2. 角色：对话参与者（作为列表）
3. 对话目标：对话的主题

保持分析简洁明了。仅以JSON格式输出这三个部分的内容。

示例输入：
在餐厅点餐

示例输出：
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}

另一个示例输入：
在酒店办理入住

示例输出：
{
  "scene": "酒店前台",
  "roles": ["客人", "酒店接待员"],
  "dialogueGoal": "客人在酒店办理入住"
}
      `.trim()
    } else if (isInitialization) {
      // 对话初始化：根据场景、角色和难度等级生成开场白
      systemPrompt = `
你是${aiRole}，在${scene}场景中。用户是${userRole}。

你的目标是开始一段关于${dialogueGoal}的自然英语对话。

难度等级：${difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

生成一句友好、自然的开场白，邀请用户回应。
保持简短（1-2句话）。

重要要求：
1. 只返回英文回复，不要包含任何中文或其他语言
2. 不要包含任何思考过程、解释或其他内容
3. 直接返回最终的英文回复文本
4. 确保回复是完整的句子，符合英文语法

示例：

场景：餐厅 | AI：服务员 | 用户：顾客 | 目标：点餐
Welcome to our restaurant! What can I get for you today?

场景：酒店 | AI：接待员 | 用户：客人 | 目标：办理入住
Good afternoon! Welcome to our hotel. May I help you with your check-in?
      `.trim()
    } else {
      // 继续对话：根据历史上下文生成回应
      systemPrompt = `
你是${aiRole}，在${scene}场景中。用户是${userRole}。

你的目标是继续关于${dialogueGoal}的对话。

难度等级：${difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

分析以下完整对话历史，并以${aiRole}的身份自然用英语回应：

${conversation.map((msg: Message) => `${msg.role === 'user' ? userRole : aiRole}: ${msg.content}`).join('\n')}

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
    }

    // 构建消息历史
    let messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt }
    ]
    
    // 添加对话历史（如果有的话）
    if (conversation && conversation.length > 0) {
      messages = [...messages, ...conversation.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))]
    }
    
    // GLM API 要求 system 消息后必须有 user 消息
    // 如果只有 system 消息（如分析请求），添加一个默认的 user 消息
    if (messages.length === 1) {
      messages.push({ role: 'user', content: '请根据以上要求完成任务。' })
    }

    console.log('[大模型对话] 调用LLM API...')
    console.log('[大模型对话] 请求内容:', JSON.stringify(messages, null, 2))

    // 根据请求类型选择模型
    // - 题目分析使用高质量模型
    // - 对话生成使用快速模型
    const sceneType = analysisRequest ? 'scene-analysis' : 'dialogue-generation'
    const llmResponse = await callLLMForScene(sceneType, messages, 0.7, 500)
    const content = llmResponse.content
    
    console.log('[大模型对话] 处理API响应...')
    
    // 处理不同类型的请求响应
    if (analysisRequest) {
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
            }
          }
        }
      } catch (error) {
        console.error('[大模型对话] 解析分析结果失败:', error)
      }
      
      console.log('[大模型对话] 分析完成:', analysisResult)
      console.log('[大模型对话] 处理时间:', Date.now() - startTime, 'ms')
      
      return NextResponse.json(analysisResult)
    } else {
      // 处理对话生成请求的响应
      // 从响应中提取完整的对话回复
      let assistantMessage = content.trim()
      
      console.log('[大模型对话] 大模型回复:', assistantMessage)
      console.log('[大模型对话] 提取回复:', assistantMessage)
      console.log('[大模型对话] 消耗tokens:', llmResponse.usage?.total_tokens || '未知')

      // 检查是否成功提取到回复
      if (assistantMessage === '') {
        console.error('[大模型对话] 未成功提取到回复')
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

      // 检查是否达到最大轮数
      const isEnd = round >= maxRounds
      console.log('[大模型对话] 对话状态:', isEnd ? '结束' : '继续')

      // 生成语音
      let audioUrl: string | undefined
      console.log('[大模型对话] 生成语音...')
      
      try {
        // 使用语音生成辅助函数
        const speechResult = await generateSpeech({
          text: assistantMessage.trim(),
          voice: 'en-US-AriaNeural'
        })
        
        audioUrl = speechResult.audioUrl
        console.log('[大模型对话] 语音生成成功')
      } catch (speechError) {
        console.error('[大模型对话] 语音生成失败:', speechError)
      }

      // 构建响应
      const chatResponse: ChatResponse = {
        message: assistantMessage.trim(),
        audioUrl: audioUrl,
        isEnd: isEnd,
        round: round + 1,
      }

      console.log('[大模型对话] 处理完成:', Date.now() - startTime, 'ms')

      return NextResponse.json(chatResponse)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '大模型集成API错误'
    console.error('[大模型对话] 处理错误:', errorMessage)
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
