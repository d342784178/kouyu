'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

// 选择题内容
interface ChoiceContent {
  question: string
  options: string[]
  correct_answer: number
  analysis: string
}

// 问答题参考答案
interface ReferenceAnswer {
  text: string
  style: 'casual' | 'neutral' | 'formal'
  description: string
}

// 问答题内容
interface QAContent {
  question: string
  reference_answers: ReferenceAnswer[]
  analysis: string
}

// 开放式对话角色
interface Role {
  name: string
  description: string
  is_user: boolean
}

// 开放式对话内容
interface OpenDialogueContent {
  topic: string
  description: string
  roles: Role[]
  scenario_context: string
  suggested_opening: string
  analysis: string
}

// 测试题目类型
interface Test {
  id: string
  sceneId: string
  type: 'choice' | 'qa' | 'open_dialogue'
  order: number
  content: ChoiceContent | QAContent | OpenDialogueContent
  createdAt: string
  updatedAt: string
}

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

interface QAEvaluation {
  score: number
  feedback: string
  suggestions: string[]
}

interface TestResult {
  isCorrect: boolean
  score: number
  analysis: string
  suggestions: string[]
  userAnswer: string
  correctAnswer: string
}

// 类型守卫函数
function isChoiceContent(content: any): content is ChoiceContent {
  return content && 'options' in content && 'correct_answer' in content
}

function isQAContent(content: any): content is QAContent {
  return content && 'reference_answers' in content
}

function isOpenDialogueContent(content: any): content is OpenDialogueContent {
  return content && 'topic' in content && 'roles' in content
}

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'choice':
      return { label: '选择题', color: 'bg-[#EEF2FF] text-[#4F7CF0]' }
    case 'qa':
      return { label: '问答题', color: 'bg-[#F0FFF4] text-[#34D399]' }
    case 'open_dialogue':
      return { label: '开放题', color: 'bg-[#FFF0F5] text-[#EC4899]' }
    default:
      return { label: '未知题型', color: 'bg-gray-50 text-gray-500' }
  }
}

export default function SceneTest() {
  const params = useParams<{ id: string; testId: string }>()
  const router = useRouter()
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
      }
      return tests.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error(`Error fetching tests for scene ${sceneId}:`, error)
      return []
    }
  }

  const handleOptionClick = (option: string, optionIndex: number) => {
    if (!currentTest || hasResult) return
    
    setSelectedOption(option)
    setAnswers({ ...answers, [currentTest.id]: option })
    setIsAnswered(true)
    
    // 选择题直接提交答案
    const content = currentTest.content as ChoiceContent
    const isCorrect = optionIndex === content.correct_answer
    const result: TestResult = {
      isCorrect,
      score: isCorrect ? 100 : 0,
      analysis: content.analysis,
      suggestions: isCorrect ? ['继续努力！'] : ['请再仔细思考一下。'],
      userAnswer: option,
      correctAnswer: content.options[content.correct_answer]
    }
    setTestResults({ ...testResults, [currentTest.id]: result })
  }

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
      const content = currentTest.content as QAContent
      // 使用 /api/fill-blank/evaluate 接口进行问答题评测
      const response = await fetch('/api/fill-blank/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content.question,
          userAnswer: answer,
          referenceAnswers: content.reference_answers
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || '评测失败')
      }
      const data = await response.json()
      
      // 设置测试结果
      const result: TestResult = {
        isCorrect: data.isCorrect || false,
        score: data.isCorrect ? 100 : 0,
        analysis: data.analysis || '评测完成',
        suggestions: data.suggestions || ['继续努力！'],
        userAnswer: answer,
        correctAnswer: content.reference_answers[0]?.text || ''
      }
      setTestResults({ ...testResults, [currentTest.id]: result })
    } catch (error) {
      alert(`评测失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
    setIsRecording(false)
    setIsEvaluating(false)
    setAnswers({})
    setTestResults({})
  }

  // 使用 localStorage 缓存避免重复调用
  const isFetching = useRef(false)

  // 获取场景数据和测试列表
  useEffect(() => {
    const fetchSceneAndTests = async () => {
      if (!id || isFetching.current) return
      
      // 检查 localStorage 缓存
      const cachedData = localStorage.getItem(`scene_${id}`)
      if (cachedData) {
        console.log('Using localStorage cached data for id:', id)
        const { scene, tests } = JSON.parse(cachedData)
        setScene(scene)
        setTests(tests)
        // 不要在这里设置 isLoading，让第二个 useEffect 处理
        return
      }
      
      try {
        isFetching.current = true
        setIsLoading(true)
        setNotFound(false)
        
        console.log('Fetching scene and tests for id:', id)
        const sceneData = await getSceneById(id)
        const testsData = await getSceneTests(id)
        
        // 存入 localStorage 缓存
        const cacheData = { scene: sceneData, tests: testsData }
        localStorage.setItem(`scene_${id}`, JSON.stringify(cacheData))
        
        setScene(sceneData)
        setTests(testsData)
      } catch (error) {
        setNotFound(true)
        setIsLoading(false)
      } finally {
        isFetching.current = false
      }
    }
    
    fetchSceneAndTests()
  }, [id])

  // 当测试列表或 testId 变化时，更新当前测试信息
  useEffect(() => {
    if (!testId) return
    
    // 如果测试列表为空，可能是数据还在加载中
    if (tests.length === 0) {
      // 检查是否已经有场景数据（从缓存加载的情况）
      if (scene) {
        // 有场景数据但没有测试数据，说明测试列表为空
        setNotFound(true)
        setIsLoading(false)
      }
      return
    }
    
    resetAnswerState()
    
    const currentTestData = tests.find(test => test.id === testId)
    if (currentTestData) {
      setCurrentTest(currentTestData)
      const index = tests.findIndex(test => test.id === testId)
      setCurrentIndex(index)
      const prev = index > 0 ? tests[index - 1] : null
      const next = index < tests.length - 1 ? tests[index + 1] : null
      setPrevTest(prev)
      setNextTest(next)
      setNotFound(false)
      setIsLoading(false)
    } else {
      setNotFound(true)
      setIsLoading(false)
    }
  }, [testId, tests, scene])

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
        setQaAnswer(transcript)
        if (currentTest?.type === 'qa') {
          setAnswers({ ...answers, [currentTest.id]: transcript })
        }
        setIsRecording(false)
        if (currentTest?.type === 'qa') {
          evaluateQAAnswer(transcript)
        }
      }
      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)
      setRecognition(rec)
    }
  }, [currentTest])

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
      router.push(`/scene-test/${id}/${nextTest.id}`)
    } else {
      router.push(`/scene-detail/${id}`)
    }
  }

  const handleNext = () => {
    if (nextTest) {
      router.push(`/scene-test/${id}/${nextTest.id}`)
    } else {
      router.push(`/scene-detail/${id}`)
    }
  }

  // 判断是否为开放题类型
  const isOpenTest = currentTest?.type === 'open_dialogue'
  
  // 获取当前题目内容
  const currentContent = currentTest.content
  
  return (
    <div className={`min-h-screen bg-[#F5F6FA] ${isOpenTest ? 'pb-0' : 'pb-6'}`}>
      <div className={`max-w-[430px] mx-auto ${isOpenTest ? 'h-screen flex flex-col' : 'pt-6'}`}>
        {/* Back + Progress */}
        <div className={`flex items-center gap-3 mb-5 ${isOpenTest ? 'px-4 pt-6 shrink-0' : ''}`}>
          <button
            onClick={() => {
              if (prevTest) {
                router.push(`/scene-test/${id}/${prevTest.id}`)
              } else {
                router.push(`/scene-detail/${id}`)
              }
            }}
            className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100"
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
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
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden ${
              isOpenTest ? 'p-0 flex-1 flex flex-col min-h-0 mx-4' : 'p-5'
            }`}
          >
            {!isOpenTest && (
              <>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${questionType.color}`}>
                  {questionType.label}
                </span>

                <h3 className="text-gray-800 mt-4 mb-5 leading-relaxed">
                  {isChoiceContent(currentContent) && currentContent.question}
                  {isQAContent(currentContent) && currentContent.question}
                </h3>
              </>
            )}

            {/* Choice */}
            {currentTest.type === 'choice' && isChoiceContent(currentContent) && (
              <div className="space-y-2.5">
                {currentContent.options.map((option, idx) => {
                  const isSelected = answers[currentTest.id] === option
                  const isCorrectAnswer = idx === currentContent.correct_answer
                  return (
                    <button
                      key={idx}
                      onClick={() => !hasResult && handleOptionClick(option, idx)}
                      disabled={hasResult}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm border-2 transition-all flex items-center gap-3 ${
                        isSelected && hasResult
                          ? isCorrectAnswer
                            ? 'border-[#34D399] bg-[#F0FFF4] text-gray-700'
                            : 'border-red-400 bg-red-50 text-gray-700'
                          : hasResult && isCorrectAnswer
                          ? 'border-[#34D399] bg-[#F0FFF4] text-gray-700'
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

            {/* QA */}
            {currentTest.type === 'qa' && isQAContent(currentContent) && (
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
                
                {/* 显示参考答案 */}
                {hasResult && (
                  <div className="mt-4 bg-[#F0FFF4] rounded-2xl p-4 border border-[#A7F3D0]">
                    <p className="text-sm font-medium text-gray-800 mb-2">参考答案：</p>
                    {currentContent.reference_answers.map((answer, idx) => (
                      <div key={idx} className="mb-2 last:mb-0">
                        <p className="text-sm text-gray-700">{answer.text}</p>
                        <p className="text-xs text-gray-500">{answer.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Open Conversation */}
            {currentTest.type === 'open_dialogue' && isOpenDialogueContent(currentContent) && (
              <OpenTestDialog
                sceneId={id}
                testId={testId}
                testContent={currentContent}
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
          {hasResult && currentTest.type !== 'open_dialogue' && (
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
                    {testResults[currentTest.id]?.isCorrect ? '回答正确！' : '回答错误'}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{testResults[currentTest.id]?.analysis}</p>
                  {!testResults[currentTest.id]?.isCorrect && currentTest.type === 'choice' && (
                    <div className="text-sm">
                      <span className="text-gray-500">正确答案：</span>
                      <span className="font-medium text-gray-700">{testResults[currentTest.id]?.correctAnswer}</span>
                    </div>
                  )}
                  {/* 显示所有改进建议 */}
                  {testResults[currentTest.id]?.suggestions && testResults[currentTest.id].suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {testResults[currentTest.id].suggestions.map((suggestion, idx) => (
                        <div key={idx} className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-500">
                          💡 {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        {currentTest.type !== 'open_dialogue' && (
          <div className="flex gap-3">
            {/* 问答题显示提交按钮 */}
            {!hasResult && hasAnswered && currentTest.type === 'qa' && (
              <button
                className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium disabled:opacity-50"
                onClick={() => evaluateQAAnswer(qaAnswer)}
                disabled={isEvaluating}
              >
                提交答案
              </button>
            )}
            {/* 已答题显示下一题按钮 */}
            {hasResult && (
              <button
                className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium"
                onClick={handleNext}
              >
                {nextTest ? '下一题 →' : '返回场景'}
              </button>
            )}
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
