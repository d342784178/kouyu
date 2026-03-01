'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// ============================================================
// 类型定义
// ============================================================

/** 子场景列表项（来自 API 响应） */
interface SubSceneItem {
  id: string
  sceneId: string
  name: string
  description: string
  order: number
  estimatedMinutes: number | null
}

/** 场景基本信息（来自 API 响应） */
interface SceneInfo {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
}

/** API 响应结构 */
interface SubScenesApiResponse {
  scene: SceneInfo
  subScenes: SubSceneItem[]
}

// ============================================================
// 工具函数
// ============================================================

/** 格式化预计时长显示 */
function formatDuration(minutes: number | null): string {
  if (!minutes) return '约 5 分钟'
  return `约 ${minutes} 分钟`
}

// ============================================================
// 子组件：返回按钮
// ============================================================
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

// ============================================================
// 子组件：场景头部信息
// ============================================================
function SceneHeader({ scene, subSceneCount }: { scene: SceneInfo; subSceneCount: number }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{scene.name}</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-3">{scene.description}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F7CF0]">
          {scene.category}
        </span>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-500">
          {scene.difficulty}
        </span>
        <span className="text-xs text-gray-400">
          共 {subSceneCount} 个子场景
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 子组件：子场景卡片
// ============================================================
function SubSceneCard({
  subScene,
  index,
  onClick,
}: {
  subScene: SubSceneItem
  index: number
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left bg-white rounded-card shadow-card border border-gray-100 p-4 transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {/* 序号圆圈 */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 bg-gray-100 text-gray-500">
          {index + 1}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{subScene.name}</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0 mt-0.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>

          {/* 元信息行 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDuration(subScene.estimatedMinutes)}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ============================================================
// 子组件：开始学习按钮
// ============================================================
function StartLearningBtn({
  subScenes,
  onClick,
}: {
  subScenes: SubSceneItem[]
  onClick: (subSceneId: string) => void
}) {
  const targetSubScene = subScenes[0]
  if (!targetSubScene) return null

  return (
    <motion.button
      type="button"
      onClick={() => onClick(targetSubScene.id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      whileTap={{ scale: 0.97 }}
      className="w-full py-4 rounded-card font-semibold text-base text-white shadow-md transition-all active:shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #4F7CF0, #6366F1)',
      }}
    >
      <span className="flex items-center justify-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        开始学习
      </span>
    </motion.button>
  )
}

// ============================================================
// 子组件：自主AI练习按钮
// ============================================================
function AIPracticeBtn({
  sceneId,
  onClick,
}: {
  sceneId: string
  onClick: (sceneId: string) => void
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(sceneId)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      whileTap={{ scale: 0.97 }}
      className="w-full py-4 rounded-card font-semibold text-base shadow-md transition-all active:shadow-sm border-2"
      style={{
        background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
        borderColor: '#4F7CF0',
        color: '#1E40AF',
      }}
    >
      <span className="flex items-center justify-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5 1.5 1.5 0 0 0 7.5 16 1.5 1.5 0 0 0 9 14.5 1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5M12 17.5a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5" />
        </svg>
        自主AI练习
      </span>
    </motion.button>
  )
}

// ============================================================
// 子组件：内容准备中占位
// ============================================================
function ContentPreparing() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F7CF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">内容准备中</h3>
      <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed">
        该场景的学习内容正在精心制作，敬请期待
      </p>
    </motion.div>
  )
}

// ============================================================
// 子组件：加载骨架屏
// ============================================================
function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* 头部骨架 */}
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full mb-1" />
        <div className="h-4 bg-gray-200 rounded w-4/5 mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16" />
          <div className="h-6 bg-gray-200 rounded-full w-12" />
        </div>
      </div>
      {/* 按钮骨架 */}
      <div className="h-14 bg-gray-200 rounded-card mb-4" />
      {/* 卡片骨架 */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-card p-4 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200 rounded-full w-16" />
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 主页面组件
// ============================================================
export default function SceneOverviewPage({
  params,
}: {
  params: { sceneId: string }
}) {
  const { sceneId } = params
  const router = useRouter()

  const [scene, setScene] = useState<SceneInfo | null>(null)
  const [subScenes, setSubScenes] = useState<SubSceneItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取子场景列表和场景信息
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch(`/api/scenes/${sceneId}/sub-scenes`)

        if (!res.ok) {
          if (res.status === 404) {
            setError('场景不存在')
          } else {
            setError('加载失败，请重试')
          }
          return
        }

        const data: SubScenesApiResponse = await res.json()
        setScene(data.scene)
        setSubScenes(data.subScenes ?? [])
      } catch {
        setError('网络错误，请检查连接后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sceneId])

  // 跳转到指定子场景学习页
  const handleNavigateToSubScene = (subSceneId: string) => {
    router.push(`/scene-learning/${subSceneId}`)
  }

  // 跳转到自主AI练习页面
  const handleNavigateToAIPractice = (sceneId: string) => {
    router.push(`/scene-practice/${sceneId}`)
  }

  // 返回上一页
  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-8">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        {/* 顶部导航栏 */}
        <div className="flex items-center mb-6">
          <BackButton onClick={handleBack} />
          <h2 className="ml-3 text-base font-medium text-gray-600">场景大纲</h2>
        </div>

        {/* 加载状态 */}
        {isLoading && <LoadingSkeleton />}

        {/* 错误状态 */}
        {!isLoading && error && (
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
            <p className="text-base font-semibold text-gray-700 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-5 py-2 rounded-full bg-[#4F7CF0] text-white text-sm font-medium"
            >
              重新加载
            </button>
          </motion.div>
        )}

        {/* 正常内容 */}
        {!isLoading && !error && scene && (
          <>
            {/* 场景头部 */}
            <SceneHeader scene={scene} subSceneCount={subScenes.length} />

            {/* 无子场景：内容准备中 */}
            {subScenes.length === 0 ? (
              <ContentPreparing />
            ) : (
              <>
                {/* 开始学习按钮 */}
                <div className="mb-3">
                  <StartLearningBtn
                    subScenes={subScenes}
                    onClick={handleNavigateToSubScene}
                  />
                </div>

                {/* 自主AI练习按钮 */}
                <div className="mb-5">
                  <AIPracticeBtn
                    sceneId={sceneId}
                    onClick={handleNavigateToAIPractice}
                  />
                </div>

                {/* 子场景卡片列表 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">全部子场景</h3>
                  {subScenes.map((subScene, index) => (
                    <SubSceneCard
                      key={subScene.id}
                      subScene={subScene}
                      index={index}
                      onClick={() => handleNavigateToSubScene(subScene.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
