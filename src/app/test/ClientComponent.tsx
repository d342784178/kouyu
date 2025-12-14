'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// 定义短语类型
interface Phrase {
  id: string
  english: string
  chinese: string
  partOfSpeech: string
  scene: string
  difficulty: string
  pronunciationTips: string
  audioUrl: string
  createdAt: string
  updatedAt: string
}

// 定义测试题目类型
interface TestQuestion {
  type: 'listening' | 'pronunciation' | 'scenario'
  correctAnswer: string
  answered: boolean
  userAnswer?: string
  score?: number
}

// 定义测试分数类型
interface TestScores {
  listening: number
  pronunciation: number
  scenario: number
}

export default function TestClientComponent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const phraseId = searchParams.get('phraseId') || 'phrase1'
  
  // 短语数据状态
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 测试相关状态
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [totalQuestions] = useState(3)
  const [testCompleted, setTestCompleted] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const [scores, setScores] = useState<TestScores>({
    listening: 0,
    pronunciation: 0,
    scenario: 0
  })
  
  // 测试数据
  const [testData, setTestData] = useState<TestQuestion[]>([
    {
      type: 'listening',
      correctAnswer: 'A',
      answered: false
    },
    {
      type: 'pronunciation',
      correctAnswer: 'B',
      answered: false
    },
    {
      type: 'scenario',
      correctAnswer: 'A',
      answered: false
    }
  ])
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [showAIFeedback, setShowAIFeedback] = useState(false)
  const [pronunciationScore, setPronunciationScore] = useState(0)
  
  // 选项选中状态
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  
  // 获取短语数据
  useEffect(() => {
    async function fetchPhrase() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/phrases/${phraseId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch phrase details')
        }
        const data = await response.json()
        setPhrase(data)
        setError(null)
      } catch (err) {
        setError('获取短语数据失败，请稍后重试')
        console.error('Error fetching phrase:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPhrase()
  }, [phraseId])
  
  // 录音定时器
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingSeconds(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])
  
  // 更新进度条
  const updateProgress = () => {
    const progress = ((currentQuestion + 1) / totalQuestions) * 100
    return progress
  }
  
  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }
  
  // 处理选项选择
  const handleOptionSelect = (option: string) => {
    if (testData[currentQuestion].answered) return
    
    setSelectedOption(option)
    
    const isCorrect = option === testData[currentQuestion].correctAnswer
    const questionType = testData[currentQuestion].type
    
    // 更新测试数据
    const updatedTestData = [...testData]
    updatedTestData[currentQuestion] = {
      ...updatedTestData[currentQuestion],
      answered: true,
      userAnswer: option
    }
    setTestData(updatedTestData)
    
    // 更新分数
    const updatedScores = {...scores}
    if (questionType === 'listening') {
      updatedScores.listening = isCorrect ? 1 : 0
    } else if (questionType === 'scenario') {
      updatedScores.scenario = isCorrect ? 1 : 0
    }
    setScores(updatedScores)
  }
  
  // 开始录音
  const startRecording = () => {
    setIsRecording(true)
    setShowAIFeedback(false)
  }
  
  // 停止录音
  const stopRecording = () => {
    setIsRecording(false)
    
    // 模拟AI评分
    setTimeout(() => {
      const randomScore = Math.floor(Math.random() * 20) + 80 // 80-99分
      setPronunciationScore(randomScore)
      setShowAIFeedback(true)
      
      // 更新测试数据
      const updatedTestData = [...testData]
      updatedTestData[currentQuestion] = {
        ...updatedTestData[currentQuestion],
        answered: true,
        score: randomScore / 100
      }
      setTestData(updatedTestData)
      
      // 更新分数
      const updatedScores = {...scores}
      updatedScores.pronunciation = randomScore / 100
      setScores(updatedScores)
    }, 1000)
  }
  
  // 下一题
  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedOption(null)
      setShowAIFeedback(false)
    }
  }
  
  // 提交测试
  const handleSubmitTest = () => {
    setTestCompleted(true)
  }
  
  // 完成测试
  const handleFinishTest = () => {
    // 返回短语详情页
    router.push(`/phrase-detail?phraseId=${phraseId}`)
  }
  
  // 返回按钮
  const handleBack = () => {
    router.push(`/phrase-detail?phraseId=${phraseId}`)
  }
  
  // 检查当前问题是否已回答
  const isQuestionAnswered = () => {
    const question = testData[currentQuestion]
    return question.answered
  }
  
  // 计算总分
  const calculateTotalScore = () => {
    const totalScore = (scores.listening + scores.pronunciation + scores.scenario) / 3 * 100
    return Math.round(totalScore)
  }
  
  // 计算正确率
  const calculatePercentage = () => {
    const totalScore = calculateTotalScore()
    return totalScore
  }
  
  // 检查是否已掌握
  const isMastered = () => {
    return calculateTotalScore() >= 80
  }
  
  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <i className="fas fa-spinner text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">加载中...</h3>
          <p className="text-sm text-text-secondary">正在获取测试数据，请稍候</p>
        </div>
      </div>
    )
  }
  
  // 错误状态
  if (error || !phrase) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-circle text-red-500 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">加载失败</h3>
          <p className="text-sm text-text-secondary mb-4">{error || '未找到短语信息'}</p>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm mr-2"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
            onClick={handleBack}
          >
            返回短语详情
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div id="main-content" className="min-h-screen pb-24 bg-bg-secondary">
      {/* 状态栏 */}
      <div id="status-bar" className="bg-white safe-top">
        <div className="flex justify-between items-center px-6 py-2 text-sm font-medium text-gray-900">
          <span>9:41</span>
          <div className="flex items-center space-x-1">
            <i className="fas fa-signal text-xs"></i>
            <i className="fas fa-wifi text-xs"></i>
            <i className="fas fa-battery-three-quarters text-xs"></i>
          </div>
        </div>
      </div>
      
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 返回按钮 */}
          <button id="back-btn" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center" onClick={handleBack}>
            <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
          </button>
          
          {/* 测试进度 */}
          <div id="progress-container" className="flex items-center space-x-2">
            <div id="progress-bar-bg" className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div id="progress-bar" className="h-full bg-primary rounded-full" style={{ width: `${updateProgress()}%` }}></div>
            </div>
            <span id="progress-text" className="text-sm font-medium text-text-primary">{currentQuestion + 1}/{totalQuestions}</span>
          </div>
          
          {/* 占位元素保持居中 */}
          <div className="w-10 h-10"></div>
        </div>
      </header>
      
      {/* 测试内容区域 */}
      <div id="test-content" className="mx-6 mt-6">
        {/* 测试结果页 */}
        {testCompleted ? (
          <div id="test-result" className="bg-white rounded-card shadow-card p-6">
            <div id="result-header" className="text-center mb-6">
              <div id="result-icon" className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-white text-2xl"></i>
              </div>
              <h2 id="result-title" className="text-xl font-bold text-text-primary mb-2">测试完成！</h2>
              <p id="result-subtitle" className="text-sm text-text-secondary">恭喜你完成了本次测试</p>
            </div>
            
            {/* 测试成绩 */}
            <div id="result-content" className="text-center mb-6">
              <div id="score-container" className="bg-gray-50 rounded-xl p-6 mb-4">
                <div id="final-score" className="text-4xl font-bold text-primary mb-2">{calculateTotalScore()}</div>
                <div id="score-percentage" className="text-lg font-semibold text-text-primary mb-2">正确率 {calculatePercentage()}%</div>
                <div 
                  id="mastery-status" 
                  className={isMastered() ? 'text-sm text-success font-medium' : 'text-sm text-orange-600 font-medium'}
                >
                  {isMastered() ? '已掌握' : '需要复习'}
                </div>
              </div>
              
              {/* 详细统计 */}
              <div id="detailed-stats" className="grid grid-cols-3 gap-4">
                <div id="stat-listening" className="text-center">
                  <div className="text-lg font-bold text-blue-600">{scores.listening}/1</div>
                  <div className="text-xs text-text-secondary">听力</div>
                </div>
                <div id="stat-pronunciation" className="text-center">
                  <div className="text-lg font-bold text-green-600">{scores.pronunciation.toFixed(1)}/1</div>
                  <div className="text-xs text-text-secondary">发音</div>
                </div>
                <div id="stat-scenario" className="text-center">
                  <div className="text-lg font-bold text-purple-600">{scores.scenario}/1</div>
                  <div className="text-xs text-text-secondary">情景</div>
                </div>
              </div>
            </div>
            
            {/* 建议 */}
            <div id="suggestions" className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 id="suggestions-title" className="font-semibold text-blue-800 mb-3">学习建议</h3>
              <ul id="suggestions-list" className="text-sm text-blue-700 space-y-1">
                <li>• 发音清晰，继续保持</li>
                <li>• 建议多练习短语的语调变化</li>
                <li>• 可以尝试更多场景对话练习</li>
              </ul>
            </div>
          </div>
        ) : (
          /* 测试题目 */
          <>
            {/* 听力题 */}
            {testData[currentQuestion].type === 'listening' && (
              <div id="listening-question" className="bg-white rounded-card shadow-card p-6">
                <div id="question-header" className="flex items-center mb-4">
                  <div id="question-type-icon" className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-headphones text-blue-600 text-sm"></i>
                  </div>
                  <h2 id="question-type" className="text-lg font-semibold text-text-primary">听力理解</h2>
                </div>
                
                <div id="question-content">
                  <p id="question-text" className="text-base text-text-primary mb-6">请听下面的短语发音，选择正确的英文短语：</p>
                  
                  {/* 音频播放器 */}
                  <div id="audio-player" className="bg-gray-50 rounded-xl p-4 mb-6">
                    <button id="audio-play-btn" className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                      <i id="audio-play-icon" className="fas fa-play text-white text-xl"></i>
                    </button>
                    <p id="audio-text" className="text-center text-sm text-text-secondary mt-3">点击播放音频</p>
                  </div>
                  
                  {/* 选项列表 */}
                  <div id="options-list" className="space-y-3">
                    {[
                      { id: 'A', text: phrase.english },
                      { id: 'B', text: 'I\'m looking for...' },
                      { id: 'C', text: 'Excuse me, where is...' }
                    ].map(option => {
                      const isSelected = selectedOption === option.id
                      const isCorrect = option.id === testData[currentQuestion].correctAnswer
                      const optionClass = isSelected ? 
                        (isCorrect ? 'option-correct' : 'option-incorrect') : 
                        ''
                      
                      return (
                        <button
                          key={option.id}
                          id={`option-${option.id.toLowerCase()}`}
                          className={`w-full p-4 border border-gray-200 rounded-xl text-left hover:border-primary transition-colors ${optionClass}`}
                          onClick={() => handleOptionSelect(option.id)}
                          disabled={testData[currentQuestion].answered}
                        >
                          <span className="font-semibold text-text-primary">{option.id}. </span>
                          <span className="text-text-primary">{option.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* 发音题 */}
            {testData[currentQuestion].type === 'pronunciation' && (
              <div id="pronunciation-question" className="bg-white rounded-card shadow-card p-6">
                <div id="pronunciation-header" className="flex items-center mb-4">
                  <div id="pronunciation-icon" className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-microphone text-green-600 text-sm"></i>
                  </div>
                  <h2 id="pronunciation-type" className="text-lg font-semibold text-text-primary">发音练习</h2>
                </div>
                
                <div id="pronunciation-content">
                  <p id="pronunciation-text" className="text-base text-text-primary mb-6">请朗读下面的短语，AI将为您评分：</p>
                  
                  {/* 短语显示 */}
                  <div id="phrase-display" className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                    <p id="phrase-to-pronounce" className="text-xl font-semibold text-text-primary">{phrase.english}</p>
                    <p id="phrase-meaning" className="text-sm text-text-secondary mt-2">{phrase.chinese}</p>
                  </div>
                  
                  {/* 录音控制 */}
                  <div id="recording-controls" className="text-center mb-6">
                    <button 
                      id="record-btn" 
                      className={`w-20 h-20 bg-danger rounded-full flex items-center justify-center mx-auto mb-4 ${isRecording ? 'recording-animation' : ''}`}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      <i 
                        id="record-icon" 
                        className={`fas text-white text-2xl ${isRecording ? 'fa-stop' : 'fa-microphone'}`}
                      ></i>
                    </button>
                    <p id="record-status" className="text-sm text-text-secondary">
                      {isRecording ? '正在录音...' : '点击开始录音'}
                    </p>
                    <p 
                      id="record-timer" 
                      className={`text-lg font-semibold text-danger mt-2 ${isRecording ? '' : 'hidden'}`}
                    >
                      {formatTime(recordingSeconds)}
                    </p>
                  </div>
                  
                  {/* AI反馈区域 */}
                  <div 
                    id="ai-feedback" 
                    className={`bg-blue-50 rounded-xl p-4 ${showAIFeedback ? '' : 'hidden'}`}
                  >
                    <div id="feedback-header" className="flex items-center mb-3">
                      <i className="fas fa-robot text-blue-600 mr-2"></i>
                      <span className="font-semibold text-blue-800">AI发音反馈</span>
                    </div>
                    <div id="feedback-content">
                      <div id="pronunciation-score" className="text-center mb-4">
                        <span id="score-value" className="text-3xl font-bold text-blue-600">{pronunciationScore}</span>
                        <span className="text-sm text-blue-800 ml-1">分</span>
                      </div>
                      <div id="feedback-text" className="text-sm text-blue-800 space-y-2">
                        <p id="feedback-item-1">发音清晰，语调自然</p>
                        <p id="feedback-item-2">建议注意重音位置</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 情景选择题 */}
            {testData[currentQuestion].type === 'scenario' && (
              <div id="scenario-question" className="bg-white rounded-card shadow-card p-6">
                <div id="scenario-header" className="flex items-center mb-4">
                  <div id="scenario-icon" className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-map-marker-alt text-purple-600 text-sm"></i>
                  </div>
                  <h2 id="scenario-type" className="text-lg font-semibold text-text-primary">情景选择</h2>
                </div>
                
                <div id="scenario-content">
                  <p id="scenario-text" className="text-base text-text-primary mb-6">请选择最适合以下场景的短语：</p>
                  
                  {/* 场景描述 */}
                  <div id="scenario-description" className="bg-orange-50 rounded-xl p-4 mb-6">
                    <div id="scenario-title" className="flex items-center mb-2">
                      <i className="fas fa-map-marker-alt text-orange-600 mr-2"></i>
                      <span className="font-semibold text-orange-800">场景：日常求助</span>
                    </div>
                    <p id="scenario-detail" className="text-sm text-orange-700">当你需要他人帮助时，应该说什么？</p>
                  </div>
                  
                  {/* 选项列表 */}
                  <div id="scenario-options" className="space-y-3">
                    {[
                      {
                        id: 'A', 
                        text: `${phrase.english} help me carry this bag?`,
                        chinese: `${phrase.chinese}帮我拿一下这个包吗？`
                      },
                      {
                        id: 'B', 
                        text: 'I\'m looking for a coffee shop.',
                        chinese: '我在找一家咖啡店。'
                      },
                      {
                        id: 'C', 
                        text: 'Excuse me, where is the bathroom?',
                        chinese: '不好意思，洗手间在哪里？'
                      }
                    ].map(option => {
                      const isSelected = selectedOption === option.id
                      const isCorrect = option.id === testData[currentQuestion].correctAnswer
                      const optionClass = isSelected ? 
                        (isCorrect ? 'option-correct' : 'option-incorrect') : 
                        ''
                      
                      return (
                        <button
                          key={option.id}
                          id={`scenario-option-${option.id.toLowerCase()}`}
                          className={`w-full p-4 border border-gray-200 rounded-xl text-left hover:border-primary transition-colors ${optionClass}`}
                          onClick={() => handleOptionSelect(option.id)}
                          disabled={testData[currentQuestion].answered}
                        >
                          <span className="font-semibold text-text-primary">{option.id}. </span>
                          <span className="text-text-primary">{option.text}</span>
                          <div className="text-sm text-text-secondary mt-1">{option.chinese}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 底部操作按钮 */}
      <div id="bottom-actions" className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light p-6 safe-bottom">
        {!testCompleted ? (
          currentQuestion < totalQuestions - 1 ? (
            <button 
              id="next-btn" 
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              onClick={handleNextQuestion}
              disabled={!isQuestionAnswered()}
            >
              下一题
            </button>
          ) : (
            <button 
              id="submit-btn" 
              className="w-full py-4 bg-success text-white rounded-xl font-semibold text-lg"
              onClick={handleSubmitTest}
              disabled={!isQuestionAnswered()}
            >
              查看结果
            </button>
          )
        ) : (
          <button 
            id="finish-btn" 
            className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-lg"
            onClick={handleFinishTest}
          >
            完成测试
          </button>
        )}
      </div>
    </div>
  )
}