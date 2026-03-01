'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import type { QAResponse } from '@/types'

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

interface SpeakingPracticeProps {
  responses: QAResponse[]
  demoAudioUrl: string
  onCompleted: () => void
  isCompleted?: boolean
}

const MAX_FAIL_COUNT = 2

// ============================================================
// 工具函数：语义匹配
// ============================================================

function isSemanticMatch(userText: string, responses: QAResponse[]): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

  const userNorm = normalize(userText)
  if (!userNorm) return false

  for (const resp of responses) {
    const respNorm = normalize(resp.text)
    if (userNorm === respNorm) return true
    const respWords = respNorm.split(/\s+/).filter(Boolean)
    const matchCount = respWords.filter((w) => userNorm.includes(w)).length
    if (respWords.length > 0 && matchCount / respWords.length >= 0.6) return true
  }
  return false
}

// ============================================================
// 子组件：录音波形动画
// ============================================================

function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-6" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white"
          animate={{ height: ['6px', '20px', '6px'] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ============================================================
// 主组件
// ============================================================

export default function SpeakingPractice({
  responses,
  demoAudioUrl,
  onCompleted,
  isCompleted = false,
}: SpeakingPracticeProps) {
  const [state, setState] = useState<PracticeState>(isCompleted ? 'completed' : 'idle')
  const [failCount, setFailCount] = useState(0)
  const [recognizedText, setRecognizedText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  // 与 OpenTestDialog 一致：recognition 存在 state 里，只初始化一次
  const [recognition, setRecognition] = useState<any>(null)

  // refs 用于在回调闭包中访问最新值
  const hasRecognitionResultRef = useRef<boolean>(false)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const demoAudioRef = useRef<HTMLAudioElement | null>(null)

  // 用 ref 传递最新的 handleVoiceInput，避免 recognition 回调中的闭包问题
  const handleVoiceInputRef = useRef<(text: string) => void>(() => {})

  // 外部 isCompleted 变化时同步状态
  useEffect(() => {
    if (isCompleted && state !== 'completed') {
      setState('completed')
    }
  }, [isCompleted, state])

  // ---- 播放示范音频 ----
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

  // ---- 处理识别结果（通过 ref 传递，避免闭包问题）----
  const handleVoiceInput = useCallback(
    (text: string) => {
      if (!text.trim()) return
      console.log('[SpeakingPractice] 处理识别结果:', text)
      setRecognizedText(text)
      const matched = isSemanticMatch(text, responses)

      if (matched) {
        setState('success')
        setFeedbackMsg('很好！继续下一个')
        setTimeout(() => {
          setState('completed')
          onCompleted()
        }, 1200)
      } else {
        // 用函数式更新获取最新 failCount，避免闭包陷阱
        setFailCount((prev) => {
          const newFailCount = prev + 1
          if (newFailCount >= MAX_FAIL_COUNT) {
            setState('completed')
            setFeedbackMsg('没关系，听听示范音频吧')
            playDemoAudio()
            onCompleted()
          } else {
            setState('failed')
            setFeedbackMsg(`没有匹配，再试一次（还剩 ${MAX_FAIL_COUNT - newFailCount} 次）`)
          }
          return newFailCount
        })
      }
    },
    [responses, onCompleted, playDemoAudio]
  )

  // 保持 ref 与最新函数同步
  useEffect(() => {
    handleVoiceInputRef.current = handleVoiceInput
  }, [handleVoiceInput])

  // ---- 初始化语音识别（只执行一次，与 OpenTestDialog 完全一致）----
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
        console.log('[SpeakingPractice] 800ms 停顿，自动停止')
        const transcript = finalTranscriptRef.current || interimTranscriptRef.current
        if (transcript.trim()) {
          hasRecognitionResultRef.current = true
          // 通过 ref 调用，避免闭包问题
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
        console.log('[SpeakingPractice] 最终识别:', finalTranscriptRef.current)
      }
      if (interimTranscript) {
        interimTranscriptRef.current = interimTranscript
        console.log('[SpeakingPractice] 临时识别:', interimTranscript)
      }

      setSilenceTimeout()

      if (finalTranscript) {
        hasRecognitionResultRef.current = true
      }
    }

    rec.onerror = (event: any) => {
      console.error('[SpeakingPractice] 识别错误:', event.error)
      clearSilenceTimeout()

      switch (event.error) {
        case 'not-allowed':
          setState('permission_denied')
          setFeedbackMsg('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
          break
        case 'audio-capture':
          setState('sdk_error')
          setFeedbackMsg('无法访问麦克风，请检查设备')
          break
        case 'network':
          setState('sdk_error')
          setFeedbackMsg('网络错误，语音识别服务不可用')
          break
        case 'no-speech':
          setState('idle')
          setFeedbackMsg('未检测到语音，请重试')
          break
        case 'aborted':
          // 主动停止，不处理
          break
        default:
          setState('idle')
          setFeedbackMsg('语音识别失败，请重试')
      }

      hasRecognitionResultRef.current = false
      setIsRecording(false)
    }

    rec.onend = () => {
      console.log('[SpeakingPractice] onend, hasResult:', hasRecognitionResultRef.current)
      clearSilenceTimeout()

      if (!hasRecognitionResultRef.current) {
        setState('idle')
        setFeedbackMsg('未检测到语音，请重试')
      }

      // 重置
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
  // 空依赖数组：只初始化一次，与 OpenTestDialog 完全一致
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 开始录音 ----
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

      // 先请求麦克风权限（与 OpenTestDialog 保持一致，不提前释放 stream）
      await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[SpeakingPractice] 麦克风权限已获取，启动识别')

      recognition.start()

      recordingTimeoutRef.current = setTimeout(() => {
        console.log('[SpeakingPractice] 30s 超时，自动停止')
        const transcript = finalTranscriptRef.current || interimTranscriptRef.current
        if (transcript.trim()) {
          hasRecognitionResultRef.current = true
          handleVoiceInputRef.current(transcript.trim())
        }
        try { recognition.stop() } catch (_) {}
      }, 30000)
    } catch (err: any) {
      console.error('[SpeakingPractice] 启动录音失败:', err)
      setIsRecording(false)
      if (err?.name === 'NotAllowedError') {
        setState('permission_denied')
        setFeedbackMsg('麦克风权限被拒绝')
      } else if (err?.name === 'NotFoundError') {
        setState('sdk_error')
        setFeedbackMsg('未找到麦克风设备')
      } else {
        setState('sdk_error')
        setFeedbackMsg('无法访问麦克风，请检查设备')
      }
    }
  }, [recognition, isRecording, state])

  // ---- 停止录音 ----
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

    // 与 OpenTestDialog 一致：有结果就先处理，再停止
    const transcript = finalTranscriptRef.current || interimTranscriptRef.current
    if (transcript.trim()) {
      hasRecognitionResultRef.current = true
      handleVoiceInputRef.current(transcript.trim())
    }

    try { recognition.stop() } catch (_) {}
  }, [recognition])

  // ---- 跳过 ----
  const handleSkip = useCallback(() => {
    setState('completed')
    onCompleted()
  }, [onCompleted])

  // ---- 重试 ----
  const handleRetry = useCallback(() => {
    setState('idle')
    setFeedbackMsg('')
    setRecognizedText('')
  }, [])

  // ---- 已完成状态 ----
  if (state === 'completed') {
    return (
      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-sm text-green-600 font-medium">已练习</span>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {state === 'recording' ? (
            <motion.button
              key="stop"
              type="button"
              onClick={stopRecording}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-md shrink-0"
              aria-label="停止录音"
            >
              <WaveformAnimation />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              type="button"
              onClick={startRecording}
              disabled={state === 'recognizing' || !recognition}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              whileTap={{ scale: 0.92 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0 transition-colors ${
                state === 'recognizing' || !recognition
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-[#4F7CF0] hover:bg-[#3D6ADE] active:bg-[#3D6ADE]'
              }`}
              aria-label="开始录音"
            >
              {state === 'recognizing' ? (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex-1 min-w-0">
          {state === 'idle' && <p className="text-sm text-gray-500">{feedbackMsg || '点击麦克风开始说话'}</p>}
          {state === 'recording' && <p className="text-sm text-[#4F7CF0] font-medium">正在录音，说完后点击停止</p>}
          {state === 'recognizing' && <p className="text-sm text-gray-500">识别中…</p>}
          {state === 'success' && <p className="text-sm text-green-600 font-medium">✓ {feedbackMsg}</p>}
          {(state === 'failed' || state === 'sdk_error') && <p className="text-sm text-orange-500">{feedbackMsg}</p>}
          {state === 'permission_denied' && <p className="text-sm text-red-500">{feedbackMsg}</p>}
        </div>
      </div>

      {recognizedText && state !== 'success' && (
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">识别结果</p>
          <p className="text-sm text-gray-700">{recognizedText}</p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(state === 'failed' || state === 'sdk_error') && (
          <button type="button" onClick={handleRetry} className="text-xs px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium">
            重试
          </button>
        )}
        {(state === 'permission_denied' || state === 'sdk_error' || state === 'failed') && (
          <button type="button" onClick={handleSkip} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium">
            跳过开口练习
          </button>
        )}
        {state === 'permission_denied' && (
          <p className="w-full text-xs text-gray-400 mt-1">
            前往浏览器设置 → 网站权限 → 麦克风，允许本网站访问
          </p>
        )}
      </div>
    </div>
  )
}
