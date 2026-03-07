'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

type PracticeState =
  | 'idle'
  | 'recording'
  | 'recognizing'
  | 'success'
  | 'failed'
  | 'completed'
  | 'permission_denied'
  | 'sdk_error'

interface SpeakingPracticeEmptyProps {
  subSceneId: string
  qaId: string
  answerIndex: number
  answerText: string
  answerTextCn: string
  demoAudioUrl?: string
  onCompleted?: () => void
  isCompleted?: boolean
}

const MAX_FAIL_COUNT = 2

function WaveformAnimation({ audioLevel = 0 }: { audioLevel?: number }) {
  const threshold = 5
  const normalizedLevel = audioLevel > threshold ? Math.min((audioLevel - threshold) / 45, 1) : 0
  
  return (
    <div className="flex items-center gap-0.5 h-5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const baseHeight = 5
        const maxHeight = 16
        const barLevel = normalizedLevel * (1 - Math.abs(i - 2) * 0.15)
        const targetHeight = baseHeight + (maxHeight - baseHeight) * barLevel
        
        return (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white transition-all duration-100"
            style={{ height: targetHeight }}
          />
        )
      })}
    </div>
  )
}

export default function SpeakingPracticeEmpty({
  subSceneId,
  qaId,
  answerIndex,
  answerText,
  demoAudioUrl,
  onCompleted,
  isCompleted = false,
}: SpeakingPracticeEmptyProps) {
  const [state, setState] = useState<PracticeState>(isCompleted ? 'completed' : 'idle')
  const [failCount, setFailCount] = useState(0)
  const [recognizedText, setRecognizedText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const demoAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevStateRef = useRef<PracticeState>(isCompleted ? 'completed' : 'idle')

  useEffect(() => {
    if (isCompleted && prevStateRef.current !== 'completed') {
      prevStateRef.current = 'completed'
      setState('completed')
    }
  }, [isCompleted])

  const playDemoAudio = useCallback(() => {
    if (!demoAudioUrl) return
    const url = getAudioUrl(demoAudioUrl)
    if (!url) return
    if (!demoAudioRef.current) {
      demoAudioRef.current = new Audio(url)
    } else {
      demoAudioRef.current.src = url
    }
    demoAudioRef.current.play().catch(() => {})
  }, [demoAudioUrl])

  const submitToBackend = useCallback(
    async (userText: string) => {
      setState('recognizing')
      setRecognizedText(userText)

      try {
        const res = await fetch(`/api/sub-scenes/${subSceneId}/speaking-practice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userText,
            targetText: answerText,
            answerIndex,
            qaId,
          }),
        })

        if (!res.ok) {
          throw new Error('请求失败')
        }

        const data = await res.json()

        if (data.passed) {
          setState('success')
          setFeedbackMsg(data.feedback || '很好！')
          setTimeout(() => {
            setState('completed')
            onCompleted?.()
          }, 1200)
        } else {
          setFailCount((prev) => {
            const newFailCount = prev + 1
            if (newFailCount >= MAX_FAIL_COUNT) {
              setState('completed')
              setFeedbackMsg('没关系，听听示范音频吧')
              playDemoAudio()
              onCompleted?.()
            } else {
              setState('failed')
              setFeedbackMsg(data.feedback || `再试一次（还剩 ${MAX_FAIL_COUNT - newFailCount} 次）`)
            }
            return newFailCount
          })
        }
      } catch (error) {
        console.error('[SpeakingPracticeEmpty] 提交失败:', error)
        setState('failed')
        setFeedbackMsg('评估失败，请重试')
      }
    },
    [subSceneId, answerText, answerIndex, qaId, onCompleted, playDemoAudio]
  )

  const handleVoiceInput = useCallback(
    (text: string) => {
      if (!text.trim()) return
      console.log('[SpeakingPracticeEmpty] 处理识别结果:', text)
      submitToBackend(text.trim())
    },
    [submitToBackend]
  )

  const handleError = useCallback((error: string) => {
    if (error.includes('权限被拒绝')) {
      setState('permission_denied')
    } else if (error.includes('不支持语音识别')) {
      setState('sdk_error')
    } else {
      setState('idle')
    }
    setFeedbackMsg(error)
  }, [])

  const {
    isSupported,
    isRecording,
    interimTranscript,
    startRecording,
    stopRecording,
    error,
    audioLevel,
  } = useSpeechRecognition({
    onResult: handleVoiceInput,
    onError: handleError,
  })

  useEffect(() => {
    if (isRecording) {
      prevStateRef.current = 'recording'
      setState('recording')
    } else if (prevStateRef.current === 'recording') {
      prevStateRef.current = 'idle'
      setState('idle')
    }
  }, [isRecording])

  const handleStartRecording = useCallback(async () => {
    setFeedbackMsg('')
    setRecognizedText('')
    await startRecording()
  }, [startRecording])

  const handleSkip = useCallback(() => {
    setState('completed')
    onCompleted?.()
  }, [onCompleted])

  const handleRetry = useCallback(() => {
    setState('idle')
    setFeedbackMsg('')
    setRecognizedText('')
  }, [])

  if (isCompleted || state === 'completed') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs text-green-600 font-medium">已练习</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <AnimatePresence mode="wait">
        {state === 'recording' ? (
          <motion.button
            key="stop"
            type="button"
            onClick={stopRecording}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium"
            aria-label="停止录音"
          >
            <WaveformAnimation audioLevel={audioLevel} />
            <span>停止</span>
          </motion.button>
        ) : state === 'recognizing' ? (
          <motion.button
            key="recognizing"
            type="button"
            disabled
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-200 text-gray-500 text-xs font-medium cursor-wait"
          >
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>识别中</span>
          </motion.button>
        ) : state === 'success' ? (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-600 text-xs font-medium"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{feedbackMsg}</span>
          </motion.div>
        ) : (
          <motion.button
            key="practice"
            type="button"
            onClick={handleStartRecording}
            disabled={!isSupported}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !isSupported
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#EEF2FF] text-[#4F7CF0] hover:bg-[#E0E7FF]'
            }`}
            aria-label="开始开口练习"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>开口练习</span>
          </motion.button>
        )}
      </AnimatePresence>

      {(state === 'failed' || state === 'sdk_error' || state === 'permission_denied') && (
        <>
          <span className="text-xs text-orange-500">{feedbackMsg}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs px-2 py-1 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium hover:bg-[#E0E7FF]"
          >
            重试
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium hover:bg-gray-200"
          >
            跳过
          </button>
        </>
      )}

      {(recognizedText || interimTranscript) && state !== 'success' && (
        <span className="text-xs text-gray-500 truncate max-w-[120px]">{recognizedText || interimTranscript}</span>
      )}
    </div>
  )
}
