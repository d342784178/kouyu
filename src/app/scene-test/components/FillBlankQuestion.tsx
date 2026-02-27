'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Check, X, Loader2 } from 'lucide-react'
import type { FillBlankContent } from '@/types'

// 填空题评测结果
export interface FillBlankResult {
  isCorrect: boolean
  referenceAnswer: string
  semanticAnalysis: string
  feedback: string
  userAnswers: string[]
}

interface FillBlankQuestionProps {
  content: FillBlankContent
  onResult: (result: FillBlankResult) => void
  disabled?: boolean
}

/**
 * 将模板字符串按 ___ 拆分为片段数组
 * 例如 "I'd like to ___ a table for ___ people."
 * 返回 ["I'd like to ", " a table for ", " people."]
 */
function parseTemplate(template: string): string[] {
  return template.split('___')
}

export default function FillBlankQuestion({ content, onResult, disabled = false }: FillBlankQuestionProps) {
  const parts = parseTemplate(content.template)
  // 输入框数量 = 占位符数量 = parts.length - 1
  const blankCount = parts.length - 1

  const [answers, setAnswers] = useState<string[]>(Array(blankCount).fill(''))
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<FillBlankResult | null>(null)
  const [validationError, setValidationError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  // 当前聚焦的输入框索引，语音输入时填入该输入框
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const recognitionRef = useRef<any>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // 是否已作答（有评测结果或外部 disabled）
  const isAnswered = disabled || result !== null

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        // 填入当前聚焦的输入框
        setAnswers(prev => {
          const next = [...prev]
          next[focusedIndex] = transcript
          return next
        })
        setIsRecording(false)
      }
      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)
      recognitionRef.current = rec
    }
  }, [focusedIndex])

  // 更新某个输入框的值
  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setValidationError('')
  }

  // 切换语音录入
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能')
      return
    }
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  // 提交答案
  const handleSubmit = async () => {
    // 检查所有输入框是否有内容
    const hasEmpty = answers.some(a => !a.trim())
    if (hasEmpty) {
      setValidationError('请填写所有空格后再提交')
      return
    }

    setValidationError('')
    setIsEvaluating(true)

    try {
      const response = await fetch('/api/fill-blank/evaluate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: content.template,
          userAnswers: answers,
          referenceAnswer: content.referenceAnswer,
          keywords: content.keywords,
          scenarioHint: content.scenarioHint,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '评测失败')
      }

      const data = await response.json()
      const evalResult: FillBlankResult = {
        isCorrect: data.isCorrect,
        referenceAnswer: data.referenceAnswer || content.referenceAnswer,
        semanticAnalysis: data.semanticAnalysis,
        feedback: data.feedback,
        userAnswers: answers,
      }
      setResult(evalResult)
      onResult(evalResult)
    } catch (error) {
      setValidationError(`评测失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 场景提示 */}
      {content.scenarioHint && (
        <p className="text-xs text-gray-400 leading-relaxed">{content.scenarioHint}</p>
      )}

      {/* 句型模板 + 输入框交替渲染 */}
      <div className="flex flex-wrap items-center gap-y-2 text-sm text-gray-700 leading-loose">
        {parts.map((part, idx) => (
          <span key={idx} className="flex items-center flex-wrap gap-y-2">
            {/* 文本片段 */}
            {part && <span>{part}</span>}
            {/* 输入框（最后一个 part 后面没有输入框） */}
            {idx < blankCount && (
              <input
                ref={el => { inputRefs.current[idx] = el }}
                type="text"
                value={answers[idx]}
                onChange={e => handleAnswerChange(idx, e.target.value)}
                onFocus={() => setFocusedIndex(idx)}
                disabled={isAnswered || isEvaluating}
                placeholder="填写答案"
                className={`mx-1 px-2 py-1 border-b-2 bg-transparent outline-none text-sm transition-colors text-center
                  ${isAnswered
                    ? result
                      ? result.isCorrect
                        ? 'border-[#34D399] text-[#059669]'
                        : 'border-red-400 text-red-500'
                      : 'border-gray-300 text-gray-500'
                    : 'border-[#4F7CF0] text-gray-800 focus:border-[#7B5FE8]'
                  }`}
                style={{ minWidth: '80px', width: `${Math.max(80, (answers[idx]?.length || 6) * 10)}px` }}
              />
            )}
          </span>
        ))}
      </div>

      {/* 关键词提示 */}
      {content.keywords && content.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {content.keywords.map((kw, idx) => (
            <span
              key={idx}
              className="text-xs px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 校验提示 */}
      {validationError && (
        <p className="text-xs text-red-500">{validationError}</p>
      )}

      {/* 操作按钮区 */}
      {!isAnswered && (
        <div className="flex items-center gap-3">
          {/* 语音输入按钮 */}
          <button
            onClick={toggleRecording}
            disabled={isEvaluating}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-2xl border transition-all ${
              isRecording
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-[#4F7CF0] hover:text-[#4F7CF0]'
            }`}
          >
            <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
            {isRecording ? '录音中...' : '语音输入'}
          </button>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isEvaluating}
            className="flex-1 h-10 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                评测中...
              </>
            ) : (
              '提交'
            )}
          </button>
        </div>
      )}

      {/* 评测结果展示 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`rounded-2xl p-4 border ${
              result.isCorrect
                ? 'bg-[#F0FFF4] border-[#A7F3D0]'
                : 'bg-[#FFF5F5] border-[#FCA5A5]'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* 正确/错误图标 */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  result.isCorrect ? 'bg-[#34D399]' : 'bg-red-400'
                }`}
              >
                {result.isCorrect
                  ? <Check className="h-4 w-4 text-white" />
                  : <X className="h-4 w-4 text-white" />
                }
              </div>

              <div className="flex-1 space-y-2">
                <p className="font-semibold text-gray-800 text-sm">
                  {result.isCorrect ? '回答正确！' : '回答有误'}
                </p>

                {/* 参考答案 */}
                <div className="bg-white/70 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-500">参考答案：</span>
                  <span className="text-sm font-medium text-gray-700 ml-1">{result.referenceAnswer}</span>
                </div>

                {/* 语义分析 */}
                {result.semanticAnalysis && (
                  <p className="text-xs text-gray-600 leading-relaxed">{result.semanticAnalysis}</p>
                )}

                {/* 反馈建议 */}
                {result.feedback && (
                  <div className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-500">
                    💡 {result.feedback}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
