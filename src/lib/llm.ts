/**
 * 大语言模型调用模块
 * 支持多模型厂商快速切换
 *
 * 支持的提供商:
 * - openai: OpenAI GPT 系列
 * - azure: Azure OpenAI
 * - anthropic: Claude 系列
 * - google: Gemini 系列
 * - mistral: Mistral AI
 * - groq: Groq (高速推理)
 * - deepseek: DeepSeek
 * - glm: 智谱 AI (GLM-4)
 * - nvidia: NVIDIA NIM
 * - custom: 自定义 OpenAI 兼容 API
 */

// ==================== 类型定义 ====================

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

export type LLMProvider =
  | 'openai'
  | 'azure'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'deepseek'
  | 'glm'
  | 'nvidia'
  | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
}

// ==================== 提供商配置 ====================

/**
 * 获取环境变量配置
 */
function getEnvConfig(): Record<LLMProvider, Partial<LLMConfig>> {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    azure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
      model: process.env.AZURE_OPENAI_MODEL || 'gpt-4',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash',
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    glm: {
      apiKey: process.env.GLM_API_KEY,
      baseUrl: process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.GLM_MODEL || 'glm-4-flash',
    },
    nvidia: {
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1',
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct',
    },
    custom: {
      apiKey: process.env.CUSTOM_API_KEY,
      baseUrl: process.env.CUSTOM_API_URL,
      model: process.env.CUSTOM_MODEL || 'default',
    },
  }
}

/**
 * 获取提供商配置
 */
export function getProviderConfig(
  provider?: LLMProvider,
  customModel?: string
): LLMConfig {
  const envConfig = getEnvConfig()
  const targetProvider = provider || (process.env.LLM_PROVIDER as LLMProvider) || 'glm'

  const config = envConfig[targetProvider]
  if (!config.apiKey) {
    console.warn(`[LLM] ${targetProvider} 未配置完整，尝试使用备用配置`)
  }

  return {
    provider: targetProvider,
    model: customModel || config.model || 'default',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  }
}

// ==================== 核心 API ====================

/**
 * 调用大语言模型
 *
 * 使用示例:
 * ```typescript
 * // 使用默认提供商
 * const response = await callLLM(messages)
 *
 * // 指定提供商
 * const response = await callLLM(messages, 0.7, 1000, 'nvidia')
 *
 * // 指定提供商和模型
 * const response = await callLLM(messages, 0.7, 1000, 'openai', 'gpt-4o')
 * ```
 *
 * @param messages 消息列表
 * @param temperature 温度参数 (0-1)
 * @param maxTokens 最大token数
 * @param provider 提供商名称
 * @param model 模型名称 (可选，覆盖默认模型)
 * @returns 模型响应
 */
export async function callLLM(
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 1000,
  provider?: LLMProvider,
  model?: string
): Promise<LLMResponse> {
  const startTime = Date.now()

  try {
    const config = getProviderConfig(provider, model)
    console.log(`[LLM] 使用提供商: ${config.provider}, 模型: ${config.model}`)

    if (!config.apiKey) {
      throw new Error(`[LLM] ${config.provider} 的 API Key 未配置`)
    }

    // 构建请求体
    const requestBody = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
    }

    // 构建 API URL
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
    const apiUrl = `${baseUrl}/chat/completions`

    console.log('[LLM] 请求 URL:', apiUrl)
    console.log('[LLM] 请求消息:', messages)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('[LLM] API错误:', response.status, errorText)
      throw new Error(`API调用失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    console.log('[LLM] 响应内容:', content.substring(0, 100) + (content.length > 100 ? '...' : ''))
    console.log('[LLM] 调用耗时:', Date.now() - startTime, 'ms')
    console.log('[LLM] Token 使用:', data.usage)

    return {
      content,
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
    }
  } catch (error) {
    console.error('[LLM] 调用失败:', error)
    throw error
  }
}

/**
 * 流式调用大语言模型
 *
 * 使用示例:
 * ```typescript
 * await callLLMStream(
 *   messages,
 *   (chunk) => console.log(chunk),
 *   0.7,
 *   1000,
 *   'nvidia'
 * )
 * ```
 *
 * @param messages 消息列表
 * @param onChunk 收到数据块的回调
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @param provider 提供商名称
 * @param model 模型名称 (可选)
 */
export async function callLLMStream(
  messages: Message[],
  onChunk: (chunk: string) => void,
  temperature: number = 0.7,
  maxTokens: number = 1000,
  provider?: LLMProvider,
  model?: string
): Promise<void> {
  console.log('[LLM Stream] 开始流式调用:', new Date().toISOString())

  try {
    const config = getProviderConfig(provider, model)
    console.log(`[LLM Stream] 使用提供商: ${config.provider}, 模型: ${config.model}`)

    if (!config.apiKey) {
      throw new Error(`[LLM Stream] ${config.provider} 的 API Key 未配置`)
    }

    // 构建请求体
    const requestBody = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
      stream: true,
    }

    // 构建 API URL
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
    const apiUrl = `${baseUrl}/chat/completions`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`API流式调用失败: ${response.status} - ${errorText}`)
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
            const content = parsed.choices?.[0]?.delta?.content || ''
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

// ==================== 智能模型路由 ====================

/**
 * 模型质量等级
 */
export type ModelQuality = 'fast' | 'balanced' | 'quality'

/**
 * 场景类型
 */
export type SceneType =
  | 'question-evaluation'    // 问答题评测
  | 'dialogue-generation'    // 对话生成
  | 'scene-analysis'         // 场景分析
  | 'open-ended-test'        // 开放式测试
  | 'general'                // 通用

/**
 * 获取场景对应的模型配置
 * @param sceneType 场景类型
 * @returns 模型配置
 */
export function getModelForScene(sceneType: SceneType): {
  provider: LLMProvider
  model: string
  quality: ModelQuality
} {
  // 从环境变量读取配置
  const nvidiaFastModel = process.env.NVIDIA_MODEL_FAST || 'meta/llama-3.1-8b-instruct'
  const nvidiaQualityModel = process.env.NVIDIA_MODEL_QUALITY || 'meta/llama-3.1-70b-instruct'

  switch (sceneType) {
    // 问答题评测 - 使用高质量模型
    case 'question-evaluation':
      return {
        provider: 'nvidia',
        model: nvidiaQualityModel,
        quality: 'quality',
      }

    // 开放式测试 - 使用高质量模型
    case 'open-ended-test':
      return {
        provider: 'nvidia',
        model: nvidiaQualityModel,
        quality: 'quality',
      }

    // 场景分析 - 使用高质量模型
    case 'scene-analysis':
      return {
        provider: 'nvidia',
        model: nvidiaFastModel,
        quality: 'quality',
      }

    // 对话生成 - 使用快速模型
    case 'dialogue-generation':
      return {
        provider: 'nvidia',
        model: nvidiaFastModel,
        quality: 'fast',
      }

    // 默认使用平衡配置
    default:
      return {
        provider: (process.env.LLM_PROVIDER as LLMProvider) || 'nvidia',
        model: nvidiaFastModel,
        quality: 'balanced',
      }
  }
}

/**
 * 根据场景调用大语言模型
 *
 * @param sceneType 场景类型
 * @param messages 消息列表
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @returns 模型响应
 */
export async function callLLMForScene(
  sceneType: SceneType,
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  const config = getModelForScene(sceneType)

  console.log(`[LLM] 场景: ${sceneType}, 使用模型: ${config.model} (${config.quality})`)

  return callLLM(messages, temperature, maxTokens, config.provider, config.model)
}

/**
 * 流式调用 - 根据场景
 */
export async function callLLMStreamForScene(
  sceneType: SceneType,
  messages: Message[],
  onChunk: (chunk: string) => void,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<void> {
  const config = getModelForScene(sceneType)

  console.log(`[LLM Stream] 场景: ${sceneType}, 使用模型: ${config.model} (${config.quality})`)

  return callLLMStream(messages, onChunk, temperature, maxTokens, config.provider, config.model)
}

// ==================== 便捷函数 ====================

/**
 * 快速切换提供商的便捷函数
 */
export const llm = {
  /**
   * 使用 OpenAI
   */
  openai: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'openai', model),

  /**
   * 使用 Claude
   */
  claude: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'anthropic', model),

  /**
   * 使用 Gemini
   */
  gemini: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'google', model),

  /**
   * 使用 Groq (高速推理)
   */
  groq: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'groq', model),

  /**
   * 使用 DeepSeek
   */
  deepseek: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'deepseek', model),

  /**
   * 使用 GLM
   */
  glm: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'glm', model),

  /**
   * 使用 NVIDIA
   */
  nvidia: (messages: Message[], temperature?: number, maxTokens?: number, model?: string) =>
    callLLM(messages, temperature, maxTokens, 'nvidia', model),

  /**
   * 使用高质量模型 (70B)
   */
  quality: (messages: Message[], temperature?: number, maxTokens?: number) =>
    callLLM(messages, temperature, maxTokens, 'nvidia', process.env.NVIDIA_MODEL_QUALITY || 'meta/llama-3.1-70b-instruct'),

  /**
   * 使用快速模型 (8B)
   */
  fast: (messages: Message[], temperature?: number, maxTokens?: number) =>
    callLLM(messages, temperature, maxTokens, 'nvidia', process.env.NVIDIA_MODEL_FAST || 'meta/llama-3.1-8b-instruct'),
}

// ==================== 提供商列表 ====================

/**
 * 获取所有支持的提供商列表
 */
export function getSupportedProviders(): { id: LLMProvider; name: string; description: string }[] {
  return [
    { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-4o, GPT-3.5' },
    { id: 'azure', name: 'Azure OpenAI', description: '企业级 OpenAI 服务' },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude 3 系列' },
    { id: 'google', name: 'Google', description: 'Gemini 系列' },
    { id: 'mistral', name: 'Mistral', description: 'Mistral Large, Medium' },
    { id: 'groq', name: 'Groq', description: '超高速推理 (Llama, Mixtral)' },
    { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat, Coder' },
    { id: 'glm', name: '智谱 AI', description: 'GLM-4 系列' },
    { id: 'nvidia', name: 'NVIDIA', description: 'NVIDIA NIM (Llama, Mistral)' },
    { id: 'custom', name: '自定义', description: 'OpenAI 兼容 API' },
  ]
}
