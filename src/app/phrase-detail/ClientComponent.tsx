'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAudio } from '@/hooks/useAudio'

// 定义短语类型
interface PhraseExample {
  id: number
  title: string
  desc: string
  english: string
  chinese: string
  usage: string
  audioUrl: string 
  createdAt: string
  updatedAt: string
}

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
  phraseExamples: PhraseExample[]
}

export default function PhraseDetailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const phraseId = searchParams.get('phraseId') || 'phrase1'
  
  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [pronunciationType, setPronunciationType] = useState('british')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTimer, setRecordingTimer] = useState(0)
  const [showAIFeedback, setShowAIFeedback] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [masteryStatus, setMasteryStatus] = useState(false)
  
  // 示例播放状态 - 使用对象存储每个示例的播放状态
  const [examplePlayStates, setExamplePlayStates] = useState<Record<number, boolean>>({})
  const [exampleLoadingStates, setExampleLoadingStates] = useState<Record<number, boolean>>({})
  
  // 录音相关状态
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)
  
  // 使用自定义 Hook 管理音频播放
  const { 
    isPlaying, 
    isLoading: isAudioLoading, 
    play, 
    pause, 
    audioRef,
    progress,
    currentTime,
    duration,
    playCount
  } = useAudio()
  
  // 循环播放状态
  const [isLooping, setIsLooping] = useState(false)
  
  // 示例音频引用
  const exampleAudioRefs = useRef<Record<number, HTMLAudioElement>>({})
  
  // 录音音频引用
  const recordingAudioRef = useRef<HTMLAudioElement>(null)
  
  // 媒体记录器引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // 从 API 获取短语详情
  useEffect(() => {
    async function fetchPhrase() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/phrases/${phraseId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch phrase details')
        }
        const data = await response.json()
        console.log('Fetched phrase:', data)
        setPhrase(data)
        setError(null)
      } catch (err) {
        setError('获取短语详情失败，请稍后重试')
        console.error('Error fetching phrase:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPhrase()
  }, [phraseId])
  
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
  
  // 开始录音
  const startRecording = async () => {
    try {
      // 获取用户媒体设备
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 创建媒体记录器
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      // 处理录音数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      // 录音结束处理
      mediaRecorder.onstop = () => {
        // 创建录音 blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedBlob(audioBlob)
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop())
        
        // 显示AI反馈
        setShowAIFeedback(true)
      }
      
      // 开始录音
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('无法访问麦克风，请检查浏览器权限设置')
    }
  }
  
  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  
  // 播放录音
  const playRecording = () => {
    if (!recordedBlob || !recordingAudioRef.current) return
    
    const audioUrl = URL.createObjectURL(recordedBlob)
    recordingAudioRef.current.src = audioUrl
    
    if (isPlayingRecording) {
      recordingAudioRef.current.pause()
      setIsPlayingRecording(false)
    } else {
      recordingAudioRef.current.play()
      setIsPlayingRecording(true)
    }
  }
  
  // 监听录音播放结束
  useEffect(() => {
    const audioElement = recordingAudioRef.current
    if (!audioElement) return
    
    const handleEnded = () => {
      setIsPlayingRecording(false)
    }
    
    audioElement.addEventListener('ended', handleEnded)
    return () => {
      audioElement.removeEventListener('ended', handleEnded)
    }
  }, [])
  
  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }
  
  // 如果加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <i className="fas fa-spinner text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">加载中...</h3>
          <p className="text-sm text-text-secondary">正在获取短语详情，请稍候</p>
        </div>
      </div>
    )
  }
  
  // 如果出错，显示错误状态
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
            onClick={() => router.back()}
          >
            返回短语库
          </button>
        </div>
      </div>
    )
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
            <h2 id="phrase-text" className="text-2xl font-bold text-text-primary mb-2">{phrase.english}</h2>
            <p id="phrase-meaning" className="text-lg text-text-secondary">{phrase.chinese}</p>
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
            
            {/* 隐藏的音频元素 */}
            <audio ref={audioRef} />
            
            {/* 录音播放音频元素 */}
            <audio 
              ref={recordingAudioRef}
              onPlay={() => setIsPlayingRecording(true)}
              onPause={() => setIsPlayingRecording(false)}
              onEnded={() => setIsPlayingRecording(false)}
            />
            
            {/* 发音播放器 */}
            <div id="audio-player" className="bg-gray-50 rounded-xl p-4">
              {/* 短音频播放器（时长 < 3秒）- 简化交互 */}
              {duration > 0 && duration < 3 ? (
                <div className="flex items-center justify-between">
                  {/* 左侧：大播放按钮 + 循环开关 */}
                  <div className="flex items-center space-x-3">
                    {/* 大播放按钮 */}
                    <button 
                      id="play-btn" 
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                        isAudioLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'
                      } ${isPlaying ? 'scale-105' : 'scale-100'}`}
                      onClick={async () => {
                        let audioPath = phrase?.audioUrl || '';
                        if (pronunciationType === 'american') {
                          audioPath = audioPath ? audioPath.replace(/british|uk/i, 'american') : '';
                        }
                        if (!audioPath) {
                          alert('当前短语暂无音频');
                          return;
                        }
                        if (isPlaying) {
                          pause()
                        } else {
                          await play(audioPath, isLooping)
                        }
                      }}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <i className="fas fa-spinner fa-spin text-white text-2xl"></i>
                      ) : (
                        <i className={`fa-solid text-white text-2xl ${isPlaying ? 'fa-pause' : 'fa-play'} ml-1`}></i>
                      )}
                    </button>
                    
                    {/* 循环开关 */}
                    <button
                      id="loop-btn"
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 ${
                        isLooping 
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setIsLooping(!isLooping)
                        if (audioRef.current) {
                          audioRef.current.loop = !isLooping
                        }
                      }}
                      title={isLooping ? '关闭循环' : '循环播放'}
                    >
                      <i className={`fas fa-repeat ${isLooping ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }}></i>
                    </button>
                  </div>
                  
                  {/* 右侧：播放状态 + 次数 */}
                  <div className="text-right">
                    {/* 播放中动画指示器 */}
                    {isPlaying && (
                      <div className="flex items-center justify-end space-x-1 mb-2">
                        <span className="text-xs text-primary font-medium">播放中</span>
                        <div className="flex space-x-0.5">
                          <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                    {/* 播放次数 */}
                    <div className="text-sm text-text-secondary">
                      {playCount > 0 ? (
                        <span className="text-primary font-semibold">已听 {playCount} 次</span>
                      ) : (
                        <span>点击播放</span>
                      )}
                    </div>
                    {/* 循环状态 */}
                    {isLooping && (
                      <div className="text-xs text-primary mt-1">
                        <i className="fas fa-infinity mr-1"></i>循环开启
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 长音频播放器（时长 >= 3秒）- 带进度条 */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <button 
                        id="play-btn" 
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          isAudioLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'
                        } ${isPlaying ? 'scale-110' : 'scale-100'}`}
                        onClick={async () => {
                          let audioPath = phrase?.audioUrl || '';
                          if (pronunciationType === 'american') {
                            audioPath = audioPath ? audioPath.replace(/british|uk/i, 'american') : '';
                          }
                          if (!audioPath) {
                            alert('当前短语暂无音频');
                            return;
                          }
                          if (isPlaying) {
                            pause()
                          } else {
                            await play(audioPath, isLooping)
                          }
                        }}
                        disabled={isAudioLoading}
                      >
                        {isAudioLoading ? (
                          <i className="fas fa-spinner fa-spin text-white text-xl"></i>
                        ) : (
                          <i className={`fa-solid text-white text-xl ${isPlaying ? 'fa-pause' : 'fa-play'} ml-0.5`}></i>
                        )}
                      </button>
                      
                      <button
                        id="loop-btn"
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isLooping ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setIsLooping(!isLooping)
                          if (audioRef.current) {
                            audioRef.current.loop = !isLooping
                          }
                        }}
                        title={isLooping ? '关闭循环' : '循环播放'}
                      >
                        <i className={`fas fa-repeat text-sm ${isLooping ? 'animate-pulse' : ''}`}></i>
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-text-secondary">
                        {playCount > 0 && <span className="text-primary font-medium">已播放 {playCount} 次</span>}
                      </div>
                      {isLooping && (
                        <div className="text-xs text-primary mt-1">
                          <i className="fas fa-infinity mr-1"></i>循环中
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div id="audio-info">
                    <div id="audio-progress" className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        id="audio-progress-bar" 
                        className="bg-primary h-full rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div id="audio-time" className="flex justify-between text-xs text-text-secondary">
                      <span id="current-time">{formatTime(Math.floor(currentTime))}</span>
                      <span id="total-time">{formatTime(Math.floor(duration))}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* 发音要点 */}
          <div id="pronunciation-tips" className="mb-6">
            <h3 id="tips-title" className="text-sm font-semibold text-text-primary mb-3">发音要点</h3>
            <div id="tips-content" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p id="tips-text" className="text-sm text-blue-800">{phrase.pronunciationTips}</p>
            </div>
          </div>
          
          {/* 词性和场景标签 */}
          <div id="tags-section">
            <div id="tags-container" className="flex items-center justify-between">
              <div id="part-of-speech" className="flex items-center space-x-2">
                <span className="text-sm text-text-secondary">词性：</span>
                <span id="pos-tag" className="px-3 py-1 bg-purple-50 text-purple-600 text-sm rounded-full">{phrase.partOfSpeech}</span>
              </div>
              <div id="scene-tags" className="flex items-center space-x-2">
                <span className="text-sm text-text-secondary">场景：</span>
                <span id="scene-tag" className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">{phrase.scene}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 发音练习 */}
      <section id="pronunciation-practice" className="mx-6 mt-6">
        <div id="practice-content">
          <h3 id="practice-title" className="text-lg font-semibold text-text-primary mb-4">发音练习</h3>
          
          {/* 录音区域 */}
          <div id="recording-section" className="text-center mb-6">
            {/* 录音计时 */}
            <div 
              id="recording-timer" 
              className="text-xl font-bold text-red-500 mb-4"
              style={{ display: isRecording ? 'block' : 'none' }}
            >
              {formatTime(recordingTimer)}
            </div>
            
            {/* 录音按钮或播放控制按钮 */}
            {isRecording ? (
              // 录音中状态
              <div id="recording-in-progress" className="flex flex-col items-center">
                <button 
                  id="stop-record-btn" 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-500 recording-animation"
                  onClick={stopRecording}
                >
                  <i id="stop-record-icon" className="fas fa-stop text-white text-2xl"></i>
                </button>
                <p id="recording-status" className="text-sm text-text-secondary">
                  点击停止录音
                </p>
              </div>
            ) : recordedBlob ? (
              // 录音完成状态 - 显示播放和重新录制按钮
              <div id="recording-controls" className="flex items-center justify-center space-x-4 mb-4">
                {/* 播放按钮 */}
                <button 
                  id="play-recording-btn" 
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-primary"
                  onClick={playRecording}
                >
                  <i className={`fa-solid text-white text-xl ${isPlayingRecording ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                
                {/* 重新录制按钮 */}
                <button 
                  id="re-record-btn" 
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-200"
                  onClick={() => {
                    setRecordedBlob(null)
                    setShowAIFeedback(false)
                    startRecording()
                  }}
                >
                  <i className="fas fa-redo text-gray-700 text-xl"></i>
                </button>
              </div>
            ) : (
              // 初始状态 - 显示开始录音按钮
              <div id="start-recording" className="flex flex-col items-center">
                <button 
                  id="start-record-btn" 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-red-500"
                  onClick={startRecording}
                >
                  <i id="start-record-icon" className="fas fa-microphone text-white text-2xl"></i>
                </button>
                <p id="record-status" className="text-sm text-text-secondary">
                  点击开始录音
                </p>
              </div>
            )}
            
            {/* AI反馈区域 - 始终显示当showAIFeedback为true */}
            <div id="ai-feedback" className={`${showAIFeedback ? 'block' : 'hidden'} mt-6`}>
              <h4 id="feedback-title" className="text-sm font-semibold text-text-primary mb-3">AI发音反馈</h4>
              <div id="feedback-content" className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div id="feedback-score" className="flex items-center justify-between mb-3">
                  <span className="text-sm text-green-800">发音评分：</span>
                  <span id="score-value" className="text-lg font-bold text-green-600">85分</span>
                </div>
                <div id="feedback-suggestions">
                  <p id="feedback-text" className="text-sm text-green-800 mb-2">发音清晰，语调自然！建议：</p>
                  <ul id="feedback-list" className="text-sm text-green-700 space-y-1">
                    <li>• &quot;could&quot;的发音可以更轻柔一些</li>
                    <li>• &quot;please&quot;的重音位置很标准</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 场景示例 */}
      <section id="scene-examples" className="mx-6 mt-6">
        <div id="examples-content">
          <h3 id="examples-title" className="text-lg font-semibold text-text-primary mb-4">场景示例</h3>
          
          {phrase.phraseExamples.map((example, index) => (
            <div key={example.id} id={`example-${index + 1}`} className="border border-gray-200 rounded-lg mb-4">
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
                  
                  {/* 示例音频元素 - 隐藏 */}
                  <audio 
                    ref={el => {
                      if (el) exampleAudioRefs.current[example.id] = el
                    }}
                    onPlay={() => setExamplePlayStates(prev => ({ ...prev, [example.id]: true }))}
                    onPause={() => setExamplePlayStates(prev => ({ ...prev, [example.id]: false }))}
                    onEnded={() => setExamplePlayStates(prev => ({ ...prev, [example.id]: false }))}
                  />
                  
                  {/* 音频播放按钮 */}
                  <button 
                    id={`example-${index + 1}-audio`} 
                    onClick={async () => {
                      if (!example.audioUrl) {
                        console.log('No audio URL available for this example');
                        alert('当前示例暂无音频');
                        return;
                      }
                      
                      const audioElement = exampleAudioRefs.current[example.id];
                      if (!audioElement) return;
                      
                      try {
                        // 如果正在加载，不执行操作
                        if (exampleLoadingStates[example.id]) return;
                        
                        if (audioElement.paused) {
                          // 如果音频没有 src 或者 src 不是 blob URL，需要先获取
                          if (!audioElement.src || !audioElement.src.startsWith('blob:')) {
                            setExampleLoadingStates(prev => ({ ...prev, [example.id]: true }));
                            
                            const response = await fetch(`/api/audio?path=${encodeURIComponent(example.audioUrl)}`);
                            if (!response.ok) {
                              throw new Error('Failed to fetch audio URL');
                            }
                            const data = await response.json();
                            audioElement.src = data.url;
                          }
                          
                          await audioElement.play();
                        } else {
                          audioElement.pause();
                        }
                      } catch (error) {
                        console.error('Error playing example audio:', error);
                        alert('音频播放失败，请稍后重试');
                      } finally {
                        setExampleLoadingStates(prev => ({ ...prev, [example.id]: false }));
                      }
                    }}
                    disabled={exampleLoadingStates[example.id]}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                      exampleLoadingStates[example.id] ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {exampleLoadingStates[example.id] ? (
                      <i className="fas fa-spinner fa-spin text-gray-600 text-sm"></i>
                    ) : (
                      <i className={`fas ${examplePlayStates[example.id] ? 'fa-pause' : 'fa-play'} text-gray-600 text-sm`}></i>
                    )}
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
        <button 
          id="test-btn" 
          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 rounded-lg shadow-md"
          onClick={() => router.push(`/test?phraseId=${phraseId}`)}
        >
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