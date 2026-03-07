'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { PronunciationAssessmentResult, WordFeedback } from '@/types'

type PracticeState =
  | 'idle'
  | 'recording'
  | 'recognizing'
  | 'assessing'
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
const PASS_THRESHOLD = 60

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

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{Math.round(score)}</span>
    </div>
  )
}

function WordFeedbackDisplay({ words, targetText }: { words: WordFeedback[]; targetText: string }) {
  if (!words || words.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {words.map((word, index) => {
        const isCorrect = word.accuracyScore >= 60
        const isError = word.errorType && word.errorType !== 'None'
        
        let bgColor = 'bg-green-50 border-green-200'
        let textColor = 'text-green-700'
        
        if (isError || word.accuracyScore < 40) {
          bgColor = 'bg-red-50 border-red-200'
          textColor = 'text-red-700'
        } else if (word.accuracyScore < 60) {
          bgColor = 'bg-orange-50 border-orange-200'
          textColor = 'text-orange-700'
        }

        return (
          <span
            key={index}
            className={`px-1.5 py-0.5 rounded text-xs font-medium border ${bgColor} ${textColor}`}
            title={`得分: ${Math.round(word.accuracyScore)}${word.errorType !== 'None' ? ` (${word.errorType})` : ''}`}
          >
            {word.word}
          </span>
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
  answerTextCn,
  demoAudioUrl,
  onCompleted,
  isCompleted = false,
}: SpeakingPracticeEmptyProps) {
  const [state, setState] = useState<PracticeState>(isCompleted ? 'completed' : 'idle')
  const [failCount, setFailCount] = useState(0)
  const [recognizedText, setRecognizedText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationAssessmentResult | null>(null)
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

  const handleVoiceInput = useCallback((text: string) => {
    if (!text.trim()) return
    console.log('[SpeakingPracticeEmpty] 处理识别结果:', text)
    setRecognizedText(text)
  }, [])

  const handlePronunciationResult = useCallback((result: PronunciationAssessmentResult) => {
    console.log('[SpeakingPracticeEmpty] 发音评估结果:', result)
    setPronunciationResult(result)

    const passed = result.pronunciationScore >= PASS_THRESHOLD

    if (passed) {
      setState('success')
      setFeedbackMsg(`发音评分 ${Math.round(result.pronunciationScore)} 分，很好！`)
      setTimeout(() => {
        setState('completed')
        onCompleted?.()
      }, 1500)
    } else {
      setFailCount((prev) => {
        const newFailCount = prev + 1
        if (newFailCount >= MAX_FAIL_COUNT) {
          setState('completed')
          setFeedbackMsg(`评分 ${Math.round(result.pronunciationScore)} 分，再听听示范吧`)
          playDemoAudio()
          onCompleted?.()
        } else {
          setState('failed')
          setFeedbackMsg(`评分 ${Math.round(result.pronunciationScore)} 分，再试一次（还剩 ${MAX_FAIL_COUNT - newFailCount} 次）`)
        }
        return newFailCount
      })
    }
  }, [onCompleted, playDemoAudio])

  const handleError = useCallback((error: string) => {
    if (error.includes('权限被拒绝')) {
      setState('permission_denied')
    } else if (error.includes('不支持语音识别')) {
      setState('sdk_error')
    } else {
      // 接口错误或其他错误，设置为 failed 状态以显示错误信息
      setState('failed')
    }
    setFeedbackMsg(error)
  }, [])

  const {
    isSupported,
    isRecording,
    isRecognizing,
    isAssessing,
    interimTranscript,
    startRecording,
    stopRecording,
    error,
    audioLevel,
    recordingUrl,
    isPlaying,
    playRecording,
    pauseRecording,
  } = useSpeechRecognition({
    onResult: handleVoiceInput,
    onError: handleError,
    enablePronunciationAssessment: true,
    referenceText: answerText,
    onPronunciationResult: handlePronunciationResult,
  })

  useEffect(() => {
    if (isRecording) {
      prevStateRef.current = 'recording'
      setState('recording')
    } else if (isRecognizing) {
      prevStateRef.current = 'recognizing'
      setState('recognizing')
    } else if (isAssessing) {
      prevStateRef.current = 'assessing'
      setState('assessing')
    } else if (prevStateRef.current === 'recording' || prevStateRef.current === 'recognizing' || prevStateRef.current === 'assessing') {
      prevStateRef.current = 'idle'
      setState('idle')
    }
  }, [isRecording, isRecognizing, isAssessing])

  const handleStartRecording = useCallback(async () => {
    setFeedbackMsg('')
    setRecognizedText('')
    setPronunciationResult(null)
    await startRecording()
  }, [startRecording])

  const handleRetry = useCallback(async () => {
    setFeedbackMsg('')
    setRecognizedText('')
    setPronunciationResult(null)
    await handleStartRecording()
  }, [handleStartRecording])

  if (isCompleted || state === 'completed') {
    if (pronunciationResult) {
      // 已完成但显示评估结果
      return (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs text-green-600 font-medium">已练习</span>
          </div>
          {/* 发音评估结果展示 */}
          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">发音评估</span>
              <span className={`text-sm font-bold ${
                pronunciationResult.pronunciationScore >= 80 ? 'text-green-600' :
                pronunciationResult.pronunciationScore >= 60 ? 'text-blue-600' :
                pronunciationResult.pronunciationScore >= 40 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {Math.round(pronunciationResult.pronunciationScore)} 分
              </span>
            </div>
            <div className="space-y-1">
              <ScoreBar label="准确度" score={pronunciationResult.accuracyScore} color="bg-blue-400" />
              <ScoreBar label="流畅度" score={pronunciationResult.fluencyScore} color="bg-green-400" />
              <ScoreBar label="完整度" score={pronunciationResult.completenessScore} color="bg-purple-400" />
            </div>
            {pronunciationResult.wordFeedback.length > 0 && (
              <WordFeedbackDisplay words={pronunciationResult.wordFeedback} targetText={answerText} />
            )}
            {/* 录音播放控制 */}
            {recordingUrl && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={isPlaying ? pauseRecording : playRecording}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F9FAFB] border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
                  aria-label={isPlaying ? "暂停录音播放" : "播放录音"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isPlaying ? (
                      <>
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </>
                    ) : (
                      <polygon points="5 3 19 12 5 21 5 3" />
                    )}
                  </svg>
                  <span>{isPlaying ? "暂停" : "播放录音"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }
    // 没有评估结果时显示简单的已练习状态
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
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
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
          ) : state === 'recognizing' || state === 'assessing' ? (
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
              <span>{state === 'assessing' ? '评估中' : '识别中'}</span>
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
      </div>

      {/* 发音评估结果展示 */}
      {pronunciationResult && state !== 'success' && (
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">发音评估</span>
            <span className={`text-sm font-bold ${
              pronunciationResult.pronunciationScore >= 80 ? 'text-green-600' :
              pronunciationResult.pronunciationScore >= 60 ? 'text-blue-600' :
              pronunciationResult.pronunciationScore >= 40 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {Math.round(pronunciationResult.pronunciationScore)} 分
            </span>
          </div>
          <div className="space-y-1">
            <ScoreBar label="准确度" score={pronunciationResult.accuracyScore} color="bg-blue-400" />
            <ScoreBar label="流畅度" score={pronunciationResult.fluencyScore} color="bg-green-400" />
            <ScoreBar label="完整度" score={pronunciationResult.completenessScore} color="bg-purple-400" />
          </div>
          {pronunciationResult.wordFeedback.length > 0 && (
            <WordFeedbackDisplay words={pronunciationResult.wordFeedback} targetText={answerText} />
          )}
          {/* 录音播放控制 */}
          {recordingUrl && (
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={isPlaying ? pauseRecording : playRecording}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F9FAFB] border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
                aria-label={isPlaying ? "暂停录音播放" : "播放录音"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isPlaying ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </>
                  ) : (
                    <polygon points="5 3 19 12 5 21 5 3" />
                  )}
                </svg>
                <span>{isPlaying ? "暂停" : "播放录音"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {(recognizedText || interimTranscript) && state !== 'success' && !pronunciationResult && (
        <div className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">识别结果</p>
          <p className="text-sm text-gray-700">{recognizedText || interimTranscript}</p>
        </div>
      )}

      {(state === 'failed' || state === 'sdk_error' || state === 'permission_denied') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-orange-500">{feedbackMsg}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium hover:bg-[#E0E7FF] transition-colors"
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
