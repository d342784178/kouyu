import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudio } from '@/hooks/useAudio'
import SpeakingPracticeEmpty from './SpeakingPracticeEmpty'
import type { QAPair, FollowUp } from '@/types'

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

function QATypeTag({ learnRequirement }: { learnRequirement: string }) {
  if (learnRequirement === 'speak_trigger') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs font-medium">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
        <span className="ml-1">需要会问</span>
      </span>
    )
  }
  if (learnRequirement === 'speak_followup') {
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
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
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
  onTriggerPracticeCompleted?: () => void
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
  onTriggerPracticeCompleted,
  playingUrl,
  isAudioLoading,
  onPlayAudio,
}: QAPairCardProps) {
  const followUps = parseFollowUps(qaPair.followUps)
  const { isExpanded, answerPracticeCompleted } = practiceState
  const dialogueMode = qaPair.dialogueMode
  const learnRequirement = qaPair.learnRequirement

  const isUserResponds = dialogueMode === 'user_responds'
  const isUserAsks = dialogueMode === 'user_asks'
  const needSpeakTrigger = learnRequirement === 'speak_trigger'
  const needSpeakFollowup = learnRequirement === 'speak_followup'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-white rounded-card shadow-card border border-gray-100"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleExpand() }}
        className="w-full text-left p-4 cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 bg-gray-100 text-gray-500">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            {isUserResponds ? (
              <>
                <p className="text-xs text-gray-400 mb-1">对方说：</p>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {qaPair.triggerText}
                  </p>
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
                  {qaPair.triggerTextCn}
                </p>
              </>
            ) : (
              <>
                {qaPair.scenarioHint && (
                  <p className="text-xs text-purple-500 mb-1 font-medium">{qaPair.scenarioHintCn || qaPair.scenarioHint}</p>
                )}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {qaPair.triggerText}
                  </p>
                  {qaPair.audioUrl && (
                    <AudioButton
                      audioUrl={qaPair.audioUrl}
                      label="播放问句"
                      isPlaying={playingUrl === qaPair.audioUrl}
                      isLoading={isAudioLoading && playingUrl === qaPair.audioUrl}
                      onToggle={() => onPlayAudio(qaPair.audioUrl!)}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-snug mb-2">
                  {qaPair.triggerTextCn}
                </p>
              </>
            )}
            <QATypeTag learnRequirement={qaPair.learnRequirement} />
          </div>

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
      </div>

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
              {isUserResponds ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">你可以这样回应</h3>
                  <div className="space-y-3">
                    {followUps.map((followUp, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{followUp.text}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{followUp.text_cn}</p>
                          </div>
                          {followUp.audio_url && (
                            <AudioButton
                              audioUrl={followUp.audio_url}
                              label={`播放回应 ${i + 1}`}
                              isPlaying={playingUrl === followUp.audio_url}
                              isLoading={isAudioLoading && playingUrl === followUp.audio_url}
                              onToggle={() => followUp.audio_url && onPlayAudio(followUp.audio_url)}
                            />
                          )}
                        </div>
                        {needSpeakFollowup && (
                          <div className="mt-3">
                            <SpeakingPracticeEmpty
                              subSceneId={subSceneId}
                              qaId={qaPair.id}
                              answerIndex={i}
                              answerText={followUp.text}
                              answerTextCn={followUp.text_cn}
                              isCompleted={answerPracticeCompleted[i]}
                              onCompleted={() => onAnswerPracticeCompleted(i)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">你应该这样问</h3>
                  <div className="bg-purple-50 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{qaPair.triggerText}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{qaPair.triggerTextCn}</p>
                      </div>
                      {qaPair.audioUrl && (
                        <AudioButton
                          audioUrl={qaPair.audioUrl}
                          label="播放问句"
                          isPlaying={playingUrl === qaPair.audioUrl}
                          isLoading={isAudioLoading && playingUrl === qaPair.audioUrl}
                          onToggle={() => onPlayAudio(qaPair.audioUrl!)}
                        />
                      )}
                    </div>
                    {needSpeakTrigger && onTriggerPracticeCompleted && (
                      <div className="mt-3">
                        <SpeakingPracticeEmpty
                          subSceneId={subSceneId}
                          qaId={qaPair.id}
                          answerIndex={-1}
                          answerText={qaPair.triggerText}
                          answerTextCn={qaPair.triggerTextCn}
                          isCompleted={practiceState.answerPracticeCompleted[-1] || false}
                          onCompleted={onTriggerPracticeCompleted}
                        />
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900 mb-3">可能的回答</h3>
                  <div className="space-y-3">
                    {followUps.map((followUp, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{followUp.text}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{followUp.text_cn}</p>
                          </div>
                          {followUp.audio_url && (
                            <AudioButton
                              audioUrl={followUp.audio_url}
                              label={`播放回答 ${i + 1}`}
                              isPlaying={playingUrl === followUp.audio_url}
                              isLoading={isAudioLoading && playingUrl === followUp.audio_url}
                              onToggle={() => followUp.audio_url && onPlayAudio(followUp.audio_url)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

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
  /** 进入下一阶段回调 */
  onProceed?: () => void
}

/** 安全解析 followUps JSON 字段 */
function parseFollowUps(raw: unknown): FollowUp[] {
  if (Array.isArray(raw)) {
    return raw as FollowUp[]
  }
  return []
}

export default function LearningStage({ qaPairs, subSceneId, failedQaIds = [], onProceed }: LearningStageProps) {
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

  // ---- 触发句开口练习完成（user_asks 模式） ----
  const handleTriggerPracticeCompleted = useCallback((qaId: string) => {
    setPracticeStates((prev) => ({
      ...prev,
      [qaId]: {
        ...prev[qaId],
        answerPracticeCompleted: {
          ...prev[qaId].answerPracticeCompleted,
          [-1]: true,
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
            onTriggerPracticeCompleted={() => handleTriggerPracticeCompleted(qa.id)}
            playingUrl={playingUrl}
            isAudioLoading={isLoading}
            onPlayAudio={handlePlayAudio}
          />
        ))}
      </div>

      {/* 进入练习按钮 */}
      {onProceed && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProceed();
            }}
            className="px-8 py-3 rounded-full bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors flex items-center gap-2 active:scale-95 active:shadow-sm"
          >
            <span>进入练习</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

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
