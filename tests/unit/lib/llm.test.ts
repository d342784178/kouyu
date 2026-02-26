/**
 * src/lib/llm.ts 单元测试
 *
 * 测试目标：
 * 1. callLLM - 请求构造、响应解析、错误处理
 * 2. getModelForScene - 场景路由逻辑
 * 3. callLLMForScene - 场景路由 + 调用集成
 * 4. getProviderConfig - 提供商配置读取
 *
 * 设计原则：mock fetch，不发真实请求，确保换模型后逻辑不变
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  callLLM,
  callLLMForScene,
  getModelForScene,
  getProviderConfig,
  type Message,
  type LLMProvider,
  type SceneType,
} from '../../../src/lib/llm'

// ==================== 测试工具 ====================

/** 构造标准的 OpenAI 兼容响应体 */
function makeFetchResponse(content: string, usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage,
    }),
    text: async () => '',
  } as unknown as Response
}

/** 构造失败的 fetch 响应 */
function makeErrorResponse(status: number, body = 'API Error') {
  return {
    ok: false,
    status,
    text: async () => body,
  } as unknown as Response
}

const TEST_MESSAGES: Message[] = [
  { role: 'system', content: '你是一个助手' },
  { role: 'user', content: '你好' },
]

// ==================== callLLM 测试 ====================

describe('callLLM', () => {
  beforeEach(() => {
    // 设置测试用环境变量
    process.env.GLM_API_KEY = 'test-glm-key'
    process.env.LLM_PROVIDER = 'glm'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.GLM_API_KEY
    delete process.env.LLM_PROVIDER
  })

  it('正常调用：返回 content 和 usage', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('Hello World'))

    const result = await callLLM(TEST_MESSAGES)

    expect(result.content).toBe('Hello World')
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    })
  })

  it('请求体包含正确的 messages 格式', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('ok'))

    await callLLM(TEST_MESSAGES, 0.5, 200)

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)

    expect(body.messages).toEqual([
      { role: 'system', content: '你是一个助手' },
      { role: 'user', content: '你好' },
    ])
    expect(body.temperature).toBe(0.5)
    expect(body.max_tokens).toBe(200)
  })

  it('请求头包含 Authorization Bearer token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('ok'))

    await callLLM(TEST_MESSAGES)

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = (options as RequestInit).headers as Record<string, string>

    expect(headers['Authorization']).toBe('Bearer test-glm-key')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('API 返回空 content 时，结果 content 为空字符串', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
      text: async () => '',
    } as unknown as Response)

    const result = await callLLM(TEST_MESSAGES)
    expect(result.content).toBe('')
  })

  it('API 返回 choices 为空时，content 为空字符串', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
      text: async () => '',
    } as unknown as Response)

    const result = await callLLM(TEST_MESSAGES)
    expect(result.content).toBe('')
  })

  it('HTTP 错误时抛出异常', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'))

    await expect(callLLM(TEST_MESSAGES)).rejects.toThrow('401')
  })

  it('API Key 未配置时抛出异常', async () => {
    delete process.env.GLM_API_KEY

    await expect(callLLM(TEST_MESSAGES)).rejects.toThrow('API Key 未配置')
  })

  it('指定 provider 时使用对应的 API URL', async () => {
    process.env.NVIDIA_API_KEY = 'test-nvidia-key'
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('ok'))

    await callLLM(TEST_MESSAGES, 0.7, 500, 'nvidia')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url as string).toContain('nvidia')

    delete process.env.NVIDIA_API_KEY
  })

  it('usage 字段缺失时，result.usage 为 undefined', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      text: async () => '',
    } as unknown as Response)

    const result = await callLLM(TEST_MESSAGES)
    expect(result.usage).toBeUndefined()
  })
})

// ==================== getModelForScene 测试 ====================

describe('getModelForScene', () => {
  beforeEach(() => {
    process.env.NVIDIA_MODEL_FAST = 'meta/llama-3.1-8b-instruct'
    process.env.NVIDIA_MODEL_QUALITY = 'meta/llama-3.1-70b-instruct'
  })

  afterEach(() => {
    delete process.env.NVIDIA_MODEL_FAST
    delete process.env.NVIDIA_MODEL_QUALITY
  })

  const qualityScenes: SceneType[] = ['question-evaluation', 'open-ended-test']
  const fastScenes: SceneType[] = ['dialogue-generation']

  it.each(qualityScenes)('场景 %s 使用高质量模型', (scene) => {
    const config = getModelForScene(scene)
    expect(config.model).toBe('meta/llama-3.1-70b-instruct')
    expect(config.quality).toBe('quality')
  })

  it.each(fastScenes)('场景 %s 使用快速模型', (scene) => {
    const config = getModelForScene(scene)
    expect(config.model).toBe('meta/llama-3.1-8b-instruct')
    expect(config.quality).toBe('fast')
  })

  it('scene-analysis 使用快速模型', () => {
    const config = getModelForScene('scene-analysis')
    expect(config.model).toBe('meta/llama-3.1-8b-instruct')
  })

  it('环境变量变更后，模型配置随之变更（换模型验证）', () => {
    process.env.NVIDIA_MODEL_QUALITY = 'meta/llama-3.3-70b-instruct'

    const config = getModelForScene('question-evaluation')
    expect(config.model).toBe('meta/llama-3.3-70b-instruct')
  })

  it('所有场景类型都返回 provider 字段', () => {
    const scenes: SceneType[] = ['question-evaluation', 'dialogue-generation', 'scene-analysis', 'open-ended-test', 'general']
    for (const scene of scenes) {
      const config = getModelForScene(scene)
      expect(config.provider).toBeTruthy()
      expect(config.model).toBeTruthy()
      expect(config.quality).toMatch(/^(fast|balanced|quality)$/)
    }
  })
})

// ==================== getProviderConfig 测试 ====================

describe('getProviderConfig', () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER
    delete process.env.GLM_API_KEY
    delete process.env.GLM_MODEL
  })

  it('默认使用 glm 提供商', () => {
    process.env.GLM_API_KEY = 'key'
    const config = getProviderConfig()
    expect(config.provider).toBe('glm')
  })

  it('LLM_PROVIDER 环境变量可切换提供商', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'openai-key'
    const config = getProviderConfig()
    expect(config.provider).toBe('openai')
    delete process.env.OPENAI_API_KEY
  })

  it('customModel 参数覆盖默认模型', () => {
    process.env.GLM_API_KEY = 'key'
    const config = getProviderConfig('glm', 'glm-4-plus')
    expect(config.model).toBe('glm-4-plus')
  })

  it('GLM_MODEL 环境变量可自定义模型名', () => {
    process.env.GLM_API_KEY = 'key'
    process.env.GLM_MODEL = 'glm-4.5'
    const config = getProviderConfig('glm')
    expect(config.model).toBe('glm-4.5')
  })
})

// ==================== callLLMForScene 测试 ====================

describe('callLLMForScene', () => {
  beforeEach(() => {
    process.env.NVIDIA_API_KEY = 'test-nvidia-key'
    process.env.NVIDIA_MODEL_FAST = 'meta/llama-3.1-8b-instruct'
    process.env.NVIDIA_MODEL_QUALITY = 'meta/llama-3.1-70b-instruct'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.NVIDIA_API_KEY
    delete process.env.NVIDIA_MODEL_FAST
    delete process.env.NVIDIA_MODEL_QUALITY
  })

  it('question-evaluation 场景调用高质量模型', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('{"isCorrect":true}'))

    await callLLMForScene('question-evaluation', TEST_MESSAGES)

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.model).toBe('meta/llama-3.1-70b-instruct')
  })

  it('dialogue-generation 场景调用快速模型', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('Hello!'))

    await callLLMForScene('dialogue-generation', TEST_MESSAGES)

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.model).toBe('meta/llama-3.1-8b-instruct')
  })

  it('返回结构与 callLLM 一致', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse('test response'))

    const result = await callLLMForScene('general', TEST_MESSAGES)

    expect(result).toHaveProperty('content')
    expect(typeof result.content).toBe('string')
  })
})
