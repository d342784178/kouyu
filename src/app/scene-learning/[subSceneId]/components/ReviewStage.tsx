'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getReviewBranch } from '@/lib/scene-learning/scoring'
import { saveProgress } from '@/lib/scene-learning/progress'
import type { QAPair, ReviewHighlight, ReviewRequest, ReviewResponse } from '@/types'

// ============================================================
// Props 接口
// ============================================================

export interface ReviewStageProps {
  subSceneId: string
  /** 所属场景 id，用于完成后跳转 */
  sceneId: string
  /** 所有 QA_Pair 数据 */
  qaPairs: QAPair[]
  /** AI 对话阶段计算出的流畅度得分（0-100） */
  fluencyScore: number
  /** 未通过的 QA_Pair id 列表 */
  failedQaIds: string[]
  /** 本次对话历史（用于回听对比） */
  dialogueHistory: { qaId: string; userText: string; passed: boolean }[]
  /** 完成回调（更新进度后跳转） */
  onComplete: () => void
  /** 定向重练回调（跳回 LearningStage 仅展示未通过项） */
  onRetry: (failedQaIds: string[]) => void
}

// ============================================================
// 子组件：得分环形展示
// ============================================================

interface ScoreRingProps {
  score: number
}

function ScoreRing({ score }: ScoreRingProps) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color = score >= 60 ? '#22C55E' : '#F97316'

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        {/* 背景圆 */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
        />
        {/* 进度圆 */}
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {/* 分数文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-gray-400">分</span>
      </div>
    </div>
  )
}

// ============================================================
// 子组件：回听对比流程（Fluency_Score ≥ 60）
// ============================================================

interface ReplayFlowProps {
  qaPairs: QAPair[]
  dialogueHistory: { qaId: string; userText: string; passed: boolean }[]
  highlights: ReviewHighlight[]
  isLoadingHighlights: boolean
  onComplete: () => void
}

function ReplayFlow({
  qaPairs,
  dialogueHistory,
  highlights,
  isLoadingHighlights,
  onComplete,
}: ReplayFlowProps) {
  const [expandedQaId, setExpandedQaId] = useState<string | null>(null)

  const qaPairMap = new Map(qaPairs.map((qa) => [qa.id, qa]))
  const highlightMap = new Map(highlights.map((h) => [h.qaId, h]))

  return (
    <div className="flex flex-col gap-4 px-4 pb-32">
      {/* 标题 */}
      <div className="pt-4">
        <h2 className="text-base font-semibold text-gray-900">对话回顾</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          点击条目查看更地道的表达建议
        </p>
      </div>

      {/* 对话记录列表 */}
      {dialogueHistory.map((entry) => {
        const qa = qaPairMap.get(entry.qaId)
        const highlight = highlightMap.get(entry.qaId)
        const isExpanded = expandedQaId === entry.qaId
        const hasIssue = !!highlight

        return (
          <motion.div
            key={entry.qaId}
            layout
            className={`bg-white rounded-card shadow-card border overflow-hidden ${
              hasIssue ? 'border-orange-200' : 'border-gray-100'
            }`}
          >
            {/* 卡片头部 */}
            <button
              type="button"
              className="w-full text-left px-4 py-3"
              onClick={() => setExpandedQaId(isExpanded ? null : entry.qaId)}
            >
              <div className="flex items-start gap-3">
                {/* 状态图标 */}
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    entry.passed ? 'bg-green-100' : 'bg-orange-100'
                  }`}
                >
                  {entry.passed ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 对方说的话 */}
                  {qa && (
                    <p className="text-xs text-gray-400 mb-1 truncate">
                      {qa.speakerText}
                    </p>
                  )}
                  {/* 用户说的话 */}
                  <p className="text-sm text-gray-800 font-medium">
                    {entry.userText || <span className="text-gray-300 italic">（未作答）</span>}
                  </p>
                  {/* 有问题时显示标签 */}
                  {hasIssue && (
                    <span className="inline-block mt-1 text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                      有改进建议
                    </span>
                  )}
                </div>

                {/* 展开箭头 */}
                {hasIssue && (
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 mt-1"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </motion.svg>
                )}
              </div>
            </button>

            {/* 展开详情：改进建议 */}
            <AnimatePresence>
              {isExpanded && highlight && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-orange-100 bg-orange-50/30">
                    <div className="pt-3 space-y-2">
                      {/* 问题描述 */}
                      <div>
                        <span className="text-[10px] font-medium text-orange-500 uppercase tracking-wide">
                          问题
                        </span>
                        <p className="text-sm text-gray-700 mt-0.5">{highlight.issue}</p>
                      </div>
                      {/* 更地道的表达 */}
                      <div>
                        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">
                          更地道的说法
                        </span>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {highlight.betterExpression}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {/* LLM 分析加载中提示 */}
      {isLoadingHighlights && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-[#4F7CF0] rounded-full animate-spin" />
          正在分析表达建议…
        </div>
      )}

      {/* 底部完成按钮（fixed） */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-24 pt-3 bg-gradient-to-t from-white via-white/90 to-transparent">
        <button
          type="button"
          onClick={onComplete}
          className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          完成学习
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 子组件：定向重练流程（Fluency_Score < 60）
// ============================================================

interface RetryFlowProps {
  qaPairs: QAPair[]
  failedQaIds: string[]
  onRetry: (failedQaIds: string[]) => void
  onComplete: () => void
}

function RetryFlow({ qaPairs, failedQaIds, onRetry, onComplete }: RetryFlowProps) {
  const failedQaPairs = qaPairs.filter((qa) => failedQaIds.includes(qa.id))

  return (
    <div className="flex flex-col gap-4 px-4 pb-32">
      {/* 标题 */}
      <div className="pt-4">
        <h2 className="text-base font-semibold text-gray-900">需要加强练习</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          以下 {failedQaPairs.length} 个环节需要重点练习
        </p>
      </div>

      {/* 未通过的 QA_Pair 列表 */}
      {failedQaPairs.map((qa, index) => (
        <motion.div
          key={qa.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-card shadow-card border border-orange-100 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            {/* 序号 */}
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-orange-500">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              {/* 对方说的话 */}
              <p className="text-xs text-gray-400 mb-0.5 truncate">{qa.speakerText}</p>
              <p className="text-xs text-gray-300">{qa.speakerTextCn}</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* 底部按钮区（fixed） */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-24 pt-3 bg-gradient-to-t from-white via-white/90 to-transparent space-y-2">
        {/* 重练按钮 */}
        <button
          type="button"
          onClick={() => onRetry(failedQaIds)}
          className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          重练这些环节（{failedQaPairs.length} 个）
        </button>
        {/* 跳过，直接完成 */}
        <button
          type="button"
          onClick={onComplete}
          className="w-full py-3 rounded-card bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          跳过，完成学习
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 主组件：ReviewStage
// ============================================================

export default function ReviewStage({
  subSceneId,
  sceneId,
  qaPairs,
  fluencyScore,
  failedQaIds,
  dialogueHistory,
  onComplete,
  onRetry,
}: ReviewStageProps) {
  const router = useRouter()

  // 判断分支：replay（回听对比）或 retry（定向重练）
  const branch = getReviewBranch(fluencyScore)

  // 回听对比流程的高亮数据
  const [highlights, setHighlights] = useState<ReviewHighlight[]>([])
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false)

  // ---- 进入 replay 分支时，调用 review API 获取高亮分析 ----
  useEffect(() => {
    if (branch !== 'replay') return
    if (dialogueHistory.length === 0) return

    const fetchHighlights = async () => {
      setIsLoadingHighlights(true)
      try {
        const body: ReviewRequest = { fluencyScore, dialogueHistory }
        const res = await fetch(`/api/sub-scenes/${subSceneId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('review API 失败')
        const data: ReviewResponse = await res.json()
        setHighlights(data.highlights)
      } catch (err) {
        // LLM 分析失败时降级：仅展示对话记录，不显示高亮
        console.warn('[ReviewStage] 获取高亮分析失败，降级展示:', err)
        setHighlights([])
      } finally {
        setIsLoadingHighlights(false)
      }
    }

    fetchHighlights()
  }, [branch, subSceneId, fluencyScore, dialogueHistory])

  // ---- 完成：更新 localStorage 进度为 completed，触发回调 ----
  const handleComplete = useCallback(() => {
    saveProgress(subSceneId, {
      status: 'completed',
      currentStage: 4,
      failedQaIds: [],
      lastUpdated: new Date().toISOString(),
    })
    onComplete()
    router.push(`/scene-overview/${sceneId}`)
  }, [subSceneId, sceneId, onComplete, router])

  return (
    <motion.div
      key="review-stage"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
    >
      {/* 得分卡片 */}
      <div className="mx-4 mt-4 bg-white rounded-card shadow-card border border-gray-100 px-4 py-5 flex items-center gap-5">
        <ScoreRing score={fluencyScore} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {branch === 'replay' ? '表现不错！' : '继续加油！'}
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {branch === 'replay'
              ? '你已流畅完成本次对话，查看改进建议让表达更地道。'
              : '本次对话有些环节需要加强，建议重练后再挑战。'}
          </p>
          {/* 分支标签 */}
          <span
            className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              branch === 'replay'
                ? 'bg-green-50 text-green-600'
                : 'bg-orange-50 text-orange-500'
            }`}
          >
            {branch === 'replay' ? '回听对比' : '定向重练'}
          </span>
        </div>
      </div>

      {/* 分支内容 */}
      {branch === 'replay' ? (
        <ReplayFlow
          qaPairs={qaPairs}
          dialogueHistory={dialogueHistory}
          highlights={highlights}
          isLoadingHighlights={isLoadingHighlights}
          onComplete={handleComplete}
        />
      ) : (
        <RetryFlow
          qaPairs={qaPairs}
          failedQaIds={failedQaIds}
          onRetry={onRetry}
          onComplete={handleComplete}
        />
      )}
    </motion.div>
  )
}
