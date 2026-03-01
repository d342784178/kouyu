'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import LearningStage from './components/LearningStage'
import PracticeStage from './components/PracticeStage'
import AIDialogueStage from './components/AIDialogueStage'
import ReviewStage from './components/ReviewStage'
import type { SubSceneDetailResponse } from '@/types'

// ============================================================
// 常量：四阶段配置
// ============================================================

/** 四个学习阶段的元信息 */
const STAGES = [
  { id: 1 as const, label: '逐句学习', shortLabel: '学习' },
  { id: 2 as const, label: '练习题',   shortLabel: '练习' },
  { id: 3 as const, label: 'AI对话',   shortLabel: 'AI对话' },
  { id: 4 as const, label: '对话后处理', shortLabel: '复盘' },
] satisfies { id: 1 | 2 | 3 | 4; label: string; shortLabel: string }[]

// ============================================================
// 子组件：顶部四阶段进度条
// ============================================================

interface StageProgressBarProps {
  /** 当前所处阶段（1-4） */
  currentStage: 1 | 2 | 3 | 4
}

/**
 * 顶部固定的四阶段进度指示条
 * 高度紧凑：4px 进度条 + 阶段文字标注
 */
function StageProgressBar({ currentStage }: StageProgressBarProps) {
  return (
    <div className="w-full bg-white border-b border-gray-100 px-4 pt-3 pb-2">
      {/* 阶段文字标注 */}
      <div className="flex justify-between mb-1.5">
        {STAGES.map((stage) => {
          const isCompleted = stage.id < currentStage
          const isCurrent = stage.id === currentStage

          return (
            <span
              key={stage.id}
              className={`text-[10px] font-medium transition-colors ${
                isCurrent
                  ? 'text-[#4F7CF0]'
                  : isCompleted
                  ? 'text-green-500'
                  : 'text-gray-300'
              }`}
            >
              {stage.shortLabel}
            </span>
          )
        })}
      </div>

      {/* 四段进度条 */}
      <div className="flex gap-1">
        {STAGES.map((stage) => {
          const isCompleted = stage.id < currentStage
          const isCurrent = stage.id === currentStage

          return (
            <div
              key={stage.id}
              className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100"
            >
              <motion.div
                className={`h-full rounded-full ${
                  isCompleted
                    ? 'bg-green-400'
                    : isCurrent
                    ? 'bg-[#4F7CF0]'
                    : 'bg-transparent'
                }`}
                initial={{ width: 0 }}
                animate={{ width: isCompleted || isCurrent ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 子组件：子场景标题头部
// ============================================================

interface SubSceneHeaderProps {
  /** 子场景名称 */
  name: string
  /** 当前子场景在场景中的位置（1-based） */
  currentIndex: number
  /** 该场景下子场景总数 */
  totalSubScenes: number
  /** 所属场景 id（用于返回按钮跳转） */
  sceneId: string
}

/**
 * 子场景标题头部
 * 包含：返回按钮、子场景名称、"子场景 N/M" 位置信息
 */
function SubSceneHeader({ name, currentIndex, totalSubScenes, sceneId }: SubSceneHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/scene-overview/${sceneId}`)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
      {/* 返回按钮 */}
      <button
        type="button"
        onClick={handleBack}
        aria-label="返回子场景列表"
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* 标题区域 */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate leading-tight">
          {name}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          子场景 {currentIndex} / {totalSubScenes}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// 子组件：加载骨架屏
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-4 space-y-4">
      {/* 标题骨架 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-2/3 mb-1.5" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
      {/* 内容卡片骨架 */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-card shadow-card p-4 border border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 子组件：错误页面
// ============================================================

interface ErrorViewProps {
  message: string
  onRetry: () => void
}

function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-base font-semibold text-gray-700 mb-2">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 px-6 py-2.5 rounded-full bg-[#4F7CF0] text-white text-sm font-medium hover:bg-[#3D6ADE] transition-colors"
      >
        重新加载
      </button>
    </motion.div>
  )
}

// ============================================================
// 子组件：阶段占位内容（后续任务替换为真实组件）
// ============================================================

interface StagePlaceholderProps {
  currentStage: 1 | 2 | 3 | 4
  onNextStage: () => void
  /** 定向重练用：未通过的 QA_Pair id 列表 */
  failedQaIds: string[]
}

/**
 * 阶段占位组件
 * 后续任务（8-11）会将此替换为 LearningStage / PracticeStage / AIDialogueStage / ReviewStage
 */
function StagePlaceholder({ currentStage, onNextStage, failedQaIds }: StagePlaceholderProps) {
  const stage = STAGES.find((s) => s.id === currentStage)!

  return (
    <motion.div
      key={currentStage}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* 阶段图标占位 */}
      <div className="w-20 h-20 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-5">
        <span className="text-3xl font-bold text-[#4F7CF0]">{currentStage}</span>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        阶段 {currentStage}：{stage.label}
      </h2>
      <p className="text-sm text-gray-400 mb-6 max-w-[240px] leading-relaxed">
        该阶段组件正在开发中，将在后续任务中实现
      </p>

      {/* 仅在非最后阶段显示"进入下一阶段"按钮（方便调试） */}
      {currentStage < 4 && (
        <button
          type="button"
          onClick={onNextStage}
          className="px-6 py-3 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          进入下一阶段（调试用）
        </button>
      )}

      {/* 定向重练时展示未通过的 QA_Pair 数量 */}
      {failedQaIds.length > 0 && currentStage === 1 && (
        <p className="mt-4 text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
          定向重练：{failedQaIds.length} 个问答对待练习
        </p>
      )}
    </motion.div>
  )
}

// ============================================================
// 主页面组件：SceneLearningPage
// ============================================================

export default function SceneLearningPage({
  params,
}: {
  params: { subSceneId: string }
}) {
  const { subSceneId } = params

  // ---- 数据状态 ----
  const [data, setData] = useState<SubSceneDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- 四阶段状态机 ----
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4>(1)

  // ---- 定向重练：未通过的 QA_Pair id 列表 ----
  const [failedQaIds, setFailedQaIds] = useState<string[]>([])

  // ---- AI 对话阶段结果 ----
  const [fluencyScore, setFluencyScore] = useState<number>(0)

  // ---- AI 对话历史（传给 ReviewStage） ----
  const [dialogueHistory, setDialogueHistory] = useState<
    { qaId: string; userText: string; passed: boolean }[]
  >([])

  // ---- 获取子场景详情 ----
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/sub-scenes/${subSceneId}`)

      if (!res.ok) {
        if (res.status === 404) {
          setError('子场景不存在')
        } else {
          setError('加载失败，请重试')
        }
        return
      }

      const json: SubSceneDetailResponse = await res.json()
      setData(json)
    } catch {
      setError('网络错误，请检查连接后重试')
    } finally {
      setIsLoading(false)
    }
  }, [subSceneId])

  // ---- 初始化：加载数据 ----
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- 进入下一阶段 ----
  const handleNextStage = useCallback(() => {
    if (currentStage < 4) {
      setCurrentStage((currentStage + 1) as 1 | 2 | 3 | 4)
    }
  }, [currentStage])

  // ---- 渲染 ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex flex-col">
      <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-screen">

        {/* 加载状态：骨架屏 */}
        {isLoading && (
          <>
            {/* 进度条骨架 */}
            <div className="w-full bg-white border-b border-gray-100 px-4 pt-3 pb-2 animate-pulse">
              <div className="flex justify-between mb-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded w-8" />
                ))}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-gray-200" />
                ))}
              </div>
            </div>
            <LoadingSkeleton />
          </>
        )}

        {/* 错误状态 */}
        {!isLoading && error && (
          <ErrorView message={error} onRetry={fetchData} />
        )}

        {/* 正常内容 */}
        {!isLoading && !error && data && (
          <>
            {/* 顶部四阶段进度条（固定在顶部） */}
            <StageProgressBar currentStage={currentStage} />

            {/* 子场景标题头部 */}
            <SubSceneHeader
              name={data.subScene.name}
              currentIndex={data.currentIndex}
              totalSubScenes={data.totalSubScenes}
              sceneId={data.subScene.sceneId}
            />

            {/* 阶段内容区域 */}
            <div className={`flex-1 flex flex-col min-h-0 ${currentStage === 3 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <AnimatePresence mode="wait">
                {currentStage === 1 ? (
                  /* 第一阶段：逐句学习 */
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <LearningStage
                      qaPairs={data.qaPairs}
                      failedQaIds={failedQaIds}
                      onProceed={handleNextStage}
                    />
                  </motion.div>
                ) : currentStage === 2 ? (
                  /* 第二阶段：练习题 */
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 flex flex-col"
                  >
                    <PracticeStage
                      subSceneId={subSceneId}
                      onProceed={handleNextStage}
                    />
                  </motion.div>
                ) : currentStage === 3 ? (
                  /* 第三阶段：AI模拟对话 */
                  <motion.div
                    key="stage-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                  >
                    <AIDialogueStage
                      subSceneId={subSceneId}
                      qaPairs={data.qaPairs}
                      onProceed={(score, ids, history) => {
                        setFluencyScore(score)
                        setFailedQaIds(ids)
                        if (history) setDialogueHistory(history)
                        setCurrentStage(4)
                      }}
                    />
                  </motion.div>
                ) : (
                  /* 第四阶段：对话后处理 */
                  <ReviewStage
                    key="stage-4"
                    subSceneId={subSceneId}
                    sceneId={data.subScene.sceneId}
                    qaPairs={data.qaPairs}
                    fluencyScore={fluencyScore}
                    failedQaIds={failedQaIds}
                    dialogueHistory={dialogueHistory}
                    onComplete={() => {/* router.push 在 ReviewStage 内部处理 */}}
                    onRetry={(ids) => {
                      setFailedQaIds(ids)
                      setCurrentStage(1)
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
