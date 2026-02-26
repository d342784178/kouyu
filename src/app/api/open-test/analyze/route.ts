import { NextResponse } from 'next/server'
import { callLLMForScene, Message } from '@/lib/llm'
import { db } from '@/lib/db'
import { sceneTests, scenes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ==================== 类型定义 ====================

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

interface QuestionAnalysisResult {
  scene: string
  roles: string[]
  dialogueGoal: string
}

// ==================== 主入口 ====================

/**
 * 题目分析接口 - 带缓存
 * 用于分析测试题目，提取场景、角色、对话目标
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { topic, testId, sceneId, sceneName } = body

    console.log('[题目分析] 收到请求:', { topic, testId, sceneId })

    if (!topic) {
      return NextResponse.json(
        { error: '缺少必要的参数', details: '请提供测试题目(topic)' },
        { status: 400 }
      )
    }

    // 获取场景名称
    const finalSceneName = await getSceneName(sceneId, sceneName)
    
    // 检查缓存
    const cached = await checkCache<QuestionAnalysisResult>(testId, 'questionAnalysis')
    if (cached) {
      console.log('[题目分析] 返回缓存结果')
      return NextResponse.json(cached)
    }

    // 调用LLM进行分析
    const result = await analyzeQuestionWithLLM(topic, finalSceneName)
    
    // 保存到缓存
    await saveCache(testId, 'questionAnalysis', result)

    console.log('[题目分析] 完成:', Date.now() - startTime, 'ms')
    return NextResponse.json(result)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '题目分析API错误'
    console.error('[题目分析] 处理错误:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ==================== 辅助函数 ====================

/**
 * 获取场景名称
 */
async function getSceneName(sceneId?: string, fallbackName?: string): Promise<string | undefined> {
  if (!sceneId || fallbackName) return fallbackName
  
  try {
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId)
    })
    return scene?.name
  } catch (err) {
    console.error('[题目分析] 查询场景名称失败:', err)
    return undefined
  }
}

/**
 * 检查缓存
 */
async function checkCache<T>(testId: string | undefined, cacheKey: string): Promise<T | null> {
  if (!testId) return null
  
  try {
    const cachedTest = await db.query.sceneTests.findFirst({
      where: eq(sceneTests.id, testId)
    })
    
    const content = cachedTest?.content as any
    if (content?.[cacheKey]) {
      console.log(`[题目分析] 命中缓存: ${cacheKey}`)
      return { ...content[cacheKey], cached: true } as T
    }
  } catch (err) {
    console.error('[题目分析] 检查缓存失败:', err)
  }
  
  return null
}

/**
 * 保存到缓存
 */
async function saveCache(testId: string | undefined, cacheKey: string, data: any): Promise<void> {
  if (!testId) return
  
  try {
    const cachedTest = await db.query.sceneTests.findFirst({
      where: eq(sceneTests.id, testId)
    })
    
    if (cachedTest) {
      const currentContent = (cachedTest.content as any) || {}
      await db
        .update(sceneTests)
        .set({
          content: { ...currentContent, [cacheKey]: data }
        })
        .where(eq(sceneTests.id, testId))
      console.log(`[题目分析] 缓存保存成功: ${cacheKey}`)
    }
  } catch (err) {
    console.error('[题目分析] 保存缓存失败:', err)
  }
}

/**
 * 调用LLM分析题目
 */
async function analyzeQuestionWithLLM(topic: string, sceneName?: string): Promise<QuestionAnalysisResult> {
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

示例输出：
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}
`.trim()

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: topic }
  ]

  try {
    // 题目分析使用高质量模型
    const response = await callLLMForScene('scene-analysis', messages, 0.7, 500)
    const content = response.content?.trim()
    
    if (!content) {
      console.log('[题目分析] LLM返回空内容，使用默认结果')
      return getDefaultAnalysisResult(sceneName)
    }
    
    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('[题目分析] 未找到JSON格式，使用默认结果')
      return getDefaultAnalysisResult(sceneName)
    }
    
    const parsedResult = JSON.parse(jsonMatch[0])
    
    // 验证必要字段
    if (parsedResult.scene && Array.isArray(parsedResult.roles) && parsedResult.dialogueGoal) {
      return {
        scene: parsedResult.scene,
        roles: parsedResult.roles,
        dialogueGoal: parsedResult.dialogueGoal
      }
    }
    
    console.log('[题目分析] JSON验证失败，使用默认结果')
    return getDefaultAnalysisResult(sceneName)
    
  } catch (error) {
    console.error('[题目分析] LLM调用或解析失败:', error)
    return getDefaultAnalysisResult(sceneName)
  }
}

/**
 * 获取默认分析结果
 */
function getDefaultAnalysisResult(sceneName?: string): QuestionAnalysisResult {
  return {
    scene: sceneName || '餐厅',
    roles: ['顾客', '服务员'],
    dialogueGoal: '完成对话练习'
  }
}
