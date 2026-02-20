'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import OpenTestDialog from './OpenTestDialog'
import LoadingSpinner from './components/LoadingSpinner'
import {
  ArrowLeft,
  Mic,
  Check,
  X,
  Loader2,
} from 'lucide-react'

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

interface TestResult {
  isCorrect: boolean
  score: number
  analysis: string
  suggestion: string
  userAnswer: string
  correctAnswer: string
}

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'multiple-choice':
      return { label: '选择题', color: 'bg-[#EEF2FF] text-[#4F7CF0]' }
    case 'fill-blank':
      return { label: '填空题', color: 'bg-[#FFF8EE] text-[#F59E0B]' }
    case 'open':
      return { label: '开放题', color: 'bg-[#FFF0F5] text-[#EC4899]' }
    case 'qa':
      return { label: '问答题', color: 'bg-[#F0FFF4] text-[#34D399]' }
    default:
      return { label: '未知题型', color: 'bg-gray-50 text-gray-500' }
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
  const [fillBlankEvaluation, setFillBlankEvaluation] = useState<TestResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
          },
          {
            id: 'test_2',
            sceneId: sceneId,
            type: 'fill-blank',
            question: '请完成这句打招呼的话："Nice to ____ you! I\'m Tom."',
            answer: 'meet',
            analysis: '"Nice to meet you!" 是初次见面时的常用问候语。',
            order: 2,
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
    setAnswers({ ...answers, [currentTest?.id || '']: option })
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || '评测失败')
      }
      const data = await response.json()
      const result: TestResult = {
        isCorrect: data.isCorrect || false,
        score: data.score || 0,
        analysis: data.analysis || '评测完成',
        suggestion: data.suggestions?.[0] || '继续努力！',
        userAnswer: fillBlankAnswer,
        correctAnswer: currentTest.answer
      }
      setFillBlankEvaluation(result)
      setTestResults({ ...testResults, [currentTest.id]: result })
    } catch (error) {
      alert(`GLM API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsAnswered(false)
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
        setFillBlankAnswer(transcript)
        if (currentTest?.type === 'qa') {
          setAnswers({ ...answers, [currentTest.id]: transcript })
        } else if (currentTest?.type === 'fill-blank') {
          setAnswers({ ...answers, [currentTest.id]: transcript })
        }
        setIsRecording(false)
        if (currentTest?.type === 'qa') {
          evaluateQAAnswer(transcript)
        } else if (currentTest?.type === 'fill-blank') {
          handleFillBlankSubmit()
        }
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
      setFillBlankAnswer('')
      setQaEvaluation(null)
      setFillBlankEvaluation(null)
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || '评测失败')
      }
      const data = await response.json()
      setQaEvaluation({
        score: data.score || 0,
        feedback: data.feedback || '评测完成',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      alert(`GLM API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsAnswered(false)
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
    setAnswers({})
    setTestResults({})
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
  const hasResult = testResults[currentTest.id] !== undefined
  const hasAnswered = answers[currentTest.id] !== undefined && answers[currentTest.id] !== ''

  const handleOpenTestComplete = () => {
    if (nextTest) {
      window.location.href = `/scene-test/${id}/${nextTest.id}`
    } else {
      window.location.href = `/scene-detail/${id}`
    }
  }

  const handleNext = () => {
    if (nextTest) {
      window.location.href = `/scene-test/${id}/${nextTest.id}`
    } else {
      window.location.href = `/scene-detail/${id}`
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-6">
      <div className="max-w-[430px] mx-auto px-4 pt-6">
        {/* Back + Progress */}
        <div className="flex items-center gap-3 mb-5">
          <Link href={`/scene-detail/${id}`}>
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
              <ArrowLeft className="h-4 w-4 text-gray-500" />
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                题目 {currentIndex + 1} / {tests.length}
              </span>
              <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTest.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4"
          >
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${questionType.color}`}>
              {questionType.label}
            </span>

            <h3 className="text-gray-800 mt-4 mb-5 leading-relaxed">
              {currentTest.question}
            </h3>

            {/* Choice */}
            {currentTest.type === 'multiple-choice' && (
              <div className="space-y-2.5">
                {currentTest.options?.map((option, idx) => {
                  const isSelected = answers[currentTest.id] === option
                  return (
                    <button
                      key={idx}
                      onClick={() => !hasResult && handleOptionClick(option)}
                      disabled={hasResult}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm border-2 transition-all flex items-center gap-3 ${
                        isSelected && hasResult
                          ? testResults[currentTest.id]?.isCorrect
                            ? 'border-[#34D399] bg-[#F0FFF4] text-gray-700'
                            : 'border-red-400 bg-red-50 text-gray-700'
                          : isSelected
                          ? 'border-[#4F7CF0] bg-[#EEF2FF] text-gray-700'
                          : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-[#4F7CF0]'
                      }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isSelected ? 'bg-[#4F7CF0] text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Fill Blank */}
            {currentTest.type === 'fill-blank' && (
              <div className="space-y-4">
                {!hasResult && (
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

                {fillBlankInputMode === 'text' && !hasResult && (
                  <div className="relative">
                    <textarea
                      placeholder="请填入正确答案..."
                      value={fillBlankAnswer}
                      onChange={(e) => {
                        setFillBlankAnswer(e.target.value)
                        if (e.target.value.trim()) {
                          setAnswers({ ...answers, [currentTest.id]: e.target.value })
                        } else {
                          const newAnswers = { ...answers }
                          delete newAnswers[currentTest.id]
                          setAnswers(newAnswers)
                        }
                      }}
                      disabled={hasResult}
                      className="w-full p-4 border-2 border-[#4F7CF0] rounded-2xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#4F7CF0] transition-colors resize-none min-h-[100px] placeholder:text-gray-400"
                    />
                  </div>
                )}

                {fillBlankInputMode === 'voice' && !hasResult && (
                  <div className="flex flex-col items-center py-6">
                    <button
                      onClick={toggleRecording}
                      disabled={hasResult || isRecording}
                      className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl border transition-all ${
                        isRecording
                          ? 'bg-red-50 border-red-200 text-red-500'
                          : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-[#4F7CF0] hover:text-[#4F7CF0]'
                      }`}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                      {isRecording ? '正在录音...' : '语音输入'}
                    </button>
                  </div>
                )}

                {/* 提示信息 */}
                {!hasResult && (
                  <div className="bg-[#FFF8EE] rounded-2xl p-4 border border-[#F59E0B]/20 mb-4">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-lightbulb text-[#F59E0B] mt-0.5 shrink-0"></i>
                      <p className="text-sm text-[#92400E]">
                        初次见面时说 "Nice to meet you!" 表示很高兴认识对方。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QA */}
            {currentTest.type === 'qa' && (
              <div className="space-y-4">
                <textarea
                  placeholder="请输入你的答案..."
                  value={qaAnswer}
                  onChange={(e) => {
                    setQaAnswer(e.target.value)
                    if (e.target.value.trim()) {
                      setAnswers({ ...answers, [currentTest.id]: e.target.value })
                    } else {
                      const newAnswers = { ...answers }
                      delete newAnswers[currentTest.id]
                      setAnswers(newAnswers)
                    }
                  }}
                  disabled={hasResult}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#4F7CF0] transition-colors resize-none min-h-[100px] placeholder:text-gray-400"
                />
                <button
                  onClick={toggleRecording}
                  disabled={hasResult || isRecording}
                  className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl border transition-all ${
                    isRecording
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-[#4F7CF0] hover:text-[#4F7CF0]'
                  }`}
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  {isRecording ? '正在录音...' : '语音输入'}
                </button>
              </div>
            )}

            {/* Open Conversation */}
            {currentTest.type === 'open' && (
              <OpenTestDialog
                sceneId={id}
                testId={testId}
                testQuestion={currentTest.question}
                currentIndex={currentIndex}
                totalTests={tests.length}
                onComplete={handleOpenTestComplete}
                autoStart={true}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className={`rounded-2xl p-4 mb-4 border ${
                testResults[currentTest.id]?.isCorrect
                  ? 'bg-[#F0FFF4] border-[#A7F3D0]'
                  : 'bg-[#FFF5F5] border-[#FCA5A5]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    testResults[currentTest.id]?.isCorrect ? 'bg-[#34D399]' : 'bg-red-400'
                  }`}
                >
                  {testResults[currentTest.id]?.isCorrect ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <X className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">
                    {testResults[currentTest.id]?.isCorrect ? '回答正确！' : '回答错误'} {
                      testResults[currentTest.id]?.score !== undefined && (
                        <span className="text-sm font-normal text-gray-500">
                          得分：{testResults[currentTest.id].score}
                        </span>
                      )
                    }
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{testResults[currentTest.id]?.analysis}</p>
                  {!testResults[currentTest.id]?.isCorrect && (
                    <div className="text-sm">
                      <span className="text-gray-500">参考答案：</span>
                      <span className="font-medium text-gray-700">{testResults[currentTest.id]?.correctAnswer}</span>
                    </div>
                  )}
                  <div className="mt-2 bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-500">
                    💡 {testResults[currentTest.id]?.suggestion}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!hasResult && hasAnswered && currentTest.type !== 'open' && (
            <button
              className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium disabled:opacity-50"
              onClick={() => {
                if (currentTest.type === 'fill-blank') {
                  handleFillBlankSubmit()
                } else if (currentTest.type === 'multiple-choice') {
                  const selectedAnswer = answers[currentTest.id]
                  const isCorrect = selectedAnswer === currentTest.answer
                  const result: TestResult = {
                    isCorrect,
                    score: isCorrect ? 100 : 0,
                    analysis: currentTest.analysis,
                    suggestion: isCorrect ? '继续努力！' : '请再仔细思考一下。',
                    userAnswer: selectedAnswer,
                    correctAnswer: currentTest.answer
                  }
                  setTestResults({ ...testResults, [currentTest.id]: result })
                } else if (currentTest.type === 'qa') {
                  evaluateQAAnswer(qaAnswer)
                }
              }}
              disabled={isEvaluating}
            >
              提交答案
            </button>
          )}
          {hasResult && (
            <button
              className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium"
              onClick={handleNext}
            >
              {nextTest ? '下一题 →' : '返回场景'}
            </button>
          )}
        </div>

        {/* Explanation hint */}
        {currentTest.type === 'fill-blank' && !hasResult && (
          <div className="mt-4 bg-[#FFF8EE] rounded-2xl p-3 text-xs text-[#92400E]">
            <span className="font-medium">提示：</span> 尝试填入正确的单词。
          </div>
        )}
      </div>

      {/* AI Evaluating Overlay */}
      <AnimatePresence>
        {isEvaluating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center mx-6 shadow-xl"
            >
              <Loader2 className="h-12 w-12 animate-spin text-[#4F7CF0] mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-1">AI 正在评测...</h3>
              <p className="text-sm text-gray-400">请稍候片刻</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
