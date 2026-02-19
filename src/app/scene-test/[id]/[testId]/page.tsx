'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import OpenTestDialog from './OpenTestDialog'
import LoadingSpinner from './components/LoadingSpinner'

interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

interface Test {
  id: string
  sceneId: string
  type: 'multiple-choice' | 'fill-blank' | 'open' | 'qa'
  question: string
  options?: string[]
  answer: string
  analysis: string
  order: number
  createdAt: string
  updatedAt: string
}

interface QAEvaluation {
  score: number
  feedback: string
  suggestions: string[]
}

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'multiple-choice':
      return { label: '选择题', color: 'text-[#4F7CF0]', bgColor: 'bg-[#EEF2FF]' }
    case 'fill-blank':
      return { label: '填空题', color: 'text-[#F59E0B]', bgColor: 'bg-[#FFF8EE]' }
    case 'open':
      return { label: '开放题', color: 'text-[#EC4899]', bgColor: 'bg-[#FFF0F5]' }
    case 'qa':
      return { label: '问答题', color: 'text-[#34D399]', bgColor: 'bg-[#F0FFF4]' }
    default:
      return { label: '未知题型', color: 'text-gray-500', bgColor: 'bg-gray-50' }
  }
}

export default function SceneTest() {
  const params = useParams<{ id: string; testId: string }>()
  const id = params.id || ''
  const testId = params.testId || ''

  const [scene, setScene] = useState<Scene | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [currentTest, setCurrentTest] = useState<Test | null>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [prevTest, setPrevTest] = useState<Test | null>(null)
  const [nextTest, setNextTest] = useState<Test | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [isAnswered, setIsAnswered] = useState(false)

  const [qaAnswer, setQaAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [qaEvaluation, setQaEvaluation] = useState<QAEvaluation | null>(null)
  const [recognition, setRecognition] = useState<any>(null)
  const [fillBlankAnswer, setFillBlankAnswer] = useState('')
  const [fillBlankInputMode, setFillBlankInputMode] = useState<'text' | 'voice'>('text')
  const [fillBlankEvaluation, setFillBlankEvaluation] = useState<{
    isCorrect: boolean
    analysis: string
    suggestions: string[]
  } | null>(null)

  const getSceneById = async (sceneId: string): Promise<Scene> => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`)
      let scene: Scene
      if (response.ok) {
        scene = await response.json()
      } else {
        scene = {
          id: sceneId,
          name: '初次见面',
          category: '日常交流',
          description: '学习日常问候语',
          difficulty: '初级',
          coverImage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      return scene
    } catch (error) {
      return {
        id: sceneId,
        name: '初次见面',
        category: '日常交流',
        description: '学习日常问候语',
        difficulty: '初级',
        coverImage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  const getSceneTests = async (sceneId: string): Promise<Test[]> => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}/tests`)
      let tests: Test[] = []
      if (response.ok) {
        tests = await response.json()
      } else {
        tests = [
          {
            id: 'test_1',
            sceneId: sceneId,
            type: 'multiple-choice',
            question: '当别人问你 "How are you doing?" 时，下面哪个回答最自然？',
            options: [
              "I'm doing great, thanks!",
              "I am fine thank you.",
              "Yes, I am.",
              "How about you?"
            ],
            answer: "I'm doing great, thanks!",
            analysis: '这是回答"How are you doing?"最自然的方式。',
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
      return tests.sort((a, b) => a.order - b.order)
    } catch (error) {
      return [
        {
          id: 'test_1',
          sceneId: sceneId,
          type: 'multiple-choice',
          question: '当别人问你 "How are you doing?" 时，下面哪个回答最自然？',
          options: [
            "I'm doing great, thanks!",
            "I am fine thank you.",
            "Yes, I am.",
            "How about you?"
          ],
          answer: "I'm doing great, thanks!",
          analysis: '这是回答"How are you doing?"最自然的方式。',
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
  }

  const handleOptionClick = (option: string) => {
    setSelectedOption(option)
    setIsAnswered(true)
  }

  const handleFillBlankSubmit = async () => {
    if (!fillBlankAnswer.trim() || !currentTest) return
    setIsEvaluating(true)
    setIsAnswered(true)
    try {
      const response = await fetch('/api/fill-blank/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentTest.question,
          userAnswer: fillBlankAnswer,
          correctAnswer: currentTest.answer,
        }),
      })
      if (!response.ok) throw new Error('评测失败')
      const data = await response.json()
      setFillBlankEvaluation({
        isCorrect: data.isCorrect || false,
        analysis: data.analysis || '评测完成',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      setFillBlankEvaluation({
        isCorrect: fillBlankAnswer.toLowerCase().trim() === currentTest.answer.toLowerCase().trim(),
        analysis: '回答已提交，请参考正确答案。',
        suggestions: ['对比你的答案和参考答案', '注意语法和词汇的使用']
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQaAnswer(transcript)
        setIsRecording(false)
        evaluateQAAnswer(transcript)
      }
      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)
      setRecognition(rec)
    }
  }, [currentTest])

  const toggleRecording = () => {
    if (!recognition) {
      alert('您的浏览器不支持语音识别功能')
      return
    }
    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
    } else {
      setQaAnswer('')
      setQaEvaluation(null)
      recognition.start()
      setIsRecording(true)
    }
  }

  const evaluateQAAnswer = async (answer: string) => {
    if (!currentTest) return
    setIsEvaluating(true)
    setIsAnswered(true)
    try {
      const response = await fetch('/api/open-test/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentTest.question,
          userAnswer: answer,
          correctAnswer: currentTest.answer,
          sceneId: id,
          testId: testId,
          evaluationType: 'qa'
        }),
      })
      if (!response.ok) throw new Error('评测失败')
      const data = await response.json()
      setQaEvaluation({
        score: data.score || 0,
        feedback: data.feedback || '评测完成',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      setQaEvaluation({
        score: 70,
        feedback: '回答基本正确，但可以更完整一些。',
        suggestions: ['尝试使用更完整的句子', '注意语法结构']
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const resetAnswerState = () => {
    setSelectedOption('')
    setIsAnswered(false)
    setQaAnswer('')
    setQaEvaluation(null)
    setFillBlankAnswer('')
    setFillBlankInputMode('text')
    setFillBlankEvaluation(null)
    setIsRecording(false)
    setIsEvaluating(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setNotFound(false)
        resetAnswerState()
        if (id && testId) {
          const sceneData = await getSceneById(id)
          setScene(sceneData)
          const testsData = await getSceneTests(id)
          setTests(testsData)
          const currentTestData = testsData.find(test => test.id === testId)
          if (currentTestData) {
            setCurrentTest(currentTestData)
            const index = testsData.findIndex(test => test.id === testId)
            setCurrentIndex(index)
            const prev = index > 0 ? testsData[index - 1] : null
            const next = index < testsData.length - 1 ? testsData[index + 1] : null
            setPrevTest(prev)
            setNextTest(next)
          } else {
            setNotFound(true)
          }
        } else {
          setNotFound(true)
        }
      } catch (error) {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id, testId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA]">
        <main className="max-w-[430px] mx-auto px-4 pt-6 pb-10">
          <LoadingSpinner message="正在加载测试题目..." subMessage="请稍候，正在准备您的学习内容" variant="primary" />
        </main>
      </div>
    )
  }

  if (notFound || !currentTest) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-[#6B7280] mb-4 text-sm">暂无测试题</p>
          <Link href="/scenes">
            <button className="bg-[#4F7CF0] text-white rounded-full px-6 py-2.5 text-sm font-medium">
              返回场景列表
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const questionType = getQuestionTypeLabel(currentTest.type)
  const progress = ((currentIndex + 1) / tests.length) * 100

  const handleOpenTestComplete = () => {
    if (nextTest) {
      window.location.href = `/scene-test/${id}/${nextTest.id}`
    } else {
      window.location.href = `/scene-detail/${id}`
    }
  }

  const canGoNext = isAnswered

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-[430px] mx-auto">
        <main className="px-4 pt-6 pb-10">
          {/* 开放题测试使用对话框组件 */}
          {currentTest.type === 'open' ? (
            <OpenTestDialog
              sceneId={id}
              testId={testId}
              testQuestion={currentTest.question}
              currentIndex={currentIndex}
              totalTests={tests.length}
              onComplete={handleOpenTestComplete}
              autoStart={true}
            />
          ) : (
            <>
              {/* 顶部返回按钮和进度 - 匹配原型图 */}
              <div className="flex items-center gap-3 mb-6">
                {/* 返回按钮 */}
                <Link href={`/scene-detail/${id}`} className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Link>
                {/* 场景名称和进度 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[#1F2937]">{scene?.name || '场景测试'}</span>
                    <span className="text-sm text-[#9CA3AF]">{currentIndex + 1} / {tests.length}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 题型标签和问题卡片 - 匹配原型图 */}
              <section className="mb-5">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  {/* 题型标签和音量图标 */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${questionType.bgColor} ${questionType.color}`}>
                      {questionType.label}
                    </span>
                    <button className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-[#4F7CF0] transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    </button>
                  </div>
                  {/* 问题文字 */}
                  <h2 className="text-[#1F2937] text-base leading-relaxed mb-5">
                    {currentTest.question}
                  </h2>
                </div>
              </section>

              {/* 选择题选项 - 匹配原型图样式 */}
              {currentTest.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentTest.options?.map((option, index) => {
                    const isSelected = selectedOption === option
                    const isCorrect = isAnswered && option === currentTest.answer
                    const isIncorrect = isAnswered && isSelected && option !== currentTest.answer
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className={`w-full text-left px-4 py-4 rounded-2xl text-sm border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? isCorrect
                              ? 'bg-green-50 border-[#34D399]'
                              : isIncorrect
                                ? 'bg-red-50 border-red-400'
                                : 'bg-[#EEF2FF] border-[#4F7CF0]'
                            : isCorrect
                              ? 'bg-green-50 border-[#34D399]'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#4F7CF0]/50'
                        }`}
                        onClick={() => !isAnswered && handleOptionClick(option)}
                        disabled={isAnswered}
                      >
                        {/* 字母圆圈 */}
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                          isSelected || isCorrect
                            ? 'bg-[#4F7CF0] text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        {/* 选项文字 */}
                        <span className={`flex-1 ${isSelected ? 'font-medium' : ''}`}>
                          {option}
                        </span>
                        {/* 对勾或叉号图标 */}
                        {isAnswered && (
                          <span className="shrink-0">
                            {option === currentTest.answer ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : isSelected ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            ) : null}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {/* 填空题 */}
              {currentTest.type === 'fill-blank' && (
                <div className="space-y-5">
                  {!isAnswered && (
                    <div className="flex justify-center mb-4">
                      <div className="inline-flex bg-gray-100 p-1 rounded-full w-full max-w-xs">
                        <button
                          onClick={() => setFillBlankInputMode('text')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            fillBlankInputMode === 'text'
                              ? 'bg-white text-[#F59E0B] shadow-sm'
                              : 'text-[#6B7280]'
                          }`}
                        >
                          <i className="fas fa-pencil"></i>
                          文字输入
                        </button>
                        <button
                          onClick={() => setFillBlankInputMode('voice')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            fillBlankInputMode === 'voice'
                              ? 'bg-white text-[#F59E0B] shadow-sm'
                              : 'text-[#6B7280]'
                          }`}
                        >
                          <i className="fas fa-microphone"></i>
                          语音输入
                        </button>
                      </div>
                    </div>
                  )}

                  {fillBlankInputMode === 'text' && !isAnswered && (
                    <div className="relative">
                      <textarea
                        className="w-full p-4 border-2 border-[#4F7CF0] rounded-2xl focus:border-[#4F7CF0] focus:outline-none transition-all resize-none text-[#1F2937] text-sm bg-white min-h-[100px]"
                        rows={3}
                        placeholder="请填入正确答案..."
                        value={fillBlankAnswer}
                        onChange={(e) => setFillBlankAnswer(e.target.value)}
                        disabled={isAnswered}
                      />
                    </div>
                  )}

                  {fillBlankInputMode === 'voice' && !isAnswered && (
                    <div className="flex flex-col items-center py-6">
                      <div className="relative">
                        {isRecording && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-[#F59E0B] animate-ping opacity-20"></div>
                            <div className="absolute -inset-4 rounded-full bg-[#F59E0B] animate-pulse opacity-10"></div>
                          </>
                        )}
                        <button
                          onClick={toggleRecording}
                          disabled={isEvaluating}
                          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                            isRecording
                              ? 'bg-[#EF4444] text-white'
                              : 'bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white'
                          } disabled:opacity-50`}
                        >
                          <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-2xl`}></i>
                        </button>
                      </div>
                      <p className={`text-sm mt-4 ${
                        isRecording ? 'text-[#EF4444]' : 'text-[#6B7280]'
                      }`}>
                        {isRecording ? '正在录音，点击停止' : '点击按钮开始语音回答'}
                      </p>
                    </div>
                  )}

                  {fillBlankAnswer && !isAnswered && (
                    <div className="bg-[#FFF8EE] rounded-2xl p-4 border border-[#F59E0B]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-[#92400E]">你的回答</span>
                      </div>
                      <p className="text-[#1F2937] text-sm">{fillBlankAnswer}</p>
                    </div>
                  )}

                  {/* 提示信息 */}
                  {!isAnswered && (
                    <div className="bg-[#FFF8EE] rounded-2xl p-4 border border-[#F59E0B]/20 mb-4">
                      <div className="flex items-start gap-2">
                        <i className="fas fa-lightbulb text-[#F59E0B] mt-0.5 shrink-0"></i>
                        <p className="text-sm text-[#92400E]">
                          初次见面时说 "Nice to meet you!" 表示很高兴认识对方。
                        </p>
                      </div>
                    </div>
                  )}

                  {!isAnswered && fillBlankAnswer.trim() && !isEvaluating && (
                    <motion.button
                      onClick={handleFillBlankSubmit}
                      className="w-full py-3.5 bg-[#4F7CF0] text-white rounded-2xl font-medium text-sm transition-all"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      提交答案
                    </motion.button>
                  )}

                  {isEvaluating && (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-sm text-[#6B7280]">AI 正在评测...</p>
                    </div>
                  )}

                  {isAnswered && fillBlankEvaluation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl overflow-hidden ${
                        fillBlankEvaluation.isCorrect
                          ? 'bg-[#F0FFF4] border border-[#34D399]'
                          : 'bg-[#FFF8EE] border border-[#F59E0B]/30'
                      }`}
                    >
                      <div className={`px-4 py-3 ${
                        fillBlankEvaluation.isCorrect ? 'bg-[#34D399]' : 'bg-[#F59E0B]'
                      }`}>
                        <div className="flex items-center gap-2">
                          <i className={`fas ${fillBlankEvaluation.isCorrect ? 'fa-check' : 'fa-lightbulb'} text-white`}></i>
                          <span className="text-white font-medium text-sm">
                            {fillBlankEvaluation.isCorrect ? '回答正确！' : '还可以更好'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="bg-white/60 rounded-lg p-3">
                          <h5 className="text-xs font-medium text-[#6B7280] mb-1">AI 分析</h5>
                          <p className="text-[#1F2937] text-sm">{fillBlankEvaluation.analysis}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <h5 className="text-xs font-medium text-[#6B7280] mb-1">参考答案</h5>
                          <p className="text-[#1F2937] text-sm font-medium">{currentTest.answer}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* 问答题 */}
              {currentTest.type === 'qa' && (
                <div className="space-y-4">
                  <div className="flex justify-center py-6">
                    <div className="relative">
                      {isRecording && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-[#34D399] animate-ping opacity-20"></div>
                          <div className="absolute -inset-4 rounded-full bg-[#34D399] animate-pulse opacity-10"></div>
                        </>
                      )}
                      <button
                        onClick={toggleRecording}
                        disabled={isEvaluating}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isRecording
                            ? 'bg-[#EF4444] text-white'
                            : 'bg-gradient-to-r from-[#34D399] to-[#10B981] text-white'
                        } disabled:opacity-50`}
                      >
                        <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-2xl`}></i>
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-sm text-[#6B7280]">
                    {isRecording ? '点击停止录音' : '点击开始语音回答'}
                  </p>

                  {qaAnswer && (
                    <div className="p-4 bg-[#F0FFF4] rounded-2xl border border-[#34D399]/20">
                      <h4 className="text-xs font-medium text-[#065F46] mb-2">你的回答</h4>
                      <p className="text-[#1F2937] text-sm">{qaAnswer}</p>
                    </div>
                  )}

                  {isEvaluating && (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-8 h-8 border-2 border-[#4F7CF0] border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-sm text-[#6B7280]">AI 正在评测...</p>
                    </div>
                  )}

                  {qaEvaluation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border ${
                        qaEvaluation.score >= 80
                          ? 'bg-[#F0FFF4] border-[#34D399]'
                          : qaEvaluation.score >= 60
                            ? 'bg-[#FFF8EE] border-[#F59E0B]/30'
                            : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[#1F2937]">评测结果</span>
                        <span className={`text-lg font-bold ${
                          qaEvaluation.score >= 80 ? 'text-[#34D399]' : qaEvaluation.score >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}>
                          {qaEvaluation.score}分
                        </span>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-3">{qaEvaluation.feedback}</p>
                      {qaEvaluation.suggestions.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-[#6B7280] mb-2">改进建议：</h5>
                          <ul className="space-y-1">
                            {qaEvaluation.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-[#6B7280] flex items-start gap-2">
                                <span className="text-[#F59E0B]">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* 错误反馈卡片 - 仅在选择题答错时显示 */}
              {currentTest.type === 'multiple-choice' && isAnswered && selectedOption !== currentTest.answer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-1">回答错误</h4>
                      <p className="text-xs text-red-600">{currentTest.analysis}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 导航按钮 */}
              <section className="flex justify-between mt-7 gap-3">
                <Link
                  href={prevTest ? `/scene-test/${id}/${prevTest.id}` : '#'}
                  className={`py-3.5 px-5 rounded-2xl font-medium text-sm flex-1 text-center transition-all ${
                    prevTest
                      ? 'bg-white text-[#1F2937] border border-gray-200'
                      : 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  上一题
                </Link>
                {canGoNext && !isEvaluating ? (
                  <Link
                    href={nextTest ? `/scene-test/${id}/${nextTest.id}` : `/scene-detail/${id}`}
                    className={`py-3.5 px-5 rounded-2xl font-medium text-sm flex-1 text-center transition-all ${
                      nextTest
                        ? 'bg-white text-[#1F2937] border border-gray-200'
                        : 'bg-[#4F7CF0] text-white'
                    }`}
                  >
                    {nextTest ? '下一题' : '提交'}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="py-3.5 px-5 rounded-2xl font-medium text-sm flex-1 text-center bg-gray-200 text-gray-400 cursor-not-allowed"
                  >
                    {isEvaluating ? '评测中...' : nextTest ? '下一题' : '提交'}
                  </button>
                )}
              </section>

              {!isAnswered && !isEvaluating && (
                <p className="text-center text-xs text-[#9CA3AF] mt-4">
                  请先完成本题作答
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
