'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'

// ============================================================
// 类型定义
// ============================================================

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
  /** 子场景ID */
  subSceneId: string
  /** QA Pair ID */
  qaId: string
  /** 答案索引 */
  answerIndex: number
  /** 答案文本（英文） */
  answerText: string
  /** 答案翻译（中文） */
  answerTextCn: string
  /** 示范音频URL */
  demoAudioUrl?: string
  /** 完成回调 */
  onCompleted?: () => void
  /** 是否已完成 */
  isCompleted?: boolean
}

const MAX_FAIL_COUNT = 2

// ============================================================
// 子组件：录音波形动画
// ============================================================

function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-0.5 rounded-full bg-white"
          animate={{ height: ['5px', '16px', '5px'] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ============================================================
// 主组件：开口练习（带语音识别）
// ============================================================

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
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  const hasRecognitionResultRef = useRef<boolean>(false)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const demoAudioRef = useRef<HTMLAudioElement | null>(null)
  const handleVoiceInputRef = useRef<(text: string) => void>(() => {})

  // 外部 isCompleted 变化时同步状态
  useEffect(() => {
    if (isCompleted && state !== 'completed') {
      setState('completed')
    }
  }, [isCompleted, state])

  // 播放示范音频
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

  // 提交后端评估
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

  // 处理语音识别结果
  const handleVoiceInput = useCallback(
    (text: string) => {
      if (!text.trim()) return
      console.log('[SpeakingPracticeEmpty] 处理识别结果:', text)
      submitToBackend(text.trim())
    },
    [submitToBackend]
  )

  // 保持 ref 与最新函数同步
  useEffect(() => {
    handleVoiceInputRef.current = handleVoiceInput
  }, [handleVoiceInput])

  // 初始化语音识别
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return

    const SpeechRecognition = (window as any).webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    const clearSilenceTimeout = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    }

    const setSilenceTimeout = () => {
      clearSilenceTimeout()
      silenceTimeoutRef.current = setTimeout(() => {
        console.log('[SpeakingPracticeEmpty] 800ms 停顿，自动停止')
        const transcript = finalTranscriptRef.current || interimTranscriptRef.current
        if (transcript.trim()) {
          hasRecognitionResultRef.current = true
          handleVoiceInputRef.current(transcript.trim())
        }
        try { rec.stop() } catch (_) {}
      }, 800)
    }

    rec.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += t
        } else {
          interimTranscript += t
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript
        console.log('[SpeakingPracticeEmpty] 最终识别:', finalTranscriptRef.current)
      }
      if (interimTranscript) {
        interimTranscriptRef.current = interimTranscript
        console.log('[SpeakingPracticeEmpty] 临时识别:', interimTranscript)
      }

      setSilenceTimeout()

      if (finalTranscript) {
        hasRecognitionResultRef.current = true
      }
    }

    rec.onerror = (event: any) => {
      console.error('[SpeakingPracticeEmpty] 识别错误:', event.error)
      clearSilenceTimeout()

      switch (event.error) {
        case 'not-allowed':
          setState('permission_denied')
          setFeedbackMsg('麦克风权限被拒绝')
          break
        case 'audio-capture':
          setState('sdk_error')
          setFeedbackMsg('无法访问麦克风')
          break
        case 'network':
          setState('sdk_error')
          setFeedbackMsg('网络错误')
          break
        case 'no-speech':
          setState('idle')
          setFeedbackMsg('未检测到语音')
          break
        case 'aborted':
          break
        default:
          setState('idle')
          setFeedbackMsg('语音识别失败')
      }

      hasRecognitionResultRef.current = false
      setIsRecording(false)
    }

    rec.onend = () => {
      console.log('[SpeakingPracticeEmpty] onend, hasResult:', hasRecognitionResultRef.current)
      clearSilenceTimeout()

      if (!hasRecognitionResultRef.current) {
        setState('idle')
        setFeedbackMsg('未检测到语音，请重试')
      }

      hasRecognitionResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(false)

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
    }

    setRecognition(rec)

    return () => {
      try { rec.stop() } catch (_) {}
      clearSilenceTimeout()
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current)
    }
  }, [])

  // 开始录音
  const startRecording = useCallback(async () => {
    if (!recognition || isRecording || state === 'recognizing') return

    try {
      hasRecognitionResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(true)
      setState('recording')
      setFeedbackMsg('')
      setRecognizedText('')

      await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[SpeakingPracticeEmpty] 麦克风权限已获取，启动识别')

      recognition.start()

      recordingTimeoutRef.current = setTimeout(() => {
        console.log('[SpeakingPracticeEmpty] 30s 超时，自动停止')
        const transcript = finalTranscriptRef.current || interimTranscriptRef.current
        if (transcript.trim()) {
          hasRecognitionResultRef.current = true
          handleVoiceInputRef.current(transcript.trim())
        }
        try { recognition.stop() } catch (_) {}
      }, 30000)
    } catch (err: any) {
      console.error('[SpeakingPracticeEmpty] 启动录音失败:', err)
      setIsRecording(false)
      if (err?.name === 'NotAllowedError') {
        setState('permission_denied')
        setFeedbackMsg('麦克风权限被拒绝')
      } else if (err?.name === 'NotFoundError') {
        setState('sdk_error')
        setFeedbackMsg('未找到麦克风设备')
      } else {
        setState('sdk_error')
        setFeedbackMsg('无法访问麦克风')
      }
    }
  }, [recognition, isRecording, state])

  // 停止录音
  const stopRecording = useCallback(() => {
    if (!recognition) return

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    const transcript = finalTranscriptRef.current || interimTranscriptRef.current
    if (transcript.trim()) {
      hasRecognitionResultRef.current = true
      handleVoiceInputRef.current(transcript.trim())
    }

    try { recognition.stop() } catch (_) {}
  }, [recognition])

  // 跳过
  const handleSkip = useCallback(() => {
    setState('completed')
    onCompleted?.()
  }, [onCompleted])

  // 重试
  const handleRetry = useCallback(() => {
    setState('idle')
    setFeedbackMsg('')
    setRecognizedText('')
  }, [])

  // 已完成状态
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
            <WaveformAnimation />
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
            onClick={startRecording}
            disabled={!recognition}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !recognition
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

      {/* 失败/错误状态提示 */}
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

      {/* 识别结果（始终显示，除了成功状态） */}
      {recognizedText && state !== 'success' && (
        <span className="text-xs text-gray-500 truncate max-w-[120px]">{recognizedText}</span>
      )}
    </div>
  )
}
