'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { FollowUp, PronunciationAssessmentResult, WordFeedback } from '@/types'

type PracticeState =
  | 'idle'
  | 'recording'
  | 'recognizing'
  | 'assessing'
  | 'success'
  | 'failed'
  | 'completed'
  | 'permission_denied'
  | 'browser_unsupported'
  | 'requesting_permission'

interface SpeakingPracticeProps {
  responses: FollowUp[]
  demoAudioUrl: string
  onCompleted: () => void
  isCompleted?: boolean
}

const MAX_FAIL_COUNT = 2
const PASS_THRESHOLD = 60

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

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const safeScore = isNaN(score) ? 0 : score
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeScore}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{Math.round(safeScore)}</span>
    </div>
  )
}

function PhonemeFeedbackDisplay({ phonemes }: { phonemes: any[] }) {
  if (!phonemes || phonemes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-0.5 mt-1">
      {phonemes.map((phoneme, index) => {
        let bgColor = 'bg-green-50 border-green-200'
        let textColor = 'text-green-700'
        
        if (phoneme.score < 40) {
          bgColor = 'bg-red-50 border-red-200'
          textColor = 'text-red-700'
        } else if (phoneme.score < 60) {
          bgColor = 'bg-orange-50 border-orange-200'
          textColor = 'text-orange-700'
        }

        return (
          <span
            key={index}
            className={`px-1 py-0.5 rounded text-[10px] font-medium border ${bgColor} ${textColor}`}
            title={`音素: ${phoneme.phoneme}, 得分: ${Math.round(phoneme.score)}`}
          >
            {phoneme.phoneme}
          </span>
        )
      })}
    </div>
  )
}

function WordFeedbackDisplay({ words }: { words: WordFeedback[] }) {
  if (!words || words.length === 0) return null
  const [expandedWord, setExpandedWord] = useState<number | null>(null)

  const toggleExpand = (index: number) => {
    setExpandedWord(expandedWord === index ? null : index)
  }

  return (
    <div className="space-y-2 mt-2">
      {/* 横向排列单词 */}
      <div className="flex flex-wrap gap-1">
        {words.map((word, index) => {
          const isError = word.errorType && word.errorType !== 'None'
          const isLowScore = word.accuracyScore < 60
          
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
            <div key={index} className="relative">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium border ${bgColor} ${textColor} cursor-pointer ${isLowScore ? 'hover:opacity-90' : ''}`}
                title={`得分: ${Math.round(word.accuracyScore)}${isError ? ` (${word.errorType})` : ''}`}
                onClick={() => isLowScore && toggleExpand(index)}
              >
                {word.word}
                {isLowScore && (
                  <span className="ml-1 text-xs">
                    {expandedWord === index ? '▼' : '▶'}
                  </span>
                )}
              </span>
              
              {/* 展开显示详细信息 */}
              {isLowScore && expandedWord === index && (
                <div className="absolute z-10 mt-1 p-2 bg-white border border-gray-200 rounded shadow-md min-w-[200px]">
                  <div className="text-xs text-gray-500">
                    得分: {Math.round(word.accuracyScore)} 分
                  </div>
                  {word.errorType && word.errorType !== 'None' && (
                    <div className="text-xs text-red-500 mt-1">
                      错误类型: {word.errorType === 'Mispronunciation' ? '发音错误' : 
                              word.errorType === 'Omission' ? '遗漏' : 
                              word.errorType === 'Insertion' ? '插入' : word.errorType}
                    </div>
                  )}
                  {/* 音素级别反馈 */}
                  {word.phonemeFeedback && word.phonemeFeedback.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-500">音素评分:</div>
                      <PhonemeFeedbackDisplay phonemes={word.phonemeFeedback} />
                    </div>
                  )}
                  {/* 发音反馈信息 */}
                  {word.feedback && (
                    <div className="text-xs text-gray-600 mt-1">
                      反馈: {word.feedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
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
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationAssessmentResult | null>(null)
  const demoAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevStateRef = useRef<PracticeState>(isCompleted ? 'completed' : 'idle')

  // 获取第一个回答作为发音评估的目标文本
  const targetText = responses[0]?.text || ''

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
    },
    []
  )

  const handlePronunciationResult = useCallback((result: PronunciationAssessmentResult) => {
    console.log('[SpeakingPractice] 发音评估结果:', result)
    setPronunciationResult(result)

    const passed = result.pronunciationScore >= PASS_THRESHOLD

    if (passed) {
      setState('success')
      setFeedbackMsg(`发音评分 ${Math.round(result.pronunciationScore)} 分，很好！`)
      setTimeout(() => {
        setState('completed')
        onCompleted()
      }, 1500)
    } else {
      setFailCount((prev) => {
        const newFailCount = prev + 1
        if (newFailCount >= MAX_FAIL_COUNT) {
          setState('completed')
          setFeedbackMsg(`评分 ${Math.round(result.pronunciationScore)} 分，听听示范音频吧`)
          playDemoAudio()
          onCompleted()
        } else {
          setState('failed')
          setFeedbackMsg(`评分 ${Math.round(result.pronunciationScore)} 分，再试一次（还剩 ${MAX_FAIL_COUNT - newFailCount} 次）`)
        }
        return newFailCount
      })
    }
  }, [onCompleted, playDemoAudio])

  const handleError = useCallback((error: string) => {
    if (error.includes('权限被拒绝') || error.includes('权限')) {
      setState('permission_denied')
    } else if (error.includes('不支持') || error.includes('HTTPS')) {
      setState('browser_unsupported')
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
    browserCompatibility,
    permissionStatus,
    checkPermission,
    requestPermission,
    useAzureFallback,
    recordingUrl,
    isPlaying,
    playRecording,
    pauseRecording,
  } = useSpeechRecognition({
    onResult: handleVoiceInput,
    onError: handleError,
    enablePronunciationAssessment: true,
    referenceText: targetText,
    onPronunciationResult: handlePronunciationResult,
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
    } else if (isAssessing) {
      prevStateRef.current = 'assessing'
      setState('assessing')
    } else if (prevStateRef.current === 'recording' || prevStateRef.current === 'recognizing' || prevStateRef.current === 'assessing') {
      prevStateRef.current = 'idle'
      setState('idle')
    }
  }, [isRecording, isRecognizing, isAssessing])

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
      setFeedbackMsg('')
      setRecognizedText('')
      setPronunciationResult(null)
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
    setPronunciationResult(null)
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
    setPronunciationResult(null)
    setState('idle')
    await handleStartRecording()
  }, [handleStartRecording])

  if (state === 'completed') {
    if (pronunciationResult) {
      // 已完成但显示评估结果
      return (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm text-green-600 font-medium">已练习</span>
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
              <ScoreBar label="韵律度" score={pronunciationResult.prosodyScore} color="bg-yellow-400" />
              <ScoreBar label="完整度" score={pronunciationResult.completenessScore} color="bg-purple-400" />
            </div>
            {pronunciationResult.wordFeedback.length > 0 && (
              <WordFeedbackDisplay words={pronunciationResult.wordFeedback} />
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
              disabled={state === 'recognizing' || state === 'assessing' || state === 'requesting_permission' || state === 'browser_unsupported'}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              whileTap={{ scale: 0.92 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0 transition-colors ${
                state === 'recognizing' || state === 'assessing' || state === 'requesting_permission'
                  ? 'bg-gray-200 cursor-not-allowed'
                  : state === 'browser_unsupported'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : state === 'permission_denied'
                  ? 'bg-orange-400 hover:bg-orange-500'
                  : 'bg-[#4F7CF0] hover:bg-[#3D6ADE] active:bg-[#3D6ADE]'
              }`}
              aria-label="开始录音"
            >
              {state === 'recognizing' || state === 'assessing' || state === 'requesting_permission' ? (
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
          {state === 'assessing' && <p className="text-sm text-gray-500">发音评估中…</p>}
          {state === 'requesting_permission' && <p className="text-sm text-[#4F7CF0] font-medium">{feedbackMsg || '正在请求麦克风权限...'}</p>}
          {state === 'success' && <p className="text-sm text-green-600 font-medium">✓ {feedbackMsg}</p>}
          {(state === 'failed' || state === 'browser_unsupported') && <p className="text-sm text-orange-500">{feedbackMsg}</p>}
          {state === 'permission_denied' && <p className="text-sm text-red-500">{feedbackMsg}</p>}
        </div>
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
            <ScoreBar label="自然度" score={pronunciationResult.prosodyScore} color="bg-yellow-400" />
            <ScoreBar label="完整度" score={pronunciationResult.completenessScore} color="bg-purple-400" />
          </div>
          {pronunciationResult.wordFeedback.length > 0 && (
            <WordFeedbackDisplay words={pronunciationResult.wordFeedback} />
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
