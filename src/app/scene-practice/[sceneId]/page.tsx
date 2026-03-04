'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Loading from '@/components/Loading'

export default function ScenePracticePage() {
  const params = useParams<{ sceneId: string }>()
  const router = useRouter()
  const sceneId = params.sceneId || ''

  useEffect(() => {
    if (sceneId) {
      router.replace(`/scene-practice/${sceneId}/role-selection`)
    }
  }, [sceneId, router])

  return (
    <Loading
      message="正在准备练习内容..."
      subMessage="AI 正在为您生成个性化对话场景"
      fullScreen
    />
  )
}
