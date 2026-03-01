'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudio } from '@/hooks/useAudio'
import SpeakingPractice from './SpeakingPractice'
import type { QAPair, QAResponse } from '@/types'

// ============================================================
// 类型定义
// ============================================================

interface LearningStageProps {
  /** 该子场景下所有问答对 */
  qaPairs: QAPair[]
  /** 定向重练模式：仅展示这些 id 的问答对（空数组 = 展示全部） */
  failedQaIds?: string[]
  /** 进入下一阶段（练习题）的回调 */
  onProceed: () => void
}

/** 单个问答对的练习状态 */
interface QAPairPracticeState {
  /** 是否已展开 */
  isExpanded: boolean
  /** must_speak 类型是否已完成开口练习 */
  speakingCompleted: boolean
}

// ============================================================
// 工具函数
// ============================================================

/** 安全解析 responses JSON 字段 */
function parseResponses(raw: unknown): QAResponse[] {
  if (Array.isArray(raw)) return raw as QAResponse[]
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as QAResponse[]
    } catch {
      return []
    }
  }
  return []
}

// ============================================================
// 子组件：QA 类型标签
// ============================================================

function QATypeTag({ qaType }: { qaType: string }) {
  const isMustSpeak = qaType === 'must_speak'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        isMustSpeak
          ? 'bg-[#EEF2FF] text-[#4F7CF0]'
          : 'bg-gray-100 text-gray-400'
      }`}
    >
      {isMustSpeak ? (
        <>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          需要会说
        </>
      ) : (
        <>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          听懂就好
        </>
      )}
    </span>
  )
}

// ============================================================
// 子组件：音频播放按钮
// ============================================================

interface AudioButtonProps {
  audioUrl: string | null | undefined
  label?: string
  /** 当前是否正在播放此音频 */
  isPlaying: boolean
  isLoading: boolean
  onToggle: () => void
}

function AudioButton({ audioUrl, label, isPlaying, isLoading, onToggle }: AudioButtonProps) {
  if (!audioUrl) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label ?? '播放音频'}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
        isPlaying
          ? 'bg-[#4F7CF0] text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-[#EEF2FF] hover:text-[#4F7CF0]'
      }`}
    >
      {isLoading ? (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : isPlaying ? (
        // 暂停图标
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        // 播放图标
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
    </button>
  )
}

// ============================================================
// 子组件：单个 QA_Pair 卡片
// ============================================================

interface QAPairCardProps {
  qaPair: QAPair
  index: number
  practiceState: QAPairPracticeState
  onToggleExpand: () => void
  onSpeakingCompleted: () => void
  /** 当前正在播放的音频 URL（用于同步播放状态） */
  playingUrl: string | null
  isAudioLoading: boolean
  onPlayAudio: (url: string) => void
}

function QAPairCard({
  qaPair,
  index,
  practiceState,
  onToggleExpand,
  onSpeakingCompleted,
  playingUrl,
  isAudioLoading,
  onPlayAudio,
}: QAPairCardProps) {
  const responses = parseResponses(qaPair.responses)
  const { isExpanded, speakingCompleted } = practiceState
  const isMustSpeak = qaPair.qaType === 'must_speak'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={`bg-white rounded-card shadow-card border transition-colors ${
        speakingCompleted && isMustSpeak
          ? 'border-green-100'
          : 'border-gray-100'
      }`}
    >
      {/* 折叠头部（点击展开/收起） */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-left p-4"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-3">
          {/* 序号 */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
              speakingCompleted && isMustSpeak
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {speakingCompleted && isMustSpeak ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              index + 1
            )}
          </div>

          {/* 文本内容 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">
              {qaPair.speakerText}
            </p>
            <p className="text-xs text-gray-400 leading-snug mb-2">
              {qaPair.speakerTextCn}
            </p>
            <QATypeTag qaType={qaPair.qaType} />
          </div>

          {/* 展开/收起箭头 */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 mt-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* 展开内容 */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">

              {/* speaker_text 音频播放按钮 */}
              {qaPair.audioUrl && (
                <div className="flex items-center gap-2">
                  <AudioButton
                    audioUrl={qaPair.audioUrl}
                    label="播放对方说的话"
                    isPlaying={playingUrl === qaPair.audioUrl}
                    isLoading={isAudioLoading && playingUrl === qaPair.audioUrl}
                    onToggle={() => onPlayAudio(qaPair.audioUrl!)}
                  />
                  <span className="text-xs text-gray-400">听对方说的话</span>
                </div>
              )}

              {/* 回应表达列表 */}
              {responses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    你可以这样回应
                  </p>
                  {responses.map((resp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-[#F8FAFF] border border-[#E8EEFF]"
                    >
                      {/* 回应音频按钮 */}
                      <AudioButton
                        audioUrl={resp.audio_url}
                        label={`播放回应 ${i + 1}`}
                        isPlaying={playingUrl === resp.audio_url}
                        isLoading={isAudioLoading && playingUrl === resp.audio_url}
                        onToggle={() => resp.audio_url && onPlayAudio(resp.audio_url)}
                      />
                      {/* 回应文本 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{resp.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{resp.text_cn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 使用说明 */}
              {qaPair.usageNote && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-amber-700 leading-relaxed">{qaPair.usageNote}</p>
                </div>
              )}

              {/* 开口练习（must_speak 类型） */}
              {isMustSpeak && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">开口练习</p>
                  <SpeakingPractice
                    responses={responses}
                    demoAudioUrl={responses[0]?.audio_url ?? ''}
                    onCompleted={onSpeakingCompleted}
                    isCompleted={speakingCompleted}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================
// 主组件：LearningStage
// ============================================================

export default function LearningStage({
  qaPairs,
  failedQaIds = [],
  onProceed,
}: LearningStageProps) {
  // 定向重练模式：仅展示 failedQaIds 中的问答对
  const displayPairs = failedQaIds.length > 0
    ? qaPairs.filter((qa) => failedQaIds.includes(qa.id))
    : qaPairs

  // 按 order 排序
  const sortedPairs = [...displayPairs].sort((a, b) => a.order - b.order)

  // 每个问答对的练习状态
  const [practiceStates, setPracticeStates] = useState<Record<string, QAPairPracticeState>>(() => {
    const init: Record<string, QAPairPracticeState> = {}
    for (const qa of sortedPairs) {
      init[qa.id] = { isExpanded: false, speakingCompleted: false }
    }
    return init
  })

  // 音频播放（全局单例，同时只播放一个）
  const { play, pause, isPlaying, isLoading, audioRef } = useAudio()
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)

  // 当 qaPairs 变化时（如定向重练切换），重置状态
  const prevPairsRef = useRef(sortedPairs)
  useEffect(() => {
    const prevIds = prevPairsRef.current.map((p) => p.id).join(',')
    const currIds = sortedPairs.map((p) => p.id).join(',')
    if (prevIds !== currIds) {
      const init: Record<string, QAPairPracticeState> = {}
      for (const qa of sortedPairs) {
        init[qa.id] = { isExpanded: false, speakingCompleted: false }
      }
      setPracticeStates(init)
      prevPairsRef.current = sortedPairs
    }
  })

  // ---- 展开/收起卡片（手风琴：展开一个时收起其他） ----
  const handleToggleExpand = useCallback((qaId: string) => {
    setPracticeStates((prev) => {
      const isCurrentlyExpanded = prev[qaId]?.isExpanded
      // 收起所有，再切换当前
      const next: Record<string, QAPairPracticeState> = {}
      for (const id of Object.keys(prev)) {
        next[id] = { ...prev[id], isExpanded: id === qaId ? !isCurrentlyExpanded : false }
      }
      return next
    })
  }, [])

  // ---- 开口练习完成 ----
  const handleSpeakingCompleted = useCallback((qaId: string) => {
    setPracticeStates((prev) => ({
      ...prev,
      [qaId]: { ...prev[qaId], speakingCompleted: true },
    }))
  }, [])

  // ---- 播放音频 ----
  const handlePlayAudio = useCallback(
    (url: string) => {
      if (playingUrl === url && isPlaying) {
        pause()
        setPlayingUrl(null)
      } else {
        play(url)
        setPlayingUrl(url)
      }
    },
    [playingUrl, isPlaying, play, pause]
  )

  // 音频播放结束时清除 playingUrl
  useEffect(() => {
    if (!isPlaying && playingUrl) {
      setPlayingUrl(null)
    }
  }, [isPlaying, playingUrl])

  // ---- 计算是否所有 must_speak 都已完成 ----
  const mustSpeakPairs = sortedPairs.filter((qa) => qa.qaType === 'must_speak')
  const allMustSpeakCompleted =
    mustSpeakPairs.length === 0 ||
    mustSpeakPairs.every((qa) => practiceStates[qa.id]?.speakingCompleted)

  // ---- 空状态 ----
  if (sortedPairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="text-gray-400 text-sm">暂无问答对内容</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-32">
      {/* 定向重练提示 */}
      {failedQaIds.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <p className="text-xs text-orange-600 font-medium">
            定向重练：仅展示 {failedQaIds.length} 个未通过的问答对
          </p>
        </div>
      )}

      {/* QA_Pair 卡片列表 */}
      <div className="space-y-3">
        {sortedPairs.map((qa, index) => (
          <QAPairCard
            key={qa.id}
            qaPair={qa}
            index={index}
            practiceState={practiceStates[qa.id] ?? { isExpanded: false, speakingCompleted: false }}
            onToggleExpand={() => handleToggleExpand(qa.id)}
            onSpeakingCompleted={() => handleSpeakingCompleted(qa.id)}
            playingUrl={playingUrl}
            isAudioLoading={isLoading}
            onPlayAudio={handlePlayAudio}
          />
        ))}
      </div>

      {/* 隐藏的 audio 元素（useAudio hook 需要） */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" />

      {/* 底部固定：进入练习题按钮（始终显示） */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-24 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-[430px] mx-auto">
          <button
            type="button"
            onClick={onProceed}
            className="w-full py-4 rounded-card font-semibold text-base text-white shadow-md transition-all active:shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #4F7CF0, #6366F1)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {failedQaIds.length > 0 ? '重练完成，进入AI对话' : '进入练习题'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
