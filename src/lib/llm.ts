/**
 * 大语言模型调用模块
 * 统一封装GLM-4.5 API调用
 */

const GLM_API_KEY = '6b35d40fa78f134ba53d669abf0d26f5.udk8D9gGzss6l9o5'
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = 'glm-4-flash'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}



export interface LLMResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * 调用GLM-4.5模型
 * @param messages 消息列表
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @returns 模型响应
 */
export async function callLLM(
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  const startTime = Date.now()
  
  console.log('[LLM] 开始调用:', new Date().toISOString())
  console.log('[LLM] 请求消息:', JSON.stringify(messages, null, 2))
  
  try {
    // 确保消息格式正确
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    
    const requestBody = {
      model: MODEL,
      messages: formattedMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
    }
    
    console.log('[LLM] 请求体:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('[LLM] API错误:', response.status, errorText)
      throw new Error(`GLM API调用失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''
    
    console.log('[LLM] 响应内容:', content)
    console.log('[LLM] Token使用:', data.usage)
    console.log('[LLM] 调用耗时:', Date.now() - startTime, 'ms')
    
    return {
      content,
      usage: data.usage,
    }
  } catch (error) {
    console.error('[LLM] 调用失败:', error)
    throw error
  }
}

/**
 * 调用GLM-4.5模型（流式输出）
 * @param messages 消息列表
 * @param onChunk 收到数据块的回调
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 */
export async function callLLMStream(
  messages: Message[],
  onChunk: (chunk: string) => void,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<void> {
  console.log('[LLM Stream] 开始流式调用:', new Date().toISOString())
  
  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: 0.95,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`GLM API流式调用失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content || ''
            if (content) {
              onChunk(content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    console.log('[LLM Stream] 流式调用完成')
  } catch (error) {
    console.error('[LLM Stream] 流式调用失败:', error)
    throw error
  }
}
