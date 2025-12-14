'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// 模拟短语数据
const phraseData = {
  "phrase1": {
    english: "Could you please...",
    chinese: "请问你可以...吗？",
    partOfSpeech: "动词短语",
    scene: "日常用语",
    difficulty: "入门",
    pronunciationTips: "注意\"could\"的弱读发音，重音应落在\"please\"的第一个音节上，结尾的\"...\"表示语气的委婉。",
    examples: [
      {
        title: "请求帮助",
        desc: "在需要他人帮助时使用",
        english: "Could you please help me carry this bag?",
        chinese: "请问你可以帮我拿一下这个包吗？",
        usage: "使用场景：当你需要他人帮助时，这是一个非常礼貌的表达方式。"
      },
      {
        title: "询问信息",
        desc: "向他人询问信息时使用",
        english: "Could you please tell me the way to the station?",
        chinese: "请问你可以告诉我去车站的路吗？",
        usage: "使用场景：在陌生的地方向当地人询问路线或其他信息时使用。"
      },
      {
        title: "请求许可",
        desc: "请求他人允许时使用",
        english: "Could you please open the window?",
        chinese: "请问你可以打开窗户吗？",
        usage: "使用场景：在需要改变环境或使用他人物品时，礼貌地请求许可。"
      }
    ]
  },
  "phrase2": {
    english: "I'm looking for...",
    chinese: "我在找...",
    partOfSpeech: "动词短语",
    scene: "购物",
    difficulty: "入门",
    pronunciationTips: "注意\"looking\"的发音，重音在第一个音节，结尾的\"for\"要轻读。",
    examples: [
      {
        title: "商店购物",
        desc: "在商店寻找商品时使用",
        english: "I'm looking for a red shirt.",
        chinese: "我在找一件红色的衬衫。",
        usage: "使用场景：在商店里告诉店员你想要找的商品。"
      },
      {
        title: "寻找地点",
        desc: "在某个地方寻找特定地点时使用",
        english: "I'm looking for the restroom.",
        chinese: "我在找洗手间。",
        usage: "使用场景：在商场、机场等公共场所寻找特定设施时使用。"
      },
      {
        title: "寻找人",
        desc: "在人群中寻找特定的人时使用",
        english: "I'm looking for my friend.",
        chinese: "我在找我的朋友。",
        usage: "使用场景：在聚会、活动中寻找特定的人时使用。"
      }
    ]
  }
};

export default function PhraseDetailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const phraseId = searchParams.get('phraseId') || 'phrase1'
  const data = phraseData[phraseId as keyof typeof phraseData] || phraseData.phrase1
  
  const [pronunciationType, setPronunciationType] = useState('british')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTimer, setRecordingTimer] = useState(0)
  const [showAIFeedback, setShowAIFeedback] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [masteryStatus, setMasteryStatus] = useState(false)
  
  // 检查掌握状态
  useEffect(() => {
    // 模拟70%的概率已掌握
    const isMastered = Math.random() > 0.7
    setMasteryStatus(isMastered)
  }, [phraseId])
  
  // 录音定时器
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingTimer(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])
  
  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }
  
  return (
    <div id="main-content" className="pb-6">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 返回按钮 */}
          <button id="back-btn" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center" onClick={() => router.back()}>
            <i className="fas fa-arrow-left text-gray-600 text-sm"></i>
          </button>
          
          {/* 标题 */}
          <h1 id="page-title" className="text-lg font-semibold text-text-primary">短语详情</h1>
          
          {/* 右侧操作按钮 */}
          <div id="header-actions" className="flex items-center space-x-2">
            <button 
              id="favorite-btn" 
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <i className={`${isFavorite ? 'fas fa-heart text-danger' : 'far fa-heart text-gray-600'} text-sm`}></i>
            </button>
            <button id="share-btn" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <i className="fas fa-share text-gray-600 text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      {/* 短语基本信息 */}
      <section id="phrase-basic" className="mx-6 mt-6">
        <div id="phrase-content">
          {/* 短语文本 */}
          <div id="phrase-text-section" className="mb-6">
            <h2 id="phrase-text" className="text-2xl font-bold text-text-primary mb-2">{data.english}</h2>
            <p id="phrase-meaning" className="text-lg text-text-secondary">{data.chinese}</p>
          </div>
          
          {/* 发音区域 */}
          <div id="pronunciation-section" className="mb-6">
            <h3 id="pronunciation-title" className="text-sm font-semibold text-text-primary mb-3">标准发音</h3>
            
            {/* 发音类型切换 */}
            <div id="pronunciation-type" className="flex items-center space-x-2 mb-4">
              <button 
                id="british-btn" 
                className={`px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg pronunciation-btn ${pronunciationType === 'british' ? 'active' : ''}`}
                onClick={() => setPronunciationType('british')}
              >
                <i className="fas fa-flag-uk mr-1"></i>英式
              </button>
              <button 
                id="american-btn" 
                className={`px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg pronunciation-btn ${pronunciationType === 'american' ? 'active' : ''}`}
                onClick={() => setPronunciationType('american')}
              >
                <i className="fas fa-flag-us mr-1"></i>美式
              </button>
            </div>
            
            {/* 发音播放器 */}
            <div id="audio-player" className="flex items-center space-x-3">
              <button 
                id="play-btn" 
                className="w-12 h-12 bg-primary rounded-full flex items-center justify-center"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                <i className={`fa-solid text-white text-lg ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              <div id="audio-info" className="flex-1">
                <div id="audio-progress" className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    id="audio-progress-bar" 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: isPlaying ? '50%' : '0%' }}
                  ></div>
                </div>
                <div id="audio-time" className="flex justify-between text-xs text-text-secondary">
                  <span id="current-time">0:00</span>
                  <span id="total-time">0:03</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 发音要点 */}
          <div id="pronunciation-tips" className="mb-6">
            <h3 id="tips-title" className="text-sm font-semibold text-text-primary mb-3">发音要点</h3>
            <div id="tips-content" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p id="tips-text" className="text-sm text-blue-800">{data.pronunciationTips}</p>
            </div>
          </div>
          
          {/* 词性和场景标签 */}
          <div id="tags-section">
            <div id="tags-container" className="flex items-center justify-between">
              <div id="part-of-speech" className="flex items-center space-x-2">
                <span className="text-sm text-text-secondary">词性：</span>
                <span id="pos-tag" className="px-3 py-1 bg-purple-50 text-purple-600 text-sm rounded-full">{data.partOfSpeech}</span>
              </div>
              <div id="scene-tags" className="flex items-center space-x-2">
                <span className="text-sm text-text-secondary">场景：</span>
                <span id="scene-tag" className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">{data.scene}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 发音练习 */}
      <section id="pronunciation-practice" className="mx-6 mt-6">
        <div id="practice-content">
          <h3 id="practice-title" className="text-lg font-semibold text-text-primary mb-4">发音练习</h3>
          
          {/* 录音按钮 */}
          <div id="recording-section" className="text-center mb-6">
            <button 
              id="record-btn" 
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isRecording ? 'bg-red-500 recording-animation' : 'bg-red-500'}`}
              onClick={() => {
                setIsRecording(!isRecording)
                if (isRecording) {
                  setTimeout(() => setShowAIFeedback(true), 500)
                }
              }}
            >
              <i id="record-icon" className={`fas text-white text-xl ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <p id="record-status" className="text-sm text-text-secondary">
              {isRecording ? '点击停止录音' : '点击开始录音'}
            </p>
            <div 
              id="recording-timer" 
              className="text-xl font-bold text-red-500 mt-2"
              style={{ display: isRecording ? 'block' : 'none' }}
            >
              {formatTime(recordingTimer)}
            </div>
          </div>
          
          {/* AI反馈区域 */}
          <div id="ai-feedback" className={`${showAIFeedback ? 'block' : 'hidden'}`}>
            <h4 id="feedback-title" className="text-sm font-semibold text-text-primary mb-3">AI发音反馈</h4>
            <div id="feedback-content" className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div id="feedback-score" className="flex items-center justify-between mb-3">
                <span className="text-sm text-green-800">发音评分：</span>
                <span id="score-value" className="text-lg font-bold text-green-600">85分</span>
              </div>
              <div id="feedback-suggestions">
                <p id="feedback-text" className="text-sm text-green-800 mb-2">发音清晰，语调自然！建议：</p>
                <ul id="feedback-list" className="text-sm text-green-700 space-y-1">
                  <li>• "could"的发音可以更轻柔一些</li>
                  <li>• "please"的重音位置很标准</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 场景示例 */}
      <section id="scene-examples" className="mx-6 mt-6">
        <div id="examples-content">
          <h3 id="examples-title" className="text-lg font-semibold text-text-primary mb-4">场景示例</h3>
          
          {data.examples.map((example, index) => (
            <div key={index} id={`example-${index + 1}`} className="border border-gray-200 rounded-lg mb-4">
              <div id={`example-${index + 1}-header`} className="p-4 flex items-center justify-between bg-gray-50">
                <div id={`example-${index + 1}-info`}>
                  <h4 id={`example-${index + 1}-title`} className="text-sm font-semibold text-text-primary">{example.title}</h4>
                  <p id={`example-${index + 1}-desc`} className="text-xs text-text-secondary">{example.desc}</p>
                </div>
              </div>
              <div id={`example-${index + 1}-content`} className="px-4 py-4 border-t border-gray-100">
                <div id={`example-${index + 1}-dialogue`} className="mb-4">
                  <p id={`example-${index + 1}-english`} className="text-sm font-medium text-text-primary mb-2">{example.english}</p>
                  <p id={`example-${index + 1}-chinese`} className="text-sm text-text-secondary mb-3">{example.chinese}</p>
                  <button id={`example-${index + 1}-audio`} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-play text-gray-600 text-sm"></i>
                  </button>
                </div>
                <div id={`example-${index + 1}-usage`} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary">{example.usage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 开始测试 */}
      <section id="start-test" className="mx-6 mt-6">
        <button id="test-btn" className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 rounded-lg shadow-md">
          <i className="fas fa-graduation-cap mr-2"></i>
          开始测试
        </button>
      </section>

      {/* 掌握状态 */}
      <section id="mastery-status" className="mx-6 mt-6 mb-8">
        <div id="status-content" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div id="status-info" className="flex items-center">
            <div 
              id="status-icon" 
              className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${masteryStatus ? 'bg-green-100' : 'bg-gray-100'}`}
            >
              <i className={`fas text-sm ${masteryStatus ? 'fa-check text-green-600' : 'fa-clock text-gray-600'}`}></i>
            </div>
            <div>
              <h3 id="status-title" className="text-sm font-semibold text-text-primary">学习状态</h3>
              <p id="status-text" className="text-xs text-text-secondary">{masteryStatus ? '已掌握' : '待学习'}</p>
            </div>
          </div>
          <div 
            id="mastery-badge" 
            className={`px-3 py-1 rounded-full ${masteryStatus ? 'mastery-badge text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            style={{ display: masteryStatus ? 'block' : 'none' }}
          >
            <i className="fas fa-check mr-1"></i>已掌握
          </div>
        </div>
      </section>
    </div>
  )
}