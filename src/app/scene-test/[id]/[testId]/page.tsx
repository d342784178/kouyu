'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import OpenTestDialog from './OpenTestDialog'
import LoadingSpinner from './components/LoadingSpinner'
import QuestionTypeCard from './components/QuestionTypeCard'
import ProgressBar from './components/ProgressBar'

// 定义场景类型
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

// 定义测试题目类型
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

// 问答题评测结果
interface QAEvaluation {
  score: number
  feedback: string
  suggestions: string[]
}

// 获取题型说明
const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'multiple-choice':
      return { label: '选择题', description: '选择正确的答案', icon: 'fa-list-ul', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', gradient: 'from-blue-500 to-cyan-500' }
    case 'fill-blank':
      return { label: '填空题', description: '请根据题目进行完整回答', icon: 'fa-edit', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', gradient: 'from-amber-500 to-orange-500' }
    case 'open':
      return { label: '开放题', description: '与AI进行对话练习', icon: 'fa-comments', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', gradient: 'from-purple-500 to-pink-500' }
    case 'qa':
      return { label: '问答题', description: '语音回答问题', icon: 'fa-microphone', color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', gradient: 'from-rose-500 to-pink-500' }
    default:
      return { label: '未知题型', description: '', icon: 'fa-question', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', gradient: 'from-gray-500 to-gray-600' }
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

  // 问答题状态
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

  // 获取场景详情的函数
  const getSceneById = async (sceneId: string): Promise<Scene> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch(`/api/scenes/${sceneId}`)
      
      let scene: Scene
      
      if (response.ok) {
        scene = await response.json()
      } else {
        // 如果API调用失败，返回模拟数据
        scene = {
          id: sceneId,
          name: '机场值机',
          category: '旅行出行',
          description: '学习在机场办理值机手续的常用对话',
          difficulty: '中级',
          coverImage: 'https://via.placeholder.com/400x200',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      
      return scene
    } catch (error) {
      console.error(`Error fetching scene ${sceneId}:`, error)
      // 返回模拟数据
      return {
        id: sceneId,
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话',
        difficulty: '中级',
        coverImage: 'https://via.placeholder.com/400x200',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  // 获取场景测试题目的函数
  const getSceneTests = async (sceneId: string): Promise<Test[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch(`/api/scenes/${sceneId}/tests`)
      
      let tests: Test[] = []
      
      if (response.ok) {
        tests = await response.json()
      } else {
        // 如果API调用失败，返回模拟数据
        tests = [
          {
            id: 'test_1',
            sceneId: sceneId,
            type: 'multiple-choice',
            question: 'What would you say to check in for a flight?',
            options: [
              'Hello, I would like to check in for my flight.',
              'Hello, I want to buy a ticket.',
              'Hello, I need to cancel my flight.',
              'Hello, I lost my luggage.'
            ],
            answer: 'Hello, I would like to check in for my flight.',
            analysis: 'This is the correct phrase to use when you want to check in for your flight at the airport.',
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'test_2',
            sceneId: sceneId,
            type: 'fill-blank',
            question: 'If you prefer a window seat, you can say: "I would prefer a ______ seat if possible."',
            answer: 'window',
            analysis: 'The correct word is "window" to indicate you want a seat next to the window on the plane.',
            order: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'test_3',
            sceneId: sceneId,
            type: 'open',
            question: 'What information might the check-in agent ask for?',
            answer: 'The check-in agent might ask for your passport, ticket, and how many bags you are checking in.',
            analysis: 'These are common questions asked during the check-in process at the airport.',
            order: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
      
      // 按顺序排序测试题目
      return tests.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error(`Error fetching tests for scene ${sceneId}:`, error)
      // 返回模拟数据
      return [
        {
          id: 'test_1',
          sceneId: sceneId,
          type: 'multiple-choice',
          question: 'What would you say to check in for a flight?',
          options: [
            'Hello, I would like to check in for my flight.',
            'Hello, I want to buy a ticket.',
            'Hello, I need to cancel my flight.',
            'Hello, I lost my luggage.'
          ],
          answer: 'Hello, I would like to check in for my flight.',
          analysis: 'This is the correct phrase to use when you want to check in for your flight at the airport.',
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_2',
          sceneId: sceneId,
          type: 'fill-blank',
          question: 'If you prefer a window seat, you can say: "I would prefer a ______ seat if possible."',
          answer: 'window',
          analysis: 'The correct word is "window" to indicate you want a seat next to the window on the plane.',
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_3',
          sceneId: sceneId,
          type: 'open',
          question: 'What information might the check-in agent ask for?',
          answer: 'The check-in agent might ask for your passport, ticket, and how many bags you are checking in.',
          analysis: 'These are common questions asked during the check-in process at the airport.',
          order: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
  }

  // 处理选择题选项点击
  const handleOptionClick = (option: string) => {
    setSelectedOption(option)
    setIsAnswered(true)
  }

  // 处理填空题答案提交
  const handleFillBlankSubmit = async () => {
    if (!fillBlankAnswer.trim() || !currentTest) return

    setIsEvaluating(true)
    setIsAnswered(true)

    try {
      const response = await fetch('/api/fill-blank/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentTest.question,
          userAnswer: fillBlankAnswer,
          correctAnswer: currentTest.answer,
        }),
      })

      if (!response.ok) {
        throw new Error('评测失败')
      }

      const data = await response.json()
      setFillBlankEvaluation({
        isCorrect: data.isCorrect || false,
        analysis: data.analysis || '评测完成',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      console.error('填空题评测失败:', error)
      // 使用默认评测结果
      setFillBlankEvaluation({
        isCorrect: fillBlankAnswer.toLowerCase().trim() === currentTest.answer.toLowerCase().trim(),
        analysis: '回答已提交，请参考正确答案。',
        suggestions: ['对比你的答案和参考答案', '注意语法和词汇的使用']
      })
    } finally {
      setIsEvaluating(false)
    }
  }

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
        setIsRecording(false)
        // 自动开始评测
        evaluateQAAnswer(transcript)
      }
      
      rec.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        setIsRecording(false)
      }
      
      rec.onend = () => {
        setIsRecording(false)
      }
      
      setRecognition(rec)
    }
  }, [currentTest])

  // 开始/停止录音
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

  // 评测问答题答案
  const evaluateQAAnswer = async (answer: string) => {
    if (!currentTest) return
    
    setIsEvaluating(true)
    setIsAnswered(true)
    
    try {
      const response = await fetch('/api/open-test/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        throw new Error('评测失败')
      }
      
      const data = await response.json()
      setQaEvaluation({
        score: data.score || 0,
        feedback: data.feedback || '评测完成',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      console.error('评测失败:', error)
      // 使用默认评测结果
      setQaEvaluation({
        score: 70,
        feedback: '回答基本正确，但可以更完整一些。',
        suggestions: ['尝试使用更完整的句子', '注意语法结构']
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  // 重置答题状态
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

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setNotFound(false)
        // 重置答题状态
        resetAnswerState()
        
        if (id && testId) {
          // 获取场景信息
          const sceneData = await getSceneById(id)
          setScene(sceneData)
          
          // 获取测试题目
          const testsData = await getSceneTests(id)
          setTests(testsData)
          
          // 获取当前题目
          const currentTestData = testsData.find(test => test.id === testId)
          
          if (currentTestData) {
            setCurrentTest(currentTestData)
            
            // 获取当前题目索引
            const index = testsData.findIndex(test => test.id === testId)
            setCurrentIndex(index)
            
            // 获取上一题和下一题
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
        console.error('Error fetching test data:', error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, testId])
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header id="scene-test-header" className="bg-white px-6 py-4 shadow-sm sticky top-0 z-30">
          <div id="scene-test-header-content" className="flex items-center justify-between">
            <div className="w-8"></div>
            <h1 id="scene-test-title" className="text-xl font-bold text-text-primary">场景测试</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="mx-6 mt-6">
          <LoadingSpinner 
            message="正在加载测试题目..." 
            subMessage="请稍候，正在准备您的学习内容"
            variant="primary"
          />
        </main>
      </div>
    )
  }
  
  if (notFound || !currentTest) {
    return (
      <div id="test-not-found" className="flex items-center justify-center h-screen">
        <p className="text-text-secondary">测试题目未找到</p>
      </div>
    )
  }

  // 获取题型说明
  const questionType = getQuestionTypeLabel(currentTest.type)
  

  
  // 处理开放题测试完成
  const handleOpenTestComplete = () => {
    // 跳转到下一题或完成测试
    if (nextTest) {
      window.location.href = `/scene-test/${id}/${nextTest.id}`
    } else {
      window.location.href = `/scene-detail/${id}`
    }
  }

  // 检查是否可以进入下一页
  const canGoNext = isAnswered

  return (
    <div id="scene-test-content" className="pb-20">
      {/* 统一头部导航 */}
      <header id="scene-test-header" className="bg-white px-6 py-4 shadow-sm sticky top-0 z-30">
        <div id="scene-test-header-content" className="flex items-center justify-between">
          <Link
            href={`/scene-detail/${id}`}
            id="back-btn"
            className="w-10 h-10 flex items-center justify-center"
          >
            <i className="fas fa-arrow-left text-text-primary text-lg"></i>
          </Link>
          <h1 id="scene-test-title" className="text-lg font-semibold text-text-primary">场景测试</h1>
          <div className="w-10"></div> {/* 占位，保持标题居中 */}
        </div>
      </header>
      
      <main id="scene-test-main" className="mx-6 mt-6">
        {/* 统一进度条 */}
        <ProgressBar currentIndex={currentIndex} totalTests={tests.length} />

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
            {/* 统一题型说明卡片 */}
            <QuestionTypeCard type={currentTest.type as 'multiple-choice' | 'fill-blank' | 'open' | 'qa'} />
            
            <section id="test-question" className="mb-8">
              <div className="bg-white rounded-card shadow-card p-6 mb-6">
                <h2 id="question-text" className="text-base font-semibold text-text-primary">
                  {currentTest.question}
                </h2>
              </div>

              {currentTest.type === 'multiple-choice' && (
                <div id="multiple-choice-options" className="space-y-3">
                  {currentTest.options?.map((option, index) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = isAnswered && option === currentTest.answer;
                    const isIncorrect = isAnswered && isSelected && option !== currentTest.answer;

                    return (
                      <button
                        key={index}
                        id={`option-${index}`}
                        className={`w-full py-3 px-4 rounded-card shadow-card border text-left transition-all ${isSelected
                          ? 'border-primary bg-blue-50'
                          : isCorrect
                          ? 'border-success bg-green-50'
                          : isIncorrect
                          ? 'border-danger bg-red-50'
                          : 'border-border-light bg-white'}`}
                        onClick={() => handleOptionClick(option)}
                        disabled={isAnswered}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${isSelected
                            ? 'text-primary font-medium'
                            : isCorrect
                            ? 'text-success font-medium'
                            : isIncorrect
                            ? 'text-danger font-medium'
                            : 'text-text-primary'}`}>
                            {option}
                          </span>
                          {isSelected && (
                            <i className="fas fa-check-circle text-primary"></i>
                          )}
                          {isCorrect && !isSelected && (
                            <i className="fas fa-check-circle text-success"></i>
                          )}
                          {isIncorrect && (
                            <i className="fas fa-times-circle text-danger"></i>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {currentTest.type === 'fill-blank' && (
                <div id="fill-blank-section" className="space-y-4">
                  {/* 输入方式切换 */}
                  {!isAnswered && (
                    <div className="flex justify-center">
                      <div className="inline-flex bg-gray-100 p-1 rounded-full">
                        <button
                          onClick={() => setFillBlankInputMode('text')}
                          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                            fillBlankInputMode === 'text'
                              ? 'bg-white text-amber-600 shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <i className="fas fa-keyboard"></i>
                          文本
                        </button>
                        <button
                          onClick={() => setFillBlankInputMode('voice')}
                          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                            fillBlankInputMode === 'voice'
                              ? 'bg-white text-amber-600 shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <i className="fas fa-microphone"></i>
                          语音
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 文本输入 */}
                  {fillBlankInputMode === 'text' && !isAnswered && (
                    <div className="relative">
                      <textarea
                        id="fill-blank-answer"
                        className="w-full p-4 border border-border-light rounded-card focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none text-text-primary text-sm bg-gray-50"
                        rows={4}
                        placeholder="请输入你的回答..."
                        value={fillBlankAnswer}
                        onChange={(e) => setFillBlankAnswer(e.target.value)}
                        disabled={isAnswered}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-text-secondary">
                        {fillBlankAnswer.length} 字
                      </div>
                    </div>
                  )}

                  {/* 语音输入 */}
                  {fillBlankInputMode === 'voice' && !isAnswered && (
                    <div className="flex flex-col items-center py-8">
                      {/* 录音按钮 */}
                      <div className="relative">
                        {isRecording && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20"></div>
                            <div className="absolute -inset-4 rounded-full bg-amber-300 animate-pulse opacity-10"></div>
                          </>
                        )}
                        <button
                          onClick={toggleRecording}
                          disabled={isEvaluating}
                          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-card ${
                            isRecording
                              ? 'bg-danger text-white'
                              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-card-hover'
                          } disabled:opacity-50`}
                        >
                          <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-2xl`}></i>
                        </button>
                      </div>

                      {/* 状态文字 */}
                      <div className="mt-6 text-center">
                        <p className={`text-sm font-medium transition-colors ${
                          isRecording ? 'text-danger' : 'text-text-secondary'
                        }`}>
                          {isRecording ? (
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                              正在录音，点击停止
                            </span>
                          ) : (
                            '点击按钮开始语音回答'
                          )}
                        </p>
                      </div>

                      {/* 录音提示 */}
                      {!isRecording && !fillBlankAnswer && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary bg-gray-50 px-4 py-2 rounded-full">
                          <i className="fas fa-info-circle"></i>
                          <span>请用英语回答，系统会自动识别</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 用户回答预览 */}
                  {fillBlankAnswer && !isAnswered && (
                    <div className="bg-amber-50 rounded-card p-5 border border-amber-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <i className="fas fa-user text-amber-600 text-sm"></i>
                        </div>
                        <span className="text-sm font-medium text-amber-800">你的回答</span>
                      </div>
                      <p className="text-text-primary leading-relaxed pl-10">{fillBlankAnswer}</p>
                    </div>
                  )}

                  {/* 提交按钮 */}
                  {!isAnswered && fillBlankAnswer.trim() && (
                    <motion.button
                      onClick={handleFillBlankSubmit}
                      disabled={isEvaluating}
                      className="w-full py-4 bg-primary text-white rounded-card font-semibold text-sm shadow-card hover:shadow-card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      whileHover={{ scale: isEvaluating ? 1 : 1.02 }}
                      whileTap={{ scale: isEvaluating ? 1 : 0.98 }}
                    >
                      {isEvaluating ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                          />
                          <span>AI 正在评测...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          <span>提交答案</span>
                        </>
                      )}
                    </motion.button>
                  )}

                  {/* 提交过渡动画 - 评测中遮罩 */}
                  {isEvaluating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-card shadow-card p-8 mx-6 max-w-sm w-full text-center"
                      >
                        <div className="relative w-16 h-16 mx-auto mb-4">
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-primary/20"
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fas fa-robot text-primary text-xl"></i>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">AI 正在评测</h3>
                        <p className="text-sm text-text-secondary">正在分析你的回答，请稍候...</p>
                        <div className="flex justify-center gap-1 mt-4">
                          <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* AI评测结果 */}
                  {isAnswered && fillBlankEvaluation && (
                    <div className={`rounded-card overflow-hidden shadow-card ${
                      fillBlankEvaluation.isCorrect
                        ? 'bg-green-50 border border-success'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      {/* 结果头部 */}
                      <div className={`px-6 py-4 ${
                        fillBlankEvaluation.isCorrect
                          ? 'bg-success'
                          : 'bg-amber-500'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <i className={`fas ${fillBlankEvaluation.isCorrect ? 'fa-check' : 'fa-lightbulb'} text-white text-lg`}></i>
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg">
                              {fillBlankEvaluation.isCorrect ? '回答正确！' : '还可以更好'}
                            </h4>
                            <p className="text-white/80 text-sm">
                              {fillBlankEvaluation.isCorrect ? '继续保持！' : '看看AI的建议'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 结果内容 */}
                      <div className="p-6 space-y-5">
                        {/* AI分析 */}
                        <div className="bg-white/60 rounded-card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-robot text-amber-500"></i>
                            <h5 className="text-sm font-semibold text-text-primary">AI 分析</h5>
                          </div>
                          <p className="text-text-secondary text-sm leading-relaxed">{fillBlankEvaluation.analysis}</p>
                        </div>

                        {/* 参考答案 */}
                        <div className="bg-white/60 rounded-card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-book-open text-primary"></i>
                            <h5 className="text-sm font-semibold text-text-primary">参考答案</h5>
                          </div>
                          <p className="text-text-primary font-medium">{currentTest.answer}</p>
                        </div>

                        {/* 改进建议 */}
                        {fillBlankEvaluation.suggestions.length > 0 && (
                          <div className="bg-white/60 rounded-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <i className="fas fa-magic text-purple-500"></i>
                              <h5 className="text-sm font-semibold text-text-primary">改进建议</h5>
                            </div>
                            <ul className="space-y-2">
                              {fillBlankEvaluation.suggestions.map((suggestion: string, index: number) => (
                                <li key={index} className="flex items-start gap-3 text-sm text-text-secondary">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <span className="leading-relaxed">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 问答题 - 语音输入 */}
              {currentTest.type === 'qa' && (
                <div id="qa-section" className="space-y-4">
                  {/* 语音输入按钮 */}
                  <div className="flex justify-center">
                    <button
                      onClick={toggleRecording}
                      disabled={isEvaluating}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-card ${
                        isRecording
                          ? 'bg-danger text-white animate-pulse'
                          : 'bg-primary text-white hover:shadow-card-hover'
                      } disabled:opacity-50`}
                    >
                      <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-2xl`}></i>
                    </button>
                  </div>

                  <p className="text-center text-sm text-text-secondary">
                    {isRecording ? '点击停止录音' : '点击开始语音回答'}
                  </p>

                  {/* 用户回答显示 */}
                  {qaAnswer && (
                    <div className="p-4 bg-blue-50 rounded-card border border-blue-100">
                      <h4 className="text-sm font-medium text-text-secondary mb-2">你的回答：</h4>
                      <p className="text-text-primary text-sm">{qaAnswer}</p>
                    </div>
                  )}

                  {/* 评测中 */}
                  {isEvaluating && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-sm text-text-secondary">AI 正在评测...</p>
                      <p className="text-xs text-text-secondary mt-1">正在分析你的回答，请稍候</p>
                    </div>
                  )}

                  {/* 评测结果 */}
                  {qaEvaluation && (
                    <div className={`p-4 rounded-card border ${qaEvaluation.score >= 80 ? 'bg-green-50 border-success' : qaEvaluation.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-danger'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-text-primary text-sm">评测结果</h4>
                        <span className={`text-xl font-bold ${qaEvaluation.score >= 80 ? 'text-success' : qaEvaluation.score >= 60 ? 'text-amber-600' : 'text-danger'}`}>
                          {qaEvaluation.score}分
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">{qaEvaluation.feedback}</p>
                      {qaEvaluation.suggestions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-text-primary mb-2">改进建议：</h5>
                          <ul className="space-y-1">
                            {qaEvaluation.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                                <i className="fas fa-lightbulb text-amber-500 mt-0.5"></i>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
            
            <section id="test-navigation" className="flex justify-between">
              <Link
                href={prevTest ? `/scene-test/${id}/${prevTest.id}` : '#'}
                id="prev-btn"
                className={`py-3 px-6 rounded-card font-semibold text-sm ${prevTest ? 'bg-white shadow-card text-text-primary hover:shadow-card-hover' : 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'}`}
                aria-disabled={!prevTest}
              >
                上一题
              </Link>

              {/* 下一题/提交按钮 - 必须作答后才能点击，评测期间禁用 */}
              {canGoNext && !isEvaluating ? (
                <Link
                  href={nextTest ? `/scene-test/${id}/${nextTest.id}` : `/scene-detail/${id}`}
                  id="next-btn"
                  className={`py-3 px-6 rounded-card font-semibold text-sm ${nextTest ? 'bg-white shadow-card text-text-primary hover:shadow-card-hover' : 'bg-primary text-white hover:shadow-card-hover'}`}
                >
                  {nextTest ? '下一题' : '提交'}
                </Link>
              ) : (
                <button
                  id="next-btn-disabled"
                  disabled
                  className="py-3 px-6 rounded-card font-semibold text-sm bg-gray-200 text-gray-400 cursor-not-allowed"
                >
                  {isEvaluating ? '评测中...' : nextTest ? '下一题' : '提交'}
                </button>
              )}
            </section>

            {/* 未作答提示 - 仅在未作答且非评测状态时显示 */}
            {!isAnswered && !isEvaluating && (
              <p className="text-center text-sm text-amber-600 mt-4">
                <i className="fas fa-exclamation-circle mr-1"></i>
                请先完成本题作答
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
