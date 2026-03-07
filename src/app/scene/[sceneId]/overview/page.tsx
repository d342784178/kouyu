import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import SceneOverviewClient from './SceneOverviewClient'
import { getSubScenesBySceneId } from '@/lib/db/sub-scenes'
import { getSceneMetadata, getAllSceneIds } from '@/lib/db/scenes'
import type { SceneInfo, SubSceneItem, SceneOverviewData } from './SceneOverviewClient'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const sceneIds = await getAllSceneIds()
  return sceneIds.map((sceneId) => ({
    sceneId,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { sceneId: string }
}): Promise<Metadata> {
  const { sceneId } = params
  const metadata = await getSceneMetadata(sceneId)

  if (!metadata) {
    return {
      title: '场景不存在',
    }
  }

  return {
    title: `${metadata.title} - 场景大纲`,
    description: metadata.description,
  }
}

async function getSceneOverviewData(sceneId: string): Promise<SceneOverviewData | null> {
  try {
    const { neon } = await import('@neondatabase/serverless')
    const neonSql = neon(process.env.DATABASE_URL || '')

    const [sceneResult, subScenesResult] = await Promise.all([
      neonSql`SELECT id, name, description, category, difficulty FROM scenes WHERE id = ${sceneId}`,
      getSubScenesBySceneId(sceneId),
    ])

    if (!sceneResult || sceneResult.length === 0) {
      return null
    }

    const sceneData = sceneResult[0] as {
      id: string
      name: string
      description: string
      category: string
      difficulty: string
    }

    const scene: SceneInfo = {
      id: sceneData.id,
      name: sceneData.name,
      description: sceneData.description,
      category: sceneData.category,
      difficulty: sceneData.difficulty,
    }

    const subScenes: SubSceneItem[] = subScenesResult.map((s) => ({
      id: s.id,
      sceneId: s.sceneId,
      name: s.name,
      description: s.description,
      order: s.order,
      estimatedMinutes: s.estimatedMinutes,
    }))

    return { scene, subScenes }
  } catch (error) {
    console.error(`[getSceneOverviewData] 获取场景 ${sceneId} 数据失败:`, error)
    return null
  }
}

export default async function SceneOverviewPage({
  params,
}: {
  params: { sceneId: string }
}) {
  const { sceneId } = params
  const data = await getSceneOverviewData(sceneId)

  if (!data) {
    notFound()
  }

  return <SceneOverviewClient data={data} sceneId={sceneId} />
}
