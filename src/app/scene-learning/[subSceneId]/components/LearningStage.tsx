import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudio } from '@/hooks/useAudio'
import SpeakingPracticeEmpty from './SpeakingPracticeEmpty'
import type { QAPair, QAResponse } from '@/types'

// ============================================================
// 类型定义
// ============================================================

interface QAPairPracticeState {
  isExpanded: boolean
  answerPracticeCompleted: Record<number, boolean>
}

// ============================================================
// 子组件：QA 类型标签
// ============================================================

function QATypeTag({ qaType }: { qaType: string }) {
  if (qaType === 'must_speak') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="16 11 12 15 8 11" />
        </svg>
        <span className="ml-1">需要会说</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      <span className="ml-1">听懂就好</span>
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
// 子组件：通知
// ============================================================

interface NotificationProps {
  message: string
  type: 'error' | 'success' | 'info'
  onClose: () => void
}

function Notification({ message, type, onClose }: NotificationProps) {
  const bgColor = type === 'error' ? 'bg-red-50' : type === 'success' ? 'bg-green-50' : 'bg-blue-50'
  const textColor = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-blue-600'
  const borderColor = type === 'error' ? 'border-red-200' : type === 'success' ? 'border-green-200' : 'border-blue-200'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 ${bgColor} ${textColor} ${borderColor} border rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg z-50 max-w-xs`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {type === 'error' && (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </>
        )}
        {type === 'success' && (
          <>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </>
        )}
        {type === 'info' && (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        )}
      </svg>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-gray-600"
        aria-label="关闭通知"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  )
}

// ============================================================
// 子组件：单个 QA_Pair 卡片
// ============================================================

interface QAPairCardProps {
  qaPair: QAPair
  index: number
  subSceneId: string
  practiceState: QAPairPracticeState
  onToggleExpand: () => void
  onAnswerPracticeCompleted: (answerIndex: number) => void
  /** 当前正在播放的音频 URL（用于同步播放状态） */
  playingUrl: string | null
  isAudioLoading: boolean
  onPlayAudio: (url: string) => void
}

function QAPairCard({
  qaPair,
  index,
  subSceneId,
  practiceState,
  onToggleExpand,
  onAnswerPracticeCompleted,
  playingUrl,
  isAudioLoading,
  onPlayAudio,
}: QAPairCardProps) {
  const responses = parseResponses(qaPair.responses)
  const { isExpanded, answerPracticeCompleted } = practiceState
  const isMustSpeak = qaPair.qaType === 'must_speak'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-white rounded-card shadow-card border border-gray-100"
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
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 bg-gray-100 text-gray-500">
            {index + 1}
          </div>

          {/* 文本内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                {qaPair.speakerText}
              </p>
              {/* 音频播放按钮 */}
              {qaPair.audioUrl && (
                <AudioButton
                  audioUrl={qaPair.audioUrl}
                  label="播放对方说的话"
                  isPlaying={playingUrl === qaPair.audioUrl}
                  isLoading={isAudioLoading && playingUrl === qaPair.audioUrl}
                  onToggle={() => onPlayAudio(qaPair.audioUrl!)}
                />
              )}
            </div>
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
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4"
          >
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">你可以这样回应</h3>

              <div className="space-y-3">
                {responses.map((resp, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{resp.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{resp.text_cn}</p>
                      </div>
                      {/* 回应音频按钮 */}
                      {resp.audio_url && (
                        <AudioButton
                          audioUrl={resp.audio_url}
                          label={`播放回应 ${i + 1}`}
                          isPlaying={playingUrl === resp.audio_url}
                          isLoading={isAudioLoading && playingUrl === resp.audio_url}
                          onToggle={() => resp.audio_url && onPlayAudio(resp.audio_url)}
                        />
                      )}
                    </div>
                    {/* 开口练习 - 放在每个回答下方 */}
                    {isMustSpeak && (
                      <div className="mt-3">
                        <SpeakingPracticeEmpty
                          subSceneId={subSceneId}
                          qaId={qaPair.id}
                          answerIndex={i}
                          answerText={resp.text}
                          answerTextCn={resp.text_cn}
                          isCompleted={answerPracticeCompleted[i]}
                          onCompleted={() => onAnswerPracticeCompleted(i)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 学习提示 */}
              {qaPair.usageNote && (
                <div className="mt-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F7CF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-blue-600 font-medium">{qaPair.usageNote}</p>
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
// 主组件
// ============================================================

interface LearningStageProps {
  qaPairs: QAPair[]
  subSceneId: string
  /** 定向重练的问答对 ID 列表（可选） */
  failedQaIds?: string[]
}

/** 安全解析 responses JSON 字段 */
function parseResponses(raw: unknown): QAResponse[] {
  if (Array.isArray(raw)) {
    // 检查数组中的对象是否包含必要的字段
    return raw.map(item => {
      if (typeof item === 'object' && item !== null) {
        return {
          text: (item as any).text || (item as any).english || (item as any).answer || '',
          text_cn: (item as any).text_cn || (item as any).chinese || (item as any).answer_cn || '',
          audio_url: (item as any).audio_url || (item as any).audio || ''
        }
      }
      return { text: '', text_cn: '', audio_url: '' }
    })
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              text: (item as any).text || (item as any).english || (item as any).answer || '',
              text_cn: (item as any).text_cn || (item as any).chinese || (item as any).answer_cn || '',
              audio_url: (item as any).audio_url || (item as any).audio || ''
            }
          }
          return { text: '', text_cn: '', audio_url: '' }
        })
      }
    } catch {
      return []
    }
  }
  return []
}

export default function LearningStage({ qaPairs, subSceneId, failedQaIds = [] }: LearningStageProps) {
  // 按 order 字段排序（如果没有 order 则按索引）
  const sortedPairs = [...qaPairs].sort((a, b) => (a.order || 0) - (b.order || 0))

  // 定向重练：过滤只显示失败的问答对
  const filteredPairs = failedQaIds.length > 0
    ? sortedPairs.filter((qa) => failedQaIds.includes(qa.id))
    : sortedPairs

  // 练习状态（展开/收起、开口练习完成状态）
  const [practiceStates, setPracticeStates] = useState<Record<string, QAPairPracticeState>>(() => {
    const init: Record<string, QAPairPracticeState> = {}
    for (const qa of sortedPairs) {
      init[qa.id] = { isExpanded: false, answerPracticeCompleted: {} }
    }
    return init
  })

  // 音频播放（全局单例，同时只播放一个）
  const { play, pause, isPlaying, isLoading, error: audioError, audioRef, clearError } = useAudio()
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const wasPlayingRef = useRef(false)
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // 当 qaPairs 变化时（如定向重练切换），重置状态
  const prevPairsRef = useRef(sortedPairs)
  useEffect(() => {
    const prevIds = prevPairsRef.current.map((p) => p.id).join(',')
    const currIds = sortedPairs.map((p) => p.id).join(',')
    if (prevIds !== currIds) {
      const init: Record<string, QAPairPracticeState> = {}
      for (const qa of sortedPairs) {
        init[qa.id] = { isExpanded: false, answerPracticeCompleted: {} }
      }
      setPracticeStates(init)
      prevPairsRef.current = sortedPairs
    }
  })

  // 音频播放结束时清除 playingUrl（仅在从播放变为停止时）
  useEffect(() => {
    if (isPlaying) {
      wasPlayingRef.current = true
    } else if (wasPlayingRef.current && playingUrl) {
      // 只有之前在播放，现在停止了，才清除
      setPlayingUrl(null)
      wasPlayingRef.current = false
    }
  }, [isPlaying, playingUrl])

  // 处理音频错误，显示通知
  useEffect(() => {
    if (audioError) {
      setNotification({ message: audioError, type: 'error' })
      // 3秒后自动关闭
      const timer = setTimeout(() => {
        setNotification(null)
        clearError()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [audioError, clearError])

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

  // ---- 答案开口练习完成 ----
  const handleAnswerPracticeCompleted = useCallback((qaId: string, answerIndex: number) => {
    setPracticeStates((prev) => ({
      ...prev,
      [qaId]: {
        ...prev[qaId],
        answerPracticeCompleted: {
          ...prev[qaId].answerPracticeCompleted,
          [answerIndex]: true,
        },
      },
    }))
  }, [])

  // ---- 播放音频 ----
  const handlePlayAudio = useCallback(
    (url: string) => {
      if (playingUrl === url && isPlaying) {
        pause()
        setPlayingUrl(null)
      } else {
        // 播放新音频前清除之前的错误
        if (audioError) {
          clearError()
        }
        play(url)
        setPlayingUrl(url)
      }
    },
    [playingUrl, isPlaying, play, pause, audioError, clearError]
  )

  // ---- 空状态 ----
  if (filteredPairs.length === 0) {
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
        {filteredPairs.map((qa, index) => (
          <QAPairCard
            key={qa.id}
            qaPair={qa}
            index={index}
            subSceneId={subSceneId}
            practiceState={practiceStates[qa.id] ?? { isExpanded: false, answerPracticeCompleted: {} }}
            onToggleExpand={() => handleToggleExpand(qa.id)}
            onAnswerPracticeCompleted={(answerIndex) => handleAnswerPracticeCompleted(qa.id, answerIndex)}
            playingUrl={playingUrl}
            isAudioLoading={isLoading}
            onPlayAudio={handlePlayAudio}
          />
        ))}
      </div>

      {/* 隐藏的 audio 元素（useAudio hook 需要） */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" />

      {/* 通知 */}
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
