'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { loadProgress } from '@/lib/scene-learning/progress'
import type { SubSceneProgress } from '@/types'

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

/** 根据进度状态返回对应的显示配置 */
function getStatusConfig(status: SubSceneProgress['status'] | 'not_started') {
  switch (status) {
    case 'completed':
      return {
        label: '已完成',
        bgColor: 'bg-green-50',
        textColor: 'text-green-600',
        borderColor: 'border-green-100',
        dotColor: 'bg-green-500',
      }
    case 'in_progress':
      return {
        label: '进行中',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-100',
        dotColor: 'bg-blue-500',
      }
    default:
      return {
        label: '未开始',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-100',
        dotColor: 'bg-gray-300',
      }
  }
}

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
// 子组件：状态徽章
// ============================================================
function StatusBadge({ status }: { status: SubSceneProgress['status'] | 'not_started' }) {
  const config = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bgColor} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} aria-hidden="true" />
      {config.label}
    </span>
  )
}

// ============================================================
// 子组件：子场景卡片
// ============================================================
function SubSceneCard({
  subScene,
  index,
  progress,
  onClick,
}: {
  subScene: SubSceneItem
  index: number
  progress: SubSceneProgress | null
  onClick: () => void
}) {
  const status = progress?.status ?? 'not_started'
  const statusConfig = getStatusConfig(status)
  const isCompleted = status === 'completed'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left bg-white rounded-card shadow-card border ${statusConfig.borderColor} p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        {/* 序号圆圈 */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
            isCompleted
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isCompleted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            index + 1
          )}
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
            <StatusBadge status={status} />
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
// 子组件：按顺序学习按钮
// ============================================================
function SequentialStartBtn({
  subScenes,
  progressMap,
  onClick,
}: {
  subScenes: SubSceneItem[]
  progressMap: Record<string, SubSceneProgress | null>
  onClick: (subSceneId: string) => void
}) {
  // 找到第一个未完成的子场景（按 order 排序）
  const firstIncomplete = subScenes.find(
    (s) => (progressMap[s.id]?.status ?? 'not_started') !== 'completed'
  )

  // 全部完成时，跳转到第一个子场景（复习）
  const targetSubScene = firstIncomplete ?? subScenes[0]

  if (!targetSubScene) return null

  const allCompleted = !firstIncomplete

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
        background: allCompleted
          ? 'linear-gradient(135deg, #10B981, #059669)'
          : 'linear-gradient(135deg, #4F7CF0, #6366F1)',
      }}
    >
      <span className="flex items-center justify-center gap-2">
        {allCompleted ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            重新学习
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            按顺序学习
          </>
        )}
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
  const [progressMap, setProgressMap] = useState<Record<string, SubSceneProgress | null>>({})
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

  // 从 localStorage 读取各子场景进度（在子场景列表加载完成后）
  useEffect(() => {
    if (subScenes.length === 0) return

    const map: Record<string, SubSceneProgress | null> = {}
    for (const s of subScenes) {
      map[s.id] = loadProgress(s.id)
    }
    setProgressMap(map)
  }, [subScenes])

  // 跳转到指定子场景学习页
  const handleNavigateToSubScene = (subSceneId: string) => {
    router.push(`/scene-learning/${subSceneId}`)
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
                {/* 按顺序学习按钮 */}
                <div className="mb-5">
                  <SequentialStartBtn
                    subScenes={subScenes}
                    progressMap={progressMap}
                    onClick={handleNavigateToSubScene}
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
                      progress={progressMap[subScene.id] ?? null}
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
