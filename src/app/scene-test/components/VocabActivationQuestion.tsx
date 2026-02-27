'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Check, X, Volume2 } from 'lucide-react'
import type { VocabActivationContent } from '@/types'
import { buildAudioUrl } from '@/lib/audioUrl'

// 词汇激活评测结果
export interface VocabActivationResult {
  isCorrect: boolean
  isClose: boolean       // 编辑距离 ≤ 2，接近正确
  userAnswer: string
  targetWord: string
}

interface VocabActivationQuestionProps {
  content: VocabActivationContent
  onResult: (result: VocabActivationResult) => void
  disabled?: boolean
}

/**
 * 计算两个字符串的编辑距离（Levenshtein Distance）
 */
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/** 词性中文映射 */
const partOfSpeechMap: Record<string, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  preposition: '介词',
  conjunction: '连词',
  pronoun: '代词',
  interjection: '感叹词',
  phrase: '短语',
}

export default function VocabActivationQuestion({
  content,
  onResult,
  disabled = false,
}: VocabActivationQuestionProps) {
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<VocabActivationResult | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
        const transcript: string = event.results[0][0].transcript.trim()
        setInputValue(transcript)
        setIsRecording(false)
        // 语音输入完成后自动评测
        evaluateAnswer(transcript)
      }
      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)
      recognitionRef.current = rec
    }
  }, [content])

  // 答对后自动播放词汇发音
  useEffect(() => {
    if (result?.isCorrect && content.exampleAudioUrl) {
      const url = buildAudioUrl(content.exampleAudioUrl)
      if (url) {
        const audio = new Audio(url)
        audioRef.current = audio
        audio.play().catch(() => {})
      }
    }
  }, [result])

  /** 评测答案：精确匹配 + 编辑距离检测 */
  const evaluateAnswer = (answer: string) => {
    const normalized = answer.trim().toLowerCase()
    const target = content.targetWord.trim().toLowerCase()
    const isCorrect = normalized === target
    const dist = editDistance(normalized, target)
    const isClose = !isCorrect && dist <= 2

    const evalResult: VocabActivationResult = {
      isCorrect,
      isClose,
      userAnswer: answer.trim(),
      targetWord: content.targetWord,
    }
    setResult(evalResult)
    onResult(evalResult)
  }

  const handleSubmit = () => {
    if (!inputValue.trim()) return
    evaluateAnswer(inputValue)
  }

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

  /** 播放例句音频 */
  const playExampleAudio = () => {
    if (!content.exampleAudioUrl) return
    const url = buildAudioUrl(content.exampleAudioUrl)
    if (!url) return
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(url)
    audioRef.current = audio
    setIsPlayingAudio(true)
    audio.play().catch(() => setIsPlayingAudio(false))
    audio.onended = () => setIsPlayingAudio(false)
  }

  const posLabel = partOfSpeechMap[content.partOfSpeech] || content.partOfSpeech

  return (
    <div className="space-y-4">
      {/* 中文提示 + 词性 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base font-semibold text-gray-800">{content.chineseHint}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F7CF0] font-medium">
          {posLabel}
        </span>
      </div>

      {/* 输入区域 */}
      {!isAnswered && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="输入英文单词..."
            className="flex-1 px-4 py-2.5 border-2 border-gray-100 rounded-2xl text-sm text-gray-800 outline-none focus:border-[#4F7CF0] transition-colors bg-gray-50 placeholder:text-gray-400"
          />
          {/* 语音输入 */}
          <button
            onClick={toggleRecording}
            className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all ${
              isRecording
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-[#4F7CF0] hover:text-[#4F7CF0]'
            }`}
          >
            <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>
          {/* 提交 */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="h-10 px-4 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl text-sm font-medium disabled:opacity-40"
          >
            确认
          </button>
        </div>
      )}

      {/* 评测结果 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`rounded-2xl p-4 border space-y-3 ${
              result.isCorrect
                ? 'bg-[#F0FFF4] border-[#A7F3D0]'
                : result.isClose
                  ? 'bg-[#FFFBEB] border-[#FDE68A]'
                  : 'bg-[#FFF5F5] border-[#FCA5A5]'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* 状态图标 */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  result.isCorrect
                    ? 'bg-[#34D399]'
                    : result.isClose
                      ? 'bg-[#F59E0B]'
                      : 'bg-red-400'
                }`}
              >
                {result.isCorrect
                  ? <Check className="h-4 w-4 text-white" />
                  : result.isClose
                    ? <span className="text-white text-xs font-bold">≈</span>
                    : <X className="h-4 w-4 text-white" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {result.isCorrect
                    ? '回答正确！'
                    : result.isClose
                      ? '接近正确答案'
                      : '回答有误'}
                </p>
                {result.isClose && (
                  <p className="text-xs text-[#92400E]">拼写接近，但不完全正确</p>
                )}
              </div>
            </div>

            {/* 正确答案 + 音标 */}
            <div className="bg-white/70 rounded-xl px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{content.targetWord}</span>
                {content.phonetic && (
                  <span className="text-xs text-gray-400">{content.phonetic}</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{content.chineseHint}</p>
            </div>

            {/* 例句 + 音频播放 */}
            {content.exampleSentence && (
              <div className="bg-white/70 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">{content.exampleSentence}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{content.exampleTranslation}</p>
                  </div>
                  {content.exampleAudioUrl && (
                    <button
                      onClick={playExampleAudio}
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isPlayingAudio
                          ? 'bg-[#4F7CF0] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-[#EEF2FF] hover:text-[#4F7CF0]'
                      }`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
