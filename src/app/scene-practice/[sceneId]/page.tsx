'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Loading from '@/components/Loading'
import OpenTestDialog from '@/app/scene-test/[id]/[testId]/OpenTestDialog'
import type { OpenDialogueContent } from '@/app/scene-test/components/open-test'

interface SceneInfo {
  id: string
  name: string
  category: string
  description: string
}

interface PracticeContent {
  scene: SceneInfo
  testContent: OpenDialogueContent
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="返回"
      className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  )
}

export default function ScenePracticePage() {
  const params = useParams<{ sceneId: string }>()
  const router = useRouter()
  const sceneId = params.sceneId || ''

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [practiceContent, setPracticeContent] = useState<PracticeContent | null>(null)

  useEffect(() => {
    const fetchPracticeContent = async () => {
      if (!sceneId) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/scenes/${sceneId}/practice-content`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('场景不存在或暂无练习内容')
          } else {
            setError('加载失败，请重试')
          }
          return
        }

        const data: PracticeContent = await response.json()
        setPracticeContent(data)
      } catch {
        setError('网络错误，请检查连接后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPracticeContent()
  }, [sceneId])

  const handleBack = () => {
    router.back()
  }

  const handleComplete = () => {
    router.push(`/scene-overview/${sceneId}`)
  }

  if (isLoading) {
    return (
      <Loading
        message="正在准备练习内容..."
        subMessage="AI 正在为您生成个性化对话场景"
        fullScreen
      />
    )
  }

  if (error || !practiceContent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8]">
        <div className="max-w-[430px] mx-auto px-6 pt-6">
          <div className="flex items-center mb-6">
            <BackButton onClick={handleBack} />
            <h2 className="ml-3 text-base font-medium text-gray-600">自主 AI 练习</h2>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700 mb-2">{error || '加载失败'}</p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 px-5 py-2 rounded-full bg-[#4F7CF0] text-white text-sm font-medium"
            >
              返回
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8]">
      <div className="max-w-[430px] mx-auto px-6 pt-6">
        <div className="flex items-center mb-4">
          <BackButton onClick={handleBack} />
          <div className="ml-3">
            <h2 className="text-base font-medium text-gray-900">{practiceContent.scene.name}</h2>
            <p className="text-xs text-gray-500">自主 AI 练习</p>
          </div>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto h-[calc(100vh-80px)]">
        <OpenTestDialog
          sceneId={sceneId}
          testId={`practice_${sceneId}`}
          testContent={practiceContent.testContent}
          scene={practiceContent.scene}
          onComplete={handleComplete}
          autoStart={true}
        />
      </div>
    </div>
  )
}
