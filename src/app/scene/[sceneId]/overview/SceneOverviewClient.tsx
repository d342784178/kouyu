'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// ============================================================
// 类型定义
// ============================================================

/** 子场景列表项 */
export interface SubSceneItem {
  id: string
  sceneId: string
  name: string
  description: string
  order: number
  estimatedMinutes: number | null
}

/** 场景基本信息 */
export interface SceneInfo {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
}

/** 页面数据结构 */
export interface SceneOverviewData {
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
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 bg-gray-100 text-gray-500">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{subScene.name}</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0 mt-0.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>

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
      transition={{ duration: 0.3, delay: 0.1 }}
      whileTap={{ scale: 0.97 }}
      className="w-full py-4 rounded-card font-semibold text-base text-white shadow-md transition-all active:shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #4F7CF0, #6366F1)',
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
// 主客户端组件
// ============================================================
export default function SceneOverviewClient({
  data,
  sceneId,
}: {
  data: SceneOverviewData
  sceneId: string
}) {
  const router = useRouter()
  const { scene, subScenes } = data

  const handleNavigateToSubScene = (subSceneId: string) => {
    router.push(`/scene/${sceneId}/learn/${subSceneId}`)
  }

  const handleNavigateToAIPractice = (id: string) => {
    router.push(`/scene/${id}/practice`)
  }

  const handleBack = () => {
    router.push('/scene')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-8">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        <div className="flex items-center mb-6">
          <BackButton onClick={handleBack} />
          <h2 className="ml-3 text-base font-medium text-gray-600">场景大纲</h2>
        </div>

        <SceneHeader scene={scene} subSceneCount={subScenes.length} />

        {subScenes.length === 0 ? (
          <ContentPreparing />
        ) : (
          <>
            <div className="space-y-3 mb-5">
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

            <div className="mb-3">
              <AIPracticeBtn
                sceneId={sceneId}
                onClick={handleNavigateToAIPractice}
              />
            </div>
          </>
        )}

      </div>
    </div>
  )
}
