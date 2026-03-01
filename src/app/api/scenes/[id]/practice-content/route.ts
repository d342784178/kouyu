import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import type { OpenDialogueContent } from '@/app/scene-test/components/open-test'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SceneInfo {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
}

interface OpenDialogueTest {
  id: string
  sceneId: string
  type: string
  content: OpenDialogueContent
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

    const testResult = await neonSql`
      SELECT id, scene_id, type, content 
      FROM scene_tests 
      WHERE scene_id = ${id} AND type = 'open_dialogue'
      LIMIT 1
    `

    let testContent: OpenDialogueContent

    if (testResult && testResult.length > 0) {
      const testData = testResult[0] as OpenDialogueTest
      testContent = testData.content
    } else {
      testContent = {
        topic: sceneData.name,
        description: sceneData.description,
        roles: [
          {
            name: 'AI Assistant',
            description: 'A helpful conversation partner',
            is_user: false,
            suggest: false
          },
          {
            name: 'You',
            description: 'Practice your English conversation skills',
            is_user: true,
            suggest: true
          }
        ],
        scenario_context: `Practice English conversation in the context of ${sceneData.name}. ${sceneData.description}`,
        suggested_opening: `Hello! Let's practice English conversation about ${sceneData.name}. How can I help you today?`,
        analysis: `This is a practice session for ${sceneData.name} in the ${sceneData.category} category.`
      }
    }

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
    console.error('Error in GET /api/scenes/[id]/practice-content:', error)
    return NextResponse.json(
      { error: '获取练习内容失败' },
      { status: 500 }
    )
  }
}
