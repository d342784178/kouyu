'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Loader2, RotateCcw } from 'lucide-react'
import type { GuidedRoleplayContent } from '@/types'

// 情景再现评测结果接口
export interface GuidedRoleplayResult {
  intentScore: number
  naturalness: string
  vocabularyFeedback: string
  suggestions: string[]
  referenceExpression: string
  userAnswer: string
}

interface GuidedRoleplayQuestionProps {
  content: GuidedRoleplayContent
  onResult: (result: GuidedRoleplayResult) => void
  disabled?: boolean
}

/**
 * 根据意图达成度分数返回对应颜色类名
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[#059669]'
  if (score >= 60) return 'text-[#D97706]'
  return 'text-red-500'
}

/**
 * 根据意图达成度分数返回背景色类名
 */
function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-[#F0FFF4] border-[#A7F3D0]'
  if (score >= 60) return 'bg-[#FFFBEB] border-[#FDE68A]'
  return 'bg-[#FFF5F5] border-[#FCA5A5]'
}

export default function GuidedRoleplayQuestion({
  content,
  onResult,
  disabled = false,
}: GuidedRoleplayQuestionProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<GuidedRoleplayResult | null>(null)
  const [validationError, setValidationError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  // 是否已作答
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
        // 语音转文字后填入 textarea
        setUserAnswer(prev => prev ? `${prev} ${transcript}` : transcript)
        setIsRecording(false)
        setValidationError('')
      }
      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)
      recognitionRef.current = rec
    }
  }, [])

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
    // 检查答案是否为空
    if (!userAnswer.trim()) {
      setValidationError('请输入您的回答后再提交')
      return
    }

    setValidationError('')
    setIsEvaluating(true)

    try {
      const response = await fetch('/api/guided-roleplay/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogueGoal: content.dialogueGoal,
          userAnswer,
          keywords: content.keywordHints,
          evaluationDimensions: content.evaluationDimensions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '评测失败')
      }

      const data = await response.json()
      const evalResult: GuidedRoleplayResult = {
        intentScore: data.intentScore,
        naturalness: data.naturalness,
        vocabularyFeedback: data.vocabularyFeedback,
        suggestions: data.suggestions || [],
        referenceExpression: data.referenceExpression || '',
        userAnswer,
      }
      setResult(evalResult)
      onResult(evalResult)
    } catch (error) {
      setValidationError(`评测失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  // 重新作答：清空回答和结果
  const handleReset = () => {
    setResult(null)
    setUserAnswer('')
    setValidationError('')
  }

  return (
    <div className="space-y-4">
      {/* 情景描述卡片 */}
      <div className="bg-gray-50 rounded-2xl px-4 py-3">
        <p className="text-xs text-gray-400 mb-1">情景描述</p>
        <p className="text-sm text-gray-600 leading-relaxed">{content.situationDescription}</p>
      </div>

      {/* 对话目标（蓝色强调） */}
      <div className="bg-[#EEF2FF] rounded-2xl px-4 py-3 border border-[#C7D7FD]">
        <p className="text-xs text-[#4F7CF0] mb-1 font-medium">对话目标</p>
        <p className="text-sm text-[#3B5FCC] font-medium leading-relaxed">{content.dialogueGoal}</p>
      </div>

      {/* 关键词提示 */}
      {content.keywordHints && content.keywordHints.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">关键词提示</p>
          <div className="flex flex-wrap gap-1.5">
            {content.keywordHints.map((kw, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 作答区域 */}
      {!isAnswered && (
        <div className="space-y-3">
          <textarea
            value={userAnswer}
            onChange={e => {
              setUserAnswer(e.target.value)
              setValidationError('')
            }}
            disabled={isEvaluating}
            placeholder="请用英文输入您的回答..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-700 resize-none outline-none focus:border-[#4F7CF0] transition-colors placeholder:text-gray-300 disabled:opacity-50"
          />

          {/* 校验提示 */}
          {validationError && (
            <p className="text-xs text-red-500">{validationError}</p>
          )}

          {/* 操作按钮区 */}
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
        </div>
      )}

      {/* 评测结果展示 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`rounded-2xl p-4 border space-y-3 ${getScoreBgColor(result.intentScore)}`}
          >
            {/* 意图达成度评分（大字体） */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">意图达成度</span>
              <span className={`text-3xl font-bold ${getScoreColor(result.intentScore)}`}>
                {result.intentScore}
                <span className="text-base font-normal ml-0.5">分</span>
              </span>
            </div>

            {/* 语言自然度 */}
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">语言自然度</p>
              <p className="text-sm text-gray-700">{result.naturalness}</p>
            </div>

            {/* 词汇使用评价 */}
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">词汇使用</p>
              <p className="text-sm text-gray-700">{result.vocabularyFeedback}</p>
            </div>

            {/* 改进建议 */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                {result.suggestions.map((tip, idx) => (
                  <div key={idx} className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-600">
                    💡 {tip}
                  </div>
                ))}
              </div>
            )}

            {/* 参考表达（英文） */}
            {result.referenceExpression && (
              <div className="bg-white/70 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">参考表达</p>
                <p className="text-sm text-gray-800 font-medium italic">{result.referenceExpression}</p>
              </div>
            )}

            {/* 重新作答按钮 */}
            {!disabled && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-[#4F7CF0] hover:text-[#3B5FCC] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重新作答
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
