import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { callLLMForScene, Message } from '@/lib/llm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SceneInfo {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
}

interface PracticeContent {
  roles: Array<{
    name: string
    suggest: boolean
    description: string
  }>
  topic: string
  analysis: string
  description: string
  scenario_context: string
  suggested_opening: string
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const neonSql = neon(process.env.DATABASE_URL || '')

    const sceneResult = await neonSql`
      SELECT id, name, category, description, difficulty 
      FROM scenes 
      WHERE id = ${id}
    `

    if (!sceneResult || sceneResult.length === 0) {
      return NextResponse.json(
        { error: '场景不存在' },
        { status: 404 }
      )
    }

    const sceneData = sceneResult[0] as SceneInfo

    const testContent = await generatePracticeContent(sceneData)

    return NextResponse.json({
      scene: {
        id: sceneData.id,
        name: sceneData.name,
        category: sceneData.category,
        description: sceneData.description
      },
      testContent
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '生成练习内容失败'
    console.error('Error in GET /api/scenes/[id]/practice-content:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

async function generatePracticeContent(scene: SceneInfo): Promise<PracticeContent> {
  const systemPrompt = `你是一位英语口语教学专家。请根据给定的场景信息，生成一个开放式对话练习的配置。

你需要生成以下内容：
1. roles: 对话角色列表（必须是2个角色，一个用户角色，一个AI角色）
   - name: 角色名称（中文）
   - suggest: 是否为建议用户扮演的角色（只有一个为true，通常是顾客/消费者/寻求帮助者这类角色）
   - description: 角色描述（中文，说明角色的身份和目的）

2. topic: 对话主题（中文，简短概括）

3. analysis: 学习重点分析（中文，说明这个场景需要掌握的表达和注意事项）

4. description: 场景描述（中文，简短描述对话情境）

5. scenario_context: 场景上下文（中文，详细描述对话背景和具体情境）

6. suggested_opening: 建议的开场白（英文，用户可以说出的第一句话）

请以JSON格式输出，不要有其他内容。

示例输出：
{
  "roles": [
    {
      "name": "顾客",
      "suggest": true,
      "description": "寻找特定商品并询问优惠的顾客"
    },
    {
      "name": "店员",
      "suggest": false,
      "description": "指导顾客并解释促销活动的热心店员"
    }
  ],
  "topic": "超市购物",
  "analysis": "重点掌握方位询问（如 'in the back of', 'next to'）、商品咨询（如 'organic', 'by the kilogram'）以及促销活动的表达。注意使用礼貌用语，如 'Excuse me', 'Please', 'Thank you'。",
  "description": "模拟购物对话，寻商品、比价及找收银台。",
  "scenario_context": "顾客在超市购物，需要寻找蔬菜区和有机番茄，询问价格计量方式和促销活动，最后询问收银台位置。",
  "suggested_opening": "Excuse me, could you tell me where the vegetable section is?"
}`

  const userPrompt = `场景信息：
- 名称：${scene.name}
- 分类：${scene.category}
- 描述：${scene.description}
- 难度：${scene.difficulty}

请生成这个场景的对话练习配置。`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  const response = await callLLMForScene('scene-analysis', messages, 0.3, 10000)
  const content = response.content?.trim()

  if (!content) {
    throw new Error('LLM返回空内容')
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('LLM返回内容中未找到JSON格式')
  }

  const parsedResult = JSON.parse(jsonMatch[0])

  if (!validatePracticeContent(parsedResult)) {
    throw new Error('LLM返回的JSON格式验证失败')
  }

  return parsedResult
}

function validatePracticeContent(data: any): data is PracticeContent {
  // 必须恰好有2个角色
  if (!data.roles || !Array.isArray(data.roles) || data.roles.length !== 2) {
    console.log('[Practice Content] 角色数量不符合要求，期望2个，实际:', data.roles?.length)
    return false
  }

  // 检查是否恰好有一个建议角色
  const suggestRoles = data.roles.filter((r: any) => r.suggest === true)

  if (suggestRoles.length !== 1) {
    console.log('[Practice Content] 建议角色数量不符合要求，期望1个，实际:', suggestRoles.length)
    return false
  }

  for (const role of data.roles) {
    if (!role.name || typeof role.suggest !== 'boolean' || !role.description) {
      console.log('[Practice Content] 角色字段缺失:', role)
      return false
    }
  }

  if (!data.topic || !data.analysis || !data.description || !data.scenario_context || !data.suggested_opening) {
    console.log('[Practice Content] 必要字段缺失')
    return false
  }

  return true
}


