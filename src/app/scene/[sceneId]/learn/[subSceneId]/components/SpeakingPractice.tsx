'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { QAResponse } from '@/types'

type PracticeState =
  | 'idle'
  | 'recording'
  | 'recognizing'
  | 'success'
  | 'failed'
  | 'completed'
  | 'permission_denied'
  | 'browser_unsupported'
  | 'requesting_permission'

interface SpeakingPracticeProps {
  responses: QAResponse[]
  demoAudioUrl: string
  onCompleted: () => void
  isCompleted?: boolean
}

const MAX_FAIL_COUNT = 2

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

function WaveformAnimation({ audioLevel = 0 }: { audioLevel?: number }) {
  const threshold = 2
  const normalizedLevel = audioLevel > threshold ? Math.min((audioLevel - threshold) / 30, 1) : 0
  
  return (
    <div className="flex items-center gap-0.5 h-6" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const baseHeight = 6
        const maxHeight = 24
        const barLevel = normalizedLevel * (1 - Math.abs(i - 2) * 0.15)
        const targetHeight = baseHeight + (maxHeight - baseHeight) * barLevel
        
        return (
          <div
            key={i}
            className="w-1 rounded-full bg-white transition-all duration-100"
            style={{ height: targetHeight }}
          />
        )
      })}
    </div>
  )
}

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

  const handleError = useCallback((error: string) => {
    if (error.includes('权限被拒绝') || error.includes('权限')) {
      setState('permission_denied')
    } else if (error.includes('不支持') || error.includes('HTTPS')) {
      setState('browser_unsupported')
    } else {
      setState('idle')
    }
    setFeedbackMsg(error)
  }, [])

  const {
    isSupported,
    isRecording,
    isRecognizing,
    interimTranscript,
    startRecording,
    stopRecording,
    error,
    audioLevel,
    browserCompatibility,
    permissionStatus,
    checkPermission,
    requestPermission,
    useAzureFallback,
  } = useSpeechRecognition({
    onResult: handleVoiceInput,
    onError: handleError,
  })

  const activeError = useAzureFallback ? error : error
  const activeAudioLevel = useAzureFallback ? audioLevel : audioLevel
  const activeStartRecording = useAzureFallback ? startRecording : startRecording
  const activeStopRecording = useAzureFallback ? stopRecording : stopRecording

  useEffect(() => {
    if (isRecording) {
      prevStateRef.current = 'recording'
      setState('recording')
    } else if (isRecognizing) {
      prevStateRef.current = 'recognizing'
      setState('recognizing')
    } else if (prevStateRef.current === 'recording' || prevStateRef.current === 'recognizing') {
      prevStateRef.current = 'idle'
      setState('idle')
    }
  }, [isRecording, isRecognizing])

  useEffect(() => {
    if (!browserCompatibility.isSupported && browserCompatibility.unsupportedReason) {
      setState('browser_unsupported')
      setFeedbackMsg(browserCompatibility.unsupportedReason)
    } else if (permissionStatus.state === 'denied') {
      setState('permission_denied')
      setFeedbackMsg('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
    }
  }, [browserCompatibility, permissionStatus])

  const handleStartRecording = useCallback(async () => {
    console.log('[SpeakingPractice] handleStartRecording 被调用，state:', state, 'browserCompatibility:', browserCompatibility, 'useAzureFallback:', useAzureFallback)
    
    if (useAzureFallback) {
      await activeStartRecording()
      return
    }
    
    if (!browserCompatibility.isSupported) {
      setState('browser_unsupported')
      setFeedbackMsg(browserCompatibility.unsupportedReason || '浏览器不支持语音识别')
      return
    }

    if (permissionStatus.state === 'denied') {
      setState('permission_denied')
      setFeedbackMsg('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
      return
    }

    if (state === 'recording' || state === 'requesting_permission') {
      console.log('[SpeakingPractice] 当前状态不允许启动录音:', state)
      return
    }

    setFeedbackMsg('')
    setRecognizedText('')
    setState('idle')
    
    try {
      await activeStartRecording()
    } catch (err) {
      console.error('[SpeakingPractice] startRecording 异常:', err)
      setState('idle')
    }
  }, [browserCompatibility, permissionStatus, state, startRecording])

  const handleRetry = useCallback(async () => {
    setFeedbackMsg('')
    setRecognizedText('')
    setState('idle')
    await handleStartRecording()
  }, [handleStartRecording])

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
              <WaveformAnimation audioLevel={audioLevel} />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              type="button"
              onClick={handleStartRecording}
              disabled={state === 'recognizing' || state === 'requesting_permission' || state === 'browser_unsupported'}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              whileTap={{ scale: 0.92 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0 transition-colors ${
                state === 'recognizing' || state === 'requesting_permission'
                  ? 'bg-gray-200 cursor-not-allowed'
                  : state === 'browser_unsupported'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : state === 'permission_denied'
                  ? 'bg-orange-400 hover:bg-orange-500'
                  : 'bg-[#4F7CF0] hover:bg-[#3D6ADE] active:bg-[#3D6ADE]'
              }`}
              aria-label="开始录音"
            >
              {state === 'recognizing' || state === 'requesting_permission' ? (
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
          {state === 'requesting_permission' && <p className="text-sm text-[#4F7CF0] font-medium">{feedbackMsg || '正在请求麦克风权限...'}</p>}
          {state === 'success' && <p className="text-sm text-green-600 font-medium">✓ {feedbackMsg}</p>}
          {(state === 'failed' || state === 'browser_unsupported') && <p className="text-sm text-orange-500">{feedbackMsg}</p>}
          {state === 'permission_denied' && <p className="text-sm text-red-500">{feedbackMsg}</p>}
        </div>
      </div>

      {(recognizedText || interimTranscript) && state !== 'success' && (
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">识别结果</p>
          <p className="text-sm text-gray-700">{recognizedText || interimTranscript}</p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(state === 'failed' || state === 'browser_unsupported') && (
          <button type="button" onClick={handleRetry} className="text-xs px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium">
            重试
          </button>
        )}
        {state === 'permission_denied' && (
          <p className="w-full text-xs text-gray-400 mt-1">
            前往浏览器设置 → 网站权限 → 麦克风，允许本网站访问
          </p>
        )}
        {state === 'browser_unsupported' && browserCompatibility.unsupportedReason && (
          <p className="w-full text-xs text-gray-400 mt-1">
            建议使用 Chrome、Edge 或 Safari 浏览器获得最佳体验
          </p>
        )}
      </div>
    </div>
  )
}
