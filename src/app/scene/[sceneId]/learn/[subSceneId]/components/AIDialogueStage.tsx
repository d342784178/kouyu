'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateFluencyScore } from '@/lib/scene-learning/scoring'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import AudioInputBar from '@/components/AudioInputBar'
import type { QAPair, DialogueMode } from '@/types'
import type { QAPairResult, QAPairResultStatus } from '@/lib/scene-learning/scoring'

interface AIDialogueStageProps {
  subSceneId: string
  qaPairs: QAPair[]
  onProceed: (
    fluencyScore: number,
    failedQaIds: string[],
    dialogueHistory: { qaId: string; userText: string; passed: boolean }[]
  ) => void
}

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  isHint?: boolean
  isGoalHint?: boolean
}

type RecordingState = 'idle' | 'recording' | 'recognizing' | 'error'

interface RetryPrompt {
  hint: string
  reason?: string
  userMsgId: string
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function TypingIndicator() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B9FF5] flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
        AI
      </div>
      <div className="max-w-[75%]">
        <div className="text-[10px] text-gray-500 mb-1.5">AI 助手</div>
        <div className="bg-[#EEF2FF] rounded-2xl rounded-tl-none px-4 py-3 shadow-md border border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="animate-bounce">
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <span className="text-xs text-[#4F7CF0] ml-1">AI 正在输入...</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAI = message.role === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {isAI ? (
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B9FF5] flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
          AI
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
          我
        </div>
      )}

      <div className="max-w-[75%]">
        <div className={`text-[10px] mb-1.5 ${isAI ? 'text-gray-500' : 'text-right text-gray-500'}`}>
          {isAI ? 'AI 助手' : '我'}
        </div>
        
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
            isAI
              ? message.isGoalHint
                ? 'bg-[#E8F5E9] border border-[#4CAF50]/20 text-[#1B5E20] rounded-tl-none'
                : message.isHint
                ? 'bg-[#FFF8EE] border border-[#F59E0B]/20 text-[#92400E] rounded-tl-none'
                : 'bg-white border border-gray-100 text-[#1F2937] rounded-tl-none'
              : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-tr-none'
          }`}
        >
          {message.isGoalHint && (
            <span className="text-xs text-[#4CAF50] font-medium block mb-1.5">🎯 对话目标</span>
          )}
          {message.isHint && !message.isGoalHint && (
            <span className="text-xs text-[#F59E0B] font-medium block mb-1.5">💡 提示</span>
          )}
          <div className="leading-relaxed">{message.text}</div>
        </div>
      </div>
    </motion.div>
  )
}

interface DialogueSummaryProps {
  fluencyScore: number
  results: QAPairResult[]
  qaPairs: QAPair[]
  onProceed: () => void
}

function DialogueSummary({ fluencyScore, results, qaPairs, onProceed }: DialogueSummaryProps) {
  const statusConfig: Record<QAPairResultStatus, { label: string; color: string }> = {
    fluent: { label: '流畅通过', color: 'text-green-600 bg-green-50' },
    prompted: { label: '提示后通过', color: 'text-amber-600 bg-amber-50' },
    failed: { label: '未通过', color: 'text-red-500 bg-red-50' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 my-4 bg-white rounded-card shadow-card border border-gray-100 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-[#4F7CF0] to-[#7B9FF5] px-5 py-5 text-center">
        <p className="text-white/80 text-sm mb-1">对话完成！流畅度得分</p>
        <div className="text-5xl font-bold text-white mb-1">{fluencyScore}</div>
        <p className="text-white/70 text-xs">/ 100</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">各环节表现</p>
        {results.map((result) => {
          const qa = qaPairs.find((q) => q.id === result.qaId)
          const cfg = statusConfig[result.status]
          return (
            <div key={result.qaId} className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-700 flex-1 truncate">
                {qa?.triggerText ?? result.qaId}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          )
        })}
        {results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">无需说话的环节</p>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          查看详细反馈
        </button>
      </div>
    </motion.div>
  )
}

export default function AIDialogueStage({
  subSceneId,
  qaPairs,
  onProceed,
}: AIDialogueStageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAITyping, setIsAITyping] = useState(false)
  const [currentQaIndex, setCurrentQaIndex] = useState(0)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [isComplete, setIsComplete] = useState(false)
  const [qaResults, setQaResults] = useState<QAPairResult[]>([])
  const userTextMapRef = useRef<Map<string, string>>(new Map())
  const [currentQaHinted, setCurrentQaHinted] = useState(false)
  const [fluencyScore, setFluencyScore] = useState(0)
  const [retryPrompt, setRetryPrompt] = useState<RetryPrompt | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const conversationHistoryRef = useRef<{ role: 'ai' | 'user'; text: string }[]>([])
  const currentQaHintedRef = useRef(false)
  const currentQaIndexRef = useRef(0)
  const isProcessingRef = useRef(false)
  const handleUserSubmitRef = useRef((_: string) => {})

  useEffect(() => {
    currentQaHintedRef.current = currentQaHinted
  }, [currentQaHinted])

  useEffect(() => {
    currentQaIndexRef.current = currentQaIndex
  }, [currentQaIndex])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAITyping, scrollToBottom])

  const addMessage = useCallback((role: 'ai' | 'user', text: string, isHint = false, isGoalHint = false) => {
    const msg: ChatMessage = { id: genId(), role, text, isHint, isGoalHint }
    setMessages((prev) => [...prev, msg])
    conversationHistoryRef.current.push({ role, text })
    return msg
  }, [])

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const callAIDialogue = useCallback(
    async (userMessage: string) => {
      if (isProcessingRef.current) return
      isProcessingRef.current = true
      clearTimeoutTimer()

      try {
        setIsAITyping(true)

        const currentQa = qaPairs[currentQaIndexRef.current]
        const dialogueMode = (currentQa?.dialogueMode as DialogueMode) || 'user_responds'

        const body = {
          userMessage,
          currentQaIndex: currentQaIndexRef.current,
          conversationHistory: conversationHistoryRef.current,
          dialogueMode,
        }

        const res = await fetch(`/api/sub-scenes/${subSceneId}/ai-dialogue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error('API 请求失败')

        const data = await res.json()
        const { pass, nextQaIndex, aiMessage, isComplete: done, hint, reason } = data

        if (pass && currentQa && (currentQa.learnRequirement === 'speak_followup' || currentQa.learnRequirement === 'speak_trigger')) {
          const status: QAPairResultStatus = currentQaHintedRef.current ? 'prompted' : 'fluent'
          userTextMapRef.current.set(currentQa.id, userMessage)
          setQaResults((prev) => {
            const exists = prev.find((r) => r.qaId === currentQa.id)
            if (exists) return prev
            return [...prev, { qaId: currentQa.id, status }]
          })
        }

        if (pass) {
          setCurrentQaHinted(false)
          currentQaHintedRef.current = false
        }

        setIsAITyping(false)

        if (!pass) {
          const hintText = hint || '回答与场景不符，请重新尝试'
          setMessages((prev) => {
            const lastUserMsg = [...prev].reverse().find((m) => m.role === 'user')
            if (lastUserMsg) {
              setRetryPrompt({ hint: hintText, reason, userMsgId: lastUserMsg.id })
            }
            return prev
          })
          return
        }

        if (done) {
          setIsComplete(true)
          setCurrentQaIndex(nextQaIndex)
          currentQaIndexRef.current = nextQaIndex
          return
        }

        setCurrentQaIndex(nextQaIndex)
        currentQaIndexRef.current = nextQaIndex

        const nextQa = qaPairs[nextQaIndex]
        const nextDialogueMode = (nextQa?.dialogueMode as DialogueMode) || 'user_responds'

        if (aiMessage) {
          addMessage('ai', aiMessage)
        }

        if (nextDialogueMode === 'user_asks' && nextQa?.scenarioHint) {
          setTimeout(() => {
            addMessage('ai', nextQa.scenarioHint!, false, true)
          }, 800)
        }
      } catch {
        setIsAITyping(false)
      } finally {
        isProcessingRef.current = false
      }
    },
    [subSceneId, qaPairs, addMessage, clearTimeoutTimer]
  )

  const startTimeoutTimer = useCallback(() => {
    clearTimeoutTimer()
    timeoutRef.current = setTimeout(async () => {
      setCurrentQaHinted(true)
      currentQaHintedRef.current = true

      try {
        setIsAITyping(true)
        const body = {
          userMessage: '__timeout_hint__',
          currentQaIndex: currentQaIndexRef.current,
          conversationHistory: conversationHistoryRef.current,
        }
        const res = await fetch(`/api/sub-scenes/${subSceneId}/ai-dialogue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setIsAITyping(false)

        if (res.ok) {
          const data = await res.json()
          if (data.aiMessage) {
            addMessage('ai', data.aiMessage, true)
          }
        } else {
          addMessage('ai', 'Take your time, what would you say here?', true)
        }
      } catch {
        setIsAITyping(false)
        addMessage('ai', 'Take your time, what would you say here?', true)
      }

      startTimeoutTimer()
    }, 5000)
  }, [subSceneId, addMessage, clearTimeoutTimer])

  const handleUserSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isProcessingRef.current) return

      clearTimeoutTimer()
      addMessage('user', trimmed)
      callAIDialogue(trimmed)
    },
    [addMessage, callAIDialogue, clearTimeoutTimer]
  )

  useEffect(() => { handleUserSubmitRef.current = handleUserSubmit }, [handleUserSubmit])

  const handleVoiceResult = useCallback((transcript: string) => {
    handleUserSubmitRef.current(transcript)
  }, [])

  const handleVoiceError = useCallback((error: string) => {
    console.log('[AIDialogueStage] 语音识别错误:', error)
  }, [])

  const {
    isSupported,
    isRecording,
    isRecognizing,
    interimTranscript,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    audioLevel,
    browserCompatibility,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    lang: 'en-US',
    silenceTimeout: 800,
    enablePronunciationAssessment: false,
  })

  useEffect(() => {
    if (isRecording) {
      setRecordingState('recording')
    } else if (isRecognizing) {
      setRecordingState('recognizing')
    } else {
      setRecordingState('idle')
    }
  }, [isRecording, isRecognizing])

  const getCurrentDialogueMode = useCallback((): DialogueMode => {
    const currentQa = qaPairs[currentQaIndexRef.current]
    return (currentQa?.dialogueMode as DialogueMode) || 'user_responds'
  }, [qaPairs])

  useEffect(() => {
    if (qaPairs.length === 0) return

    const firstQa = qaPairs[0]
    const dialogueMode = (firstQa.dialogueMode as DialogueMode) || 'user_responds'

    const timer = setTimeout(() => {
      if (dialogueMode === 'user_responds') {
        addMessage('ai', firstQa.triggerText)
      } else {
        if (firstQa.scenarioHint) {
          addMessage('ai', firstQa.scenarioHint, false, true)
        }
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      clearTimeoutTimer()
    }
  }, [])

  useEffect(() => {
    if (!isComplete) return

    const mustSpeakQas = qaPairs.filter((q) => q.learnRequirement === 'speak_followup' || q.learnRequirement === 'speak_trigger')
    setQaResults((prev) => {
      const extra = mustSpeakQas
        .filter((q) => !prev.find((r) => r.qaId === q.id))
        .map((q) => ({ qaId: q.id, status: 'failed' as QAPairResultStatus }))
      return extra.length > 0 ? [...prev, ...extra] : prev
    })

    const mustSpeakCount = mustSpeakQas.length
    const score = calculateFluencyScore(qaResults, mustSpeakCount)
    setFluencyScore(score)
  }, [isComplete, qaResults, qaPairs])

  useEffect(() => {
    return () => {
      clearTimeoutTimer()
    }
  }, [clearTimeoutTimer])

  const startRecording = useCallback(async () => {
    if (isProcessingRef.current || isAITyping) return
    clearTimeoutTimer()
    await startVoiceRecording()
  }, [isAITyping, clearTimeoutTimer, startVoiceRecording])

  const stopRecording = useCallback(() => {
    stopVoiceRecording()
  }, [stopVoiceRecording])

  const handleRetryConfirm = useCallback(() => {
    if (!retryPrompt) return
    const { userMsgId } = retryPrompt

    setMessages((prev) => prev.filter((m) => m.id !== userMsgId))

    const history = conversationHistoryRef.current
    const lastUserIdx = [...history].map((h, i) => ({ ...h, i })).reverse().find((h) => h.role === 'user')?.i
    if (lastUserIdx !== undefined) {
      conversationHistoryRef.current = history.filter((_, i) => i !== lastUserIdx)
    }

    setRetryPrompt(null)
  }, [retryPrompt])

  const handleProceed = useCallback(() => {
    const failedQaIds = qaResults
      .filter((r) => r.status === 'failed')
      .map((r) => r.qaId)

    const dialogueHistory = qaResults.map((r) => ({
      qaId: r.qaId,
      userText: userTextMapRef.current.get(r.qaId) ?? '',
      passed: r.status !== 'failed',
    }))

    onProceed(fluencyScore, failedQaIds, dialogueHistory)
  }, [qaResults, fluencyScore, onProceed])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} className="bg-[#F9FAFB] relative">

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#6B7280] text-sm">
            等待对话开始...
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isAITyping && <TypingIndicator />}
            {isComplete && (
              <DialogueSummary
                fluencyScore={fluencyScore}
                results={qaResults}
                qaPairs={qaPairs}
                onProceed={handleProceed}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <AnimatePresence>
        {retryPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 pb-6 px-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-5 pt-5 pb-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2937] mb-1">回答与场景不符</p>
                  {retryPrompt.reason && (
                    <p className="text-sm text-amber-600 font-medium mb-1">{retryPrompt.reason}</p>
                  )}
                  <p className="text-sm text-[#6B7280] leading-relaxed">{retryPrompt.hint}</p>
                </div>
              </div>
              <div className="h-px bg-gray-100 mx-5" />
              <div className="px-5 py-4">
                <button
                  type="button"
                  onClick={handleRetryConfirm}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white text-sm font-semibold shadow-md"
                >
                  好的，重新输入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isComplete && (
        <AudioInputBar
          isRecording={isRecording}
          isRecognizing={isRecognizing}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSendText={handleUserSubmit}
          isGeneratingResponse={isAITyping || isProcessingRef.current}
          interimTranscript={interimTranscript}
          audioLevel={audioLevel}
          className="border-t border-gray-200 bg-white"
        />
      )}
    </div>
  )
}
