'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

// 定义维度类型
interface Dimension {
  key: string
  title: string
  score: number
  explanation?: string
  icon: string
  color: string
  gradient: string
  description: string
}

// 定义分析结果类型
interface TestAnalysis {
  overallScore: number
  dimensions: {
    content: number
    contentExplanation?: string
    grammar: number
    grammarExplanation?: string
    vocabulary: number
    vocabularyExplanation?: string
    pronunciation: number
    pronunciationExplanation?: string
    fluency: number
    fluencyExplanation?: string
  }
  transcript: Message[]
  audioUrl?: string
  suggestions: string[]
  conversationFlow: string
}

interface TestAnalysisProps {
  sceneId: string
  testId: string
  conversation: Message[]
  rounds: number
  onComplete: () => void
}

export default function TestAnalysis({ sceneId, testId, conversation, rounds, onComplete }: TestAnalysisProps) {
  const [analysis, setAnalysis] = useState<TestAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null)
  const [messageAudioElement, setMessageAudioElement] = useState<HTMLAudioElement | null>(null)
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dimensions' | 'conversation' | 'suggestions'>('dimensions')

  // 使用 ref 来跟踪播放状态，避免闭包问题
  const isPlayingRef = useRef(false)
  const stopPlaybackRef = useRef(false)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    fetchAnalysis()
  }, [])

  // 获取测试分析
  const fetchAnalysis = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/open-test/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneId,
          testId,
          conversation,
          rounds,
        }),
      })

      if (!response.ok) {
        throw new Error('获取分析结果失败')
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error('获取分析结果失败:', err)
      setError('获取分析结果失败，请重试')
      // 使用模拟数据
      setAnalysis(generateMockAnalysis(conversation))
    } finally {
      setLoading(false)
    }
  }

  // 播放全量对话 - 依次播放每条消息的音频
  const playFullConversation = async () => {
    // 如果正在播放全量对话，则停止
    if (isPlayingRef.current) {
      stopPlaybackRef.current = true
      if (audioElement) {
        audioElement.pause()
      }
      setIsPlaying(false)
      setPlayingMessageIndex(null)
      return
    }

    // 获取所有有音频的消息
    const messagesWithAudio = analysis?.transcript.filter(msg => msg.audioUrl) || []
    if (messagesWithAudio.length === 0) {
      setError('没有可播放的音频')
      return
    }

    // 暂停单条消息播放
    if (messageAudioElement) {
      messageAudioElement.pause()
      setPlayingMessageIndex(null)
      setMessageAudioElement(null)
    }

    setIsPlaying(true)
    stopPlaybackRef.current = false
    setError('')

    // 依次播放每条消息的音频
    for (let i = 0; i < messagesWithAudio.length; i++) {
      if (stopPlaybackRef.current) break // 如果用户暂停了，停止播放

      const message = messagesWithAudio[i]
      const originalIndex = analysis?.transcript.findIndex(m => m === message) || 0

      try {
        await playAudioSequentially(message.audioUrl!, originalIndex)
      } catch (error) {
        console.error('播放音频失败:', error)
        continue
      }
    }

    setIsPlaying(false)
    setPlayingMessageIndex(null)
  }

  // 顺序播放单个音频
  const playAudioSequentially = (audioUrl: string, index: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)
      setAudioElement(audio)
      setPlayingMessageIndex(index)

      audio.onended = () => {
        setPlayingMessageIndex(null)
        resolve()
      }

      audio.onerror = () => {
        setPlayingMessageIndex(null)
        reject(new Error('音频播放失败'))
      }

      audio.play().catch(reject)
    })
  }

  // 播放单条消息语音
  const playMessageAudio = (audioUrl: string | undefined, index: number) => {
    if (!audioUrl) return

    // 如果点击的是正在播放的消息，则暂停
    if (playingMessageIndex === index && messageAudioElement) {
      messageAudioElement.pause()
      setPlayingMessageIndex(null)
      setMessageAudioElement(null)
      return
    }

    // 暂停全量对话播放
    if (audioElement) {
      audioElement.pause()
      setIsPlaying(false)
    }

    // 暂停其他正在播放的单条消息
    if (messageAudioElement) {
      messageAudioElement.pause()
    }

    const audio = new Audio(audioUrl)
    setMessageAudioElement(audio)
    setPlayingMessageIndex(index)

    audio.play()

    audio.onended = () => {
      setPlayingMessageIndex(null)
      setMessageAudioElement(null)
    }

    audio.onerror = () => {
      setPlayingMessageIndex(null)
      setMessageAudioElement(null)
    }
  }

  // 获取评分等级
  const getScoreLevel = (score: number) => {
    if (score >= 90) return { label: '优秀', color: 'text-emerald-500', bg: 'bg-emerald-500' }
    if (score >= 80) return { label: '良好', color: 'text-blue-500', bg: 'bg-blue-500' }
    if (score >= 70) return { label: '中等', color: 'text-amber-500', bg: 'bg-amber-500' }
    if (score >= 60) return { label: '及格', color: 'text-orange-500', bg: 'bg-orange-500' }
    return { label: '需提升', color: 'text-rose-500', bg: 'bg-rose-500' }
  }

  // 获取维度数据
  const getDimensions = (analysis: TestAnalysis): Dimension[] => [
    {
      key: 'content',
      title: '内容完整性',
      score: analysis.dimensions.content,
      explanation: analysis.dimensions.contentExplanation,
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'text-blue-500',
      gradient: 'from-blue-500 to-cyan-400',
      description: '评估回答的完整性和信息丰富度'
    },
    {
      key: 'grammar',
      title: '语法正确性',
      score: analysis.dimensions.grammar,
      explanation: analysis.dimensions.grammarExplanation,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: 'text-emerald-500',
      gradient: 'from-emerald-500 to-teal-400',
      description: '评估语法结构和时态使用的准确性'
    },
    {
      key: 'vocabulary',
      title: '词汇丰富度',
      score: analysis.dimensions.vocabulary,
      explanation: analysis.dimensions.vocabularyExplanation,
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      color: 'text-violet-500',
      gradient: 'from-violet-500 to-purple-400',
      description: '评估词汇量和表达方式的多样性'
    },
    {
      key: 'pronunciation',
      title: '发音准确性',
      score: analysis.dimensions.pronunciation,
      explanation: analysis.dimensions.pronunciationExplanation,
      icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
      color: 'text-amber-500',
      gradient: 'from-amber-500 to-orange-400',
      description: '评估发音清晰度和语音语调'
    },
    {
      key: 'fluency',
      title: '对话流畅度',
      score: analysis.dimensions.fluency,
      explanation: analysis.dimensions.fluencyExplanation,
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      color: 'text-rose-500',
      gradient: 'from-rose-500 to-pink-400',
      description: '评估对话的连贯性和自然程度'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <p className="text-slate-600 font-medium">正在生成分析报告...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
            onClick={fetchAnalysis}
          >
            重新生成
          </button>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-500">分析结果不存在</div>
      </div>
    )
  }

  const dimensions = getDimensions(analysis)
  const overallLevel = getScoreLevel(analysis.overallScore)

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* 顶部总体评分卡片 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />

        <div className="relative px-6 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white"
          >
            <h1 className="text-lg font-medium opacity-90 mb-2">测试完成</h1>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-6xl font-bold">{analysis.overallScore}</span>
              <span className="text-2xl opacity-60">/100</span>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm`}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-medium">{overallLevel.label}</span>
            </div>
            <p className="mt-3 text-sm opacity-70">
              基于 {rounds} 轮对话的综合评估
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex">
          {[
            { key: 'dimensions', label: '维度分析', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { key: 'conversation', label: '对话记录', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
            { key: 'suggestions', label: '改进建议', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-6">
        <AnimatePresence mode="wait">
          {/* 维度分析 Tab */}
          {activeTab === 'dimensions' && (
            <motion.div
              key="dimensions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* 雷达图概览卡片 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">能力雷达</h3>
                <div className="relative h-48 flex items-center justify-center">
                  {/* 简化的雷达图 */}
                  <svg viewBox="0 0 200 180" className="w-full h-full max-w-xs">
                    {/* 背景网格 */}
                    {[20, 40, 60, 80, 100].map((level) => (
                      <polygon
                        key={level}
                        points={dimensions.map((_, i) => {
                          const angle = (i * 72 - 90) * (Math.PI / 180)
                          const r = (level / 100) * 70
                          return `${100 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`
                        }).join(' ')}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                    ))}
                    {/* 轴线 */}
                    {dimensions.map((_, i) => {
                      const angle = (i * 72 - 90) * (Math.PI / 180)
                      return (
                        <line
                          key={i}
                          x1="100"
                          y1="90"
                          x2={100 + 70 * Math.cos(angle)}
                          y2={90 + 70 * Math.sin(angle)}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                        />
                      )
                    })}
                    {/* 数据区域 */}
                    <polygon
                      points={dimensions.map((d, i) => {
                        const angle = (i * 72 - 90) * (Math.PI / 180)
                        const r = (d.score / 100) * 70
                        return `${100 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`
                      }).join(' ')}
                      fill="url(#gradient)"
                      fillOpacity="0.3"
                      stroke="url(#gradient)"
                      strokeWidth="2"
                    />
                    {/* 数据点 */}
                    {dimensions.map((d, i) => {
                      const angle = (i * 72 - 90) * (Math.PI / 180)
                      const r = (d.score / 100) * 70
                      return (
                        <circle
                          key={i}
                          cx={100 + r * Math.cos(angle)}
                          cy={90 + r * Math.sin(angle)}
                          r="4"
                          fill="white"
                          stroke={d.color.replace('text-', '#') === '#text-blue-500' ? '#3b82f6' :
                                  d.color.replace('text-', '#') === '#text-emerald-500' ? '#10b981' :
                                  d.color.replace('text-', '#') === '#text-violet-500' ? '#8b5cf6' :
                                  d.color.replace('text-', '#') === '#text-amber-500' ? '#f59e0b' : '#f43f5e'}
                          strokeWidth="2"
                        />
                      )
                    })}
                    {/* 标签 */}
                    {dimensions.map((d, i) => {
                      const angle = (i * 72 - 90) * (Math.PI / 180)
                      const r = 85
                      return (
                        <text
                          key={i}
                          x={100 + r * Math.cos(angle)}
                          y={90 + r * Math.sin(angle)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs fill-slate-500"
                        >
                          {d.title.slice(0, 2)}
                        </text>
                      )
                    })}
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* 维度详情卡片 */}
              {dimensions.map((dim, index) => {
                const level = getScoreLevel(dim.score)
                const isExpanded = expandedDimension === dim.key

                return (
                  <motion.div
                    key={dim.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer overflow-hidden ${
                      isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-100 hover:border-slate-200'
                    }`}
                    onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
                  >
                    {/* 卡片头部 */}
                    <div className="p-5">
                      <div className="flex items-center gap-4">
                        {/* 图标 */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dim.gradient} flex items-center justify-center shadow-lg`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dim.icon} />
                          </svg>
                        </div>

                        {/* 标题和描述 */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{dim.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{dim.description}</p>
                        </div>

                        {/* 分数 */}
                        <div className="text-right">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800">{dim.score}</span>
                            <span className="text-xs text-slate-400">分</span>
                          </div>
                          <span className={`text-xs font-medium ${level.color}`}>{level.label}</span>
                        </div>

                        {/* 展开箭头 */}
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* 进度条 */}
                      <div className="mt-4">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${dim.gradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${dim.score}%` }}
                            transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 展开详情 */}
                    <AnimatePresence>
                      {isExpanded && dim.explanation && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-5">
                            <h5 className="text-sm font-medium text-slate-700 mb-2">详细分析</h5>
                            <p className="text-sm text-slate-600 leading-relaxed">{dim.explanation}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* 对话记录 Tab */}
          {activeTab === 'conversation' && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* 播放控制 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">对话回放</h3>
                    <p className="text-xs text-slate-500 mt-0.5">共 {analysis.transcript.length} 条消息</p>
                  </div>
                  <button
                    onClick={playFullConversation}
                    disabled={!analysis.transcript.some(msg => msg.audioUrl)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      isPlaying
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/25'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      {isPlaying ? (
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                    {isPlaying ? '暂停' : '播放全部'}
                  </button>
                </div>
              </div>

              {/* 对话列表 */}
              <div className="space-y-3">
                {analysis.transcript.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] ${message.role === 'assistant' ? 'mr-auto' : 'ml-auto'}`}>
                      {/* 头像和名称 */}
                      <div className={`flex items-center gap-2 mb-1 ${message.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                          message.role === 'assistant'
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white'
                        }`}>
                          {message.role === 'assistant' ? 'AI' : '我'}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* 消息内容 */}
                      <div className={`relative group ${message.role === 'assistant' ? 'pr-10' : 'pl-10'}`}>
                        <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          message.role === 'assistant'
                            ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-tr-sm'
                        }`}>
                          {message.content}
                        </div>

                        {/* 播放按钮 */}
                        {message.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              playMessageAudio(message.audioUrl, index)
                            }}
                            className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              message.role === 'assistant' ? '-right-10' : '-left-10'
                            } ${
                              playingMessageIndex === index
                                ? 'bg-rose-100 text-rose-500'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              {playingMessageIndex === index ? (
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              ) : (
                                <path d="M8 5v14l11-7z" />
                              )}
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 改进建议 Tab */}
          {activeTab === 'suggestions' && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* 对话流程分析 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">整体评价</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">{analysis.conversationFlow}</p>
                  </div>
                </div>
              </div>

              {/* 建议列表 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  提升建议
                </h4>
                <div className="space-y-3">
                  {analysis.suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{suggestion}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-area-bottom">
        <button
          onClick={onComplete}
          className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
        >
          完成测试
        </button>
      </div>
    </div>
  )
}

// 生成模拟分析数据
function generateMockAnalysis(conversation: Message[]): TestAnalysis {
  return {
    overallScore: 78,
    dimensions: {
      content: 82,
      contentExplanation: '用户能够基本回答问题，但缺乏深入展开话题的能力。建议在回答时多提供细节和例子。',
      grammar: 75,
      grammarExplanation: '语法基础较好，但存在时态错误和主谓不一致的问题。建议加强时态练习。',
      vocabulary: 70,
      vocabularyExplanation: '词汇量中等，使用了一些场景相关词汇，但重复较多。建议学习更多同义词和高级表达。',
      pronunciation: 85,
      pronunciationExplanation: '发音基本清晰，个别单词重音位置有误。建议多听原声材料模仿。',
      fluency: 76,
      fluencyExplanation: '对话基本流畅，有少量犹豫和停顿。建议通过大量练习提高反应速度。',
    },
    transcript: conversation,
    audioUrl: 'https://example.com/audio/full_conversation.mp3',
    suggestions: [
      '注意动词时态的正确使用，特别是过去时和现在完成时的区别',
      '尝试使用更多连接词如 "however", "therefore", "meanwhile" 使对话更流畅',
      '扩充词汇量，使用更丰富的表达方式，避免重复使用简单词汇',
      '注意发音的准确性，特别是元音发音和单词重音',
      '练习更自然的对话节奏和语调，可以通过跟读原声材料来提高',
    ],
    conversationFlow: '对话整体流畅，能够基本表达自己的想法，但在某些话题上可以更深入展开。建议增加对话的互动性，主动提问和回应对方的问题。',
  }
}
