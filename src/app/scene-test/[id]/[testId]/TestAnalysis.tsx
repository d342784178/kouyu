'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: number
}

// 定义分析结果类型
interface TestAnalysis {
  overallScore: number
  dimensions: {
    content: number
    grammar: number
    vocabulary: number
    pronunciation: number
    fluency: number
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

  // 播放全量对话
  const playFullConversation = () => {
    if (analysis?.audioUrl) {
      if (audioElement) {
        audioElement.pause()
      }

      const audio = new Audio(analysis.audioUrl)
      setAudioElement(audio)
      setIsPlaying(true)

      audio.play()

      audio.onended = () => {
        setIsPlaying(false)
      }

      audio.onerror = () => {
        setIsPlaying(false)
      }
    }
  }

  // 渲染评分卡片
  const renderScoreCard = (title: string, score: number, icon: string, color: string) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-text-secondary">{title}</h4>
          <i className={`fas ${icon} text-${color}`}></i>
        </div>
        <div className="flex items-end">
          <span className="text-2xl font-bold text-text-primary">{score}</span>
          <span className="text-xs text-text-secondary ml-1 mb-1">/100</span>
        </div>
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${color}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-primary">生成分析报告中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          className="px-6 py-2 bg-primary text-white rounded-lg"
          onClick={fetchAnalysis}
        >
          重试
        </button>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-secondary">分析结果不存在</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 顶部导航 */}
      <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Link 
            href={`/scene-detail/${sceneId}`} 
            className="flex items-center text-text-primary"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            返回
          </Link>
          <h2 className="text-lg font-semibold text-text-primary">测试分析</h2>
          <button className="text-text-primary">
            <i className="fas fa-share-alt"></i>
          </button>
        </div>
      </header>

      <main className="mx-4 mt-4 pb-20">
        {/* 总体评分 */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white text-center">
            <h3 className="text-lg font-semibold mb-2">总体评分</h3>
            <div className="text-4xl font-bold mb-2">{analysis.overallScore}</div>
            <p className="text-sm opacity-90">
              基于 {rounds} 轮对话的综合评估
            </p>
          </div>
        </section>

        {/* 维度评分 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">维度分析</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderScoreCard('内容完整性', analysis.dimensions.content, 'fa-file-alt', 'bg-blue-500')}
            {renderScoreCard('语法正确性', analysis.dimensions.grammar, 'fa-check-circle', 'bg-green-500')}
            {renderScoreCard('词汇丰富度', analysis.dimensions.vocabulary, 'fa-book', 'bg-purple-500')}
            {renderScoreCard('发音准确性', analysis.dimensions.pronunciation, 'fa-microphone', 'bg-orange-500')}
            {renderScoreCard('对话流畅度', analysis.dimensions.fluency, 'fa-comments', 'bg-teal-500')}
          </div>
        </section>

        {/* 对话回放 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">对话回放</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-secondary">完整对话</span>
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center"
                onClick={playFullConversation}
                disabled={!analysis.audioUrl}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                {isPlaying ? '暂停' : '播放'}
              </button>
            </div>
            
            {/* 对话记录 */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analysis.transcript.map((message, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${message.role === 'assistant' 
                    ? 'bg-blue-50 text-blue-800' 
                    : 'bg-green-50 text-green-800'}`}
                >
                  <div className="flex items-start">
                    <span className="font-medium mr-2">
                      {message.role === 'assistant' ? 'AI:' : '你:'}
                    </span>
                    <span className="flex-1 text-sm">{message.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 改进建议 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">改进建议</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <i className="fas fa-lightbulb text-yellow-500 mt-1 mr-2 flex-shrink-0"></i>
                  <span className="text-sm text-text-secondary">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 对话流程分析 */}
        <section className="mb-12">
          <h3 className="text-lg font-semibold text-text-primary mb-4">对话流程分析</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-text-secondary leading-relaxed">
              {analysis.conversationFlow}
            </p>
          </div>
        </section>

        {/* 底部按钮 */}
        <div className="fixed bottom-6 left-4 right-4">
          <button
            className="w-full py-3 bg-primary text-white rounded-lg font-medium"
            onClick={onComplete}
          >
            完成测试
          </button>
        </div>
      </main>
    </div>
  )
}

// 生成模拟分析数据
function generateMockAnalysis(conversation: Message[]): TestAnalysis {
  return {
    overallScore: 78,
    dimensions: {
      content: 82,
      grammar: 75,
      vocabulary: 70,
      pronunciation: 85,
      fluency: 76,
    },
    transcript: conversation,
    audioUrl: 'https://example.com/audio/full_conversation.mp3',
    suggestions: [
      '注意动词时态的正确使用',
      '尝试使用更多连接词使对话更流畅',
      '扩充词汇量，使用更丰富的表达方式',
      '注意发音的准确性，特别是元音发音',
      '练习更自然的对话节奏和语调',
    ],
    conversationFlow: '对话整体流畅，能够基本表达自己的想法，但在某些话题上可以更深入展开。建议增加对话的互动性，主动提问和回应对方的问题。',
  }
}
