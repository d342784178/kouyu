'use client'

/**
 * PracticeStage - 第二阶段：练习题
 * 包含三种题型子组件：ChoiceQuestion、FillBlankQuestion、SpeakingQuestion
 * 每题一屏，顶部进度条，完成后展示"开始AI对话"按钮
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAudioUrl } from '@/lib/audioUrl'
import { validateFillBlankAnswer } from '@/lib/scene-learning/progress'
import type { PracticeQuestion, ChoiceOption } from '@/types'

// ============================================================
// 组件 Props 定义
// ============================================================

interface PracticeStageProps {
  subSceneId: string
  /** 进入下一阶段（AI对话）的回调 */
  onProceed: () => void
}

// ============================================================
// 工具函数
// ============================================================

/** 播放音频（支持 COS:/ 协议） */
function playAudio(audioUrl: string) {
  const url = getAudioUrl(audioUrl)
  if (!url) return
  const audio = new Audio(url)
  audio.play().catch(() => {/* 静默失败 */})
}

/** 忽略大小写和首尾空格比较答案 */
function compareAnswer(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
}

// ============================================================
// 子组件：录音波形动画（复用 SpeakingPractice 的样式）
// ============================================================

function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-6" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-[#4F7CF0]"
          animate={{ height: ['6px', '20px', '6px'] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ============================================================
// 子组件：选择题 ChoiceQuestion
// ============================================================

interface ChoiceQuestionProps {
  question: Extract<PracticeQuestion, { type: 'choice' }>
  onNext: () => void
}

function ChoiceQuestion({ question, onNext }: ChoiceQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const audioPlayedRef = useRef(false)

  // 进入题目时自动播放音频
  useEffect(() => {
    if (!audioPlayedRef.current && question.audioUrl) {
      audioPlayedRef.current = true
      // 延迟 300ms 等待动画完成后播放
      const timer = setTimeout(() => playAudio(question.audioUrl), 300)
      return () => clearTimeout(timer)
    }
  }, [question.audioUrl])

  const handleSelect = (option: ChoiceOption) => {
    if (hasAnswered) return
    setSelected(option.id)
    setHasAnswered(true)
  }

  /** 获取选项的样式状态 */
  const getOptionStyle = (option: ChoiceOption) => {
    if (!hasAnswered) {
      return 'bg-white border-gray-200 text-gray-800 hover:border-[#4F7CF0] hover:bg-[#F0F4FF] active:scale-[0.98]'
    }
    if (option.isCorrect) {
      return 'bg-green-50 border-green-400 text-green-800'
    }
    if (option.id === selected && !option.isCorrect) {
      return 'bg-red-50 border-red-400 text-red-800'
    }
    return 'bg-white border-gray-100 text-gray-400'
  }

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-6">
      {/* 题目说明 */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 mb-1">听音频，选择正确的回应方式</p>
        {/* 播放音频按钮 */}
        <button
          type="button"
          onClick={() => playAudio(question.audioUrl)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-card bg-[#EEF2FF] border border-[#C7D4FA] text-[#4F7CF0] text-sm font-medium hover:bg-[#E0E8FF] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          再次播放音频
        </button>
      </div>

      {/* 选项列表 */}
      <div className="flex flex-col gap-3 flex-1">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelect(option)}
            disabled={hasAnswered}
            className={`w-full text-left px-4 py-3.5 rounded-card border-2 text-sm font-medium transition-all duration-200 ${getOptionStyle(option)}`}
          >
            <div className="flex items-center gap-3">
              {/* 答题后显示对错图标 */}
              {hasAnswered && option.isCorrect && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
              {hasAnswered && option.id === selected && !option.isCorrect && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-red-400 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              )}
              <span>{option.text}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 答题后显示"下一题"按钮 */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="mt-5"
          >
            <button
              type="button"
              onClick={onNext}
              className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
            >
              下一题
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// 子组件：填空题 FillBlankQuestion
// ============================================================

interface FillBlankQuestionProps {
  question: Extract<PracticeQuestion, { type: 'fill_blank' }>
  onNext: () => void
}

function FillBlankQuestion({ question, onNext }: FillBlankQuestionProps) {
  // 每个空格对应一个输入值
  const [answers, setAnswers] = useState<string[]>(
    question.blanks.map(() => '')
  )
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  /** 将模板按 ___ 分割，渲染含输入框的句子 */
  const renderTemplate = () => {
    const parts = question.template.split('___')
    return parts.map((part, i) => (
      <span key={i} className="inline">
        <span className="text-gray-800">{part}</span>
        {i < question.blanks.length && (
          <span className="inline-flex items-center mx-1">
            <input
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              value={answers[i]}
              onChange={(e) => {
                if (hasSubmitted) return
                const next = [...answers]
                next[i] = e.target.value
                setAnswers(next)
                setErrorMsg('')
              }}
              disabled={hasSubmitted}
              placeholder="___"
              className={`
                inline-block w-24 border-b-2 bg-transparent text-center text-sm font-medium outline-none px-1 py-0.5 transition-colors
                ${hasSubmitted
                  ? results[i]
                    ? 'border-green-400 text-green-700'
                    : 'border-red-400 text-red-700'
                  : 'border-[#4F7CF0] text-gray-900 focus:border-[#3D6ADE]'
                }
              `}
            />
            {/* 答题后显示正确答案（答错时） */}
            {hasSubmitted && !results[i] && (
              <span className="ml-1 text-xs text-green-600 font-medium">
                ({question.blanks[i].answer})
              </span>
            )}
          </span>
        )}
      </span>
    ))
  }

  const handleSubmit = () => {
    // 空白答案拦截
    const hasEmpty = answers.some((a) => !validateFillBlankAnswer(a))
    if (hasEmpty) {
      setErrorMsg('请填写所有空格后再提交')
      return
    }

    // 前端对比答案（忽略大小写和首尾空格）
    const newResults = question.blanks.map((blank, i) =>
      compareAnswer(answers[i], blank.answer)
    )
    setResults(newResults)
    setHasSubmitted(true)
  }

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-6">
      {/* 题目说明 */}
      <p className="text-xs text-gray-400 mb-4">补全对话，填写空格中的内容</p>

      {/* 含输入框的句子模板 */}
      <div className="bg-white rounded-card shadow-card border border-gray-100 p-4 mb-4 text-base leading-loose">
        {renderTemplate()}
      </div>

      {/* 错误提示 */}
      <AnimatePresence>
        {errorMsg && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-500 mb-3"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 答题结果反馈 */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-card px-4 py-3 mb-4 text-sm font-medium ${
              results.every(Boolean)
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-orange-50 text-orange-700 border border-orange-200'
            }`}
          >
            {results.every(Boolean)
              ? '✓ 全部正确！'
              : `${results.filter(Boolean).length} / ${results.length} 个正确，红色部分已显示参考答案`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部固定操作区（键盘弹出时随键盘上移） */}
      <div className="mt-auto">
        {!hasSubmitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
          >
            提交答案
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
          >
            下一题
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 子组件：问答题 SpeakingQuestion
// ============================================================

/** Web Speech API 识别状态 */
type SpeakingState = 'idle' | 'recording' | 'recognizing' | 'done' | 'error' | 'unsupported' | 'evaluating' | 'evaluated'

interface SpeakingQuestionProps {
  question: Extract<PracticeQuestion, { type: 'speaking' }>
  onNext: () => void
}

function SpeakingQuestion({ question, onNext }: SpeakingQuestionProps) {
  const [state, setState] = useState<SpeakingState>('idle')
  const [recognizedText, setRecognizedText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [evaluationResult, setEvaluationResult] = useState<{
    isCorrect: boolean
    feedback: string
  } | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // 检查 Web Speech API 支持
  useEffect(() => {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition
    if (!SR) setState('unsupported')
  }, [])

  // 点击麦克风：idle → 开始录音；recording → 停止录音
  const handleMicClick = useCallback(() => {
    if (state === 'recording') {
      // 停止录音
      recognitionRef.current?.stop()
      return
    }

    if (state === 'done' || state === 'recognizing') return

    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition

    if (!SR) {
      setState('unsupported')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setState('recording')
      setErrorMsg('')
    }
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setRecognizedText(text)
      setState('done')
    }
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setErrorMsg('未检测到语音，请重试')
      } else if (event.error === 'not-allowed') {
        setErrorMsg('麦克风权限被拒绝，请在浏览器设置中开启')
      } else {
        setErrorMsg(`识别失败：${event.error}`)
      }
      setState('error')
    }
    recognition.onend = () => {
      // 如果还在 recording 状态说明没有结果，回到 idle
      setState((prev) => prev === 'recording' ? 'idle' : prev)
    }

    try {
      recognition.start()
    } catch (err) {
      setErrorMsg('启动录音失败，请重试')
      setState('error')
    }
  }, [state])

  // 重新录制
  const handleRetry = useCallback(() => {
    setRecognizedText('')
    setEvaluationResult(null)
    setErrorMsg('')
    setState('idle')
  }, [])

  // 提交答案进行AI评测
  const handleSubmit = useCallback(async () => {
    if (!recognizedText.trim()) {
      setErrorMsg('请先录音')
      return
    }

    setState('evaluating')
    setErrorMsg('')

    try {
      const res = await fetch('/api/sub-scenes/evaluate-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: recognizedText,
          expectedAnswer: question.expectedAnswer || question.speakerText,
          context: {
            speakerText: question.speakerText,
            speakerTextCn: question.speakerTextCn,
          },
        }),
      })

      if (!res.ok) {
        throw new Error('评测失败')
      }

      const result: { isCorrect: boolean; feedback: string } = await res.json()
      setEvaluationResult(result)
      setState('evaluated')
    } catch (err) {
      setErrorMsg('评测失败，请重试')
      setState('done')
    }
  }, [recognizedText, question])

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-6">
      {/* 题目说明 */}
      <p className="text-xs text-gray-400 mb-4">听对方说的话，用英语语音回应</p>

      {/* 对方说的话 */}
      <div className="bg-white rounded-card shadow-card border border-gray-100 p-4 mb-5">
        <p className="text-xs text-gray-400 mb-1">对方说：</p>
        <p className="text-base font-medium text-gray-900 leading-snug">{question.speakerText}</p>
        <p className="text-sm text-gray-400 mt-1">{question.speakerTextCn}</p>
      </div>

      {/* 录音区域 */}
      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
        {state === 'unsupported' ? (
          <div className="text-center px-4">
            <p className="text-sm text-orange-600 mb-2">当前浏览器不支持语音识别</p>
            <p className="text-xs text-gray-400">请使用 Chrome 浏览器，或直接跳过此题</p>
          </div>
        ) : (
          <>
            {/* 麦克风按钮：点击开始/停止 */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={state === 'done' || state === 'recognizing' || state === 'evaluating' || state === 'evaluated'}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${state === 'recording'
                  ? 'bg-red-500 scale-110 shadow-red-200'
                  : state === 'done' || state === 'recognizing' || state === 'evaluating' || state === 'evaluated'
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-[#4F7CF0] hover:bg-[#3D6ADE] active:scale-95'
                }
              `}
              aria-label={state === 'recording' ? '点击停止录音' : '点击开始说话'}
            >
              {state === 'recording' ? (
                <WaveformAnimation />
              ) : state === 'recognizing' ? (
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            {/* 状态提示文字 */}
            <p className="text-sm text-gray-500">
              {state === 'idle' && '点击麦克风开始说话'}
              {state === 'recording' && '录音中，再次点击停止...'}
              {state === 'recognizing' && '识别中...'}
              {state === 'done' && '识别完成，请确认后提交'}
              {state === 'evaluating' && '评测中...'}
              {state === 'evaluated' && '评测完成'}
              {state === 'error' && errorMsg}
            </p>
          </>
        )}

        {/* 识别结果展示 */}
        <AnimatePresence>
          {recognizedText && state !== 'evaluated' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-[#F0F4FF] rounded-card border border-[#C7D4FA] px-4 py-3"
            >
              <p className="text-xs text-[#4F7CF0] mb-1">你说的：</p>
              <p className="text-sm text-gray-800 font-medium">{recognizedText}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 评测结果展示 */}
        <AnimatePresence>
          {evaluationResult && state === 'evaluated' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full rounded-card border px-4 py-3 ${
                evaluationResult.isCorrect
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {evaluationResult.isCorrect ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold mb-1 ${
                    evaluationResult.isCorrect ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {evaluationResult.isCorrect ? '回答正确！' : '可以改进'}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">你说的：{recognizedText}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{evaluationResult.feedback}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部操作区 */}
      <div className="mt-auto flex flex-col gap-2">
        {/* 识别完成后：显示重新录制和提交按钮 */}
        {state === 'done' && (
          <>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!recognizedText.trim()}
              className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              提交答案
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-2.5 rounded-card bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              重新录制
            </button>
          </>
        )}

        {/* 评测中：显示加载状态 */}
        {state === 'evaluating' && (
          <button
            type="button"
            disabled
            className="w-full py-3.5 rounded-card bg-gray-300 text-white text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            评测中...
          </button>
        )}

        {/* 评测完成后：显示下一题按钮 */}
        {state === 'evaluated' && (
          <button
            type="button"
            onClick={onNext}
            className="w-full py-3.5 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
          >
            下一题
          </button>
        )}

        {/* 错误或不支持时：显示跳过按钮 */}
        {(state === 'error' || state === 'unsupported') && (
          <button
            type="button"
            onClick={onNext}
            className="w-full py-2.5 rounded-card bg-gray-100 text-gray-500 text-sm hover:bg-gray-200 transition-colors"
          >
            跳过此题
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 主组件：PracticeStage
// ============================================================

export default function PracticeStage({ subSceneId, onProceed }: PracticeStageProps) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 当前题目索引（0-based）
  const [currentIndex, setCurrentIndex] = useState(0)
  // 是否已完成所有题目
  const [isCompleted, setIsCompleted] = useState(false)

  // 获取练习题
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/sub-scenes/${subSceneId}/practice`)
        if (!res.ok) {
          setError('加载练习题失败，请重试')
          return
        }
        const data: { questions: PracticeQuestion[] } = await res.json()
        setQuestions(data.questions)
      } catch {
        setError('网络错误，请检查连接后重试')
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuestions()
  }, [subSceneId])

  /** 切换到下一题，最后一题完成后标记完成 */
  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setIsCompleted(true)
    }
  }, [currentIndex, questions.length])

  // ---- 加载状态 ----
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-10 h-10 border-2 border-[#4F7CF0] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">加载练习题中...</p>
      </div>
    )
  }

  // ---- 错误状态 ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-full bg-[#4F7CF0] text-white text-sm font-medium"
        >
          重新加载
        </button>
      </div>
    )
  }

  // ---- 无题目状态 ----
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-sm text-gray-400 mb-6">暂无练习题，可直接进入AI对话</p>
        <button
          type="button"
          onClick={onProceed}
          className="px-6 py-3 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          开始AI对话
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const total = questions.length

  return (
    <div className="flex flex-col min-h-full">
      {/* 顶部进度条 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        {/* 进度文字 */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">
            第 {currentIndex + 1} 题 / 共 {total} 题
          </span>
          <span className="text-xs text-gray-400">
            {currentQuestion.type === 'choice' ? '选择题' : currentQuestion.type === 'fill_blank' ? '填空题' : '问答题'}
          </span>
        </div>
        {/* 进度条 */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#4F7CF0] rounded-full"
            initial={false}
            animate={{ width: `${((currentIndex + (isCompleted ? 1 : 0)) / total) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 题目内容区域（每题一屏，AnimatePresence 切换动画） */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            /* 完成所有题目后的完成页 */
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 px-6 text-center"
            >
              {/* 完成图标 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">练习完成！</h2>
              <p className="text-sm text-gray-400 mb-8 max-w-[240px] leading-relaxed">
                已完成全部 {total} 道练习题，准备好进入AI对话了吗？
              </p>

              {/* 开始AI对话按钮 */}
              <button
                type="button"
                onClick={onProceed}
                className="w-full max-w-[280px] py-4 rounded-card bg-[#4F7CF0] text-white text-base font-semibold shadow-lg hover:bg-[#3D6ADE] active:scale-[0.98] transition-all"
              >
                开始AI对话
              </button>
            </motion.div>
          ) : (
            /* 当前题目 */
            <motion.div
              key={`question-${currentIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {currentQuestion.type === 'choice' && (
                <ChoiceQuestion
                  question={currentQuestion}
                  onNext={handleNext}
                />
              )}
              {currentQuestion.type === 'fill_blank' && (
                <FillBlankQuestion
                  question={currentQuestion}
                  onNext={handleNext}
                />
              )}
              {currentQuestion.type === 'speaking' && (
                <SpeakingQuestion
                  question={currentQuestion}
                  onNext={handleNext}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
