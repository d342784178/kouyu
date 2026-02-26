'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/Loading'

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
  // phraseExamples 只在详情接口中返回，所以设为可选
  phraseExamples?: Array<{
    id: number
    phraseId: string
    title: string
    desc: string
    english: string
    chinese: string
    usage: string
    audioUrl: string
    createdAt: string
    updatedAt: string
  }>
  // 添加 mastered 字段，默认为 false
  mastered?: boolean
}

export default function PhraseLibraryClient() {
  const searchParams = useSearchParams()
  const initialScene = searchParams.get('scene_id') || 'all'
  
  const [search, setSearch] = useState('')
  const [scene, setScene] = useState(initialScene)
  const [difficulty, setDifficulty] = useState('all')
  const [selectedScenes, setSelectedScenes] = useState(['daily_life', 'conversation', 'work', 'social'])
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [filteredPhrases, setFilteredPhrases] = useState<Phrase[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // 音频播放状态
  const [playingPhraseId, setPlayingPhraseId] = useState<string | null>(null)
  const [loadingPhraseId, setLoadingPhraseId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // 从 API 获取短语数据
  useEffect(() => {
    async function fetchPhrases() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/phrases')
        if (!response.ok) {
          throw new Error('Failed to fetch phrases')
        }
        const data = await response.json()
        // 添加默认的 mastered 字段
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const phrasesWithMastered = data.map((phrase: any) => ({
          ...phrase,
          mastered: Math.random() > 0.7 // 模拟 70% 的概率已掌握
        }))
        setPhrases(phrasesWithMastered)
        setFilteredPhrases(phrasesWithMastered)
        setFetchError(null)
      } catch (err) {
        setFetchError('获取短语数据失败，请稍后重试')
        console.error('Error fetching phrases:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPhrases()
  }, [])
  
  // 筛选短语
  useEffect(() => {
    const result = phrases.filter(phrase => {
      // 搜索筛选
      if (search && 
          !phrase.english.toLowerCase().includes(search.toLowerCase()) && 
          !phrase.chinese.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      
      // 场景筛选（顶部标签）
      if (scene !== 'all' && phrase.scene !== scene) {
        return false
      }
      
      // 难度筛选
      if (difficulty !== 'all' && phrase.difficulty !== difficulty) {
        return false
      }
      
      // 筛选弹窗场景筛选
      if (!selectedScenes.includes(phrase.scene)) {
        return false
      }
      
      return true
    })
    setFilteredPhrases(result)
  }, [search, scene, difficulty, selectedScenes, phrases])
  
  // 辅助函数
  const getDifficultyClass = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-50 text-green-600'
      case 'intermediate': return 'bg-blue-50 text-blue-600'
      case 'advanced': return 'bg-purple-50 text-purple-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }
  
  const getDifficultyText = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return '入门'
      case 'intermediate': return '进阶'
      case 'advanced': return '精通'
      default: return '未知'
    }
  }
  
  const getSceneText = (scene: string) => {
    switch(scene) {
      case 'conversation': return '对话交流'
      case 'daily_life': return '日常生活'
      case 'work': return '工作职场'
      case 'social': return '社交场合'
      default: return '其他'
    }
  }

  const getSceneClass = (scene: string) => {
    switch(scene) {
      case 'conversation': return 'bg-blue-50 text-blue-600'
      case 'daily_life': return 'bg-green-50 text-green-600'
      case 'work': return 'bg-indigo-50 text-indigo-600'
      case 'social': return 'bg-pink-50 text-pink-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }
  
  // 应用筛选
  const applyFilters = () => {
    setShowFilterModal(false)
  }
  
  // 重置筛选
  const resetFilters = () => {
    setDifficulty('all')
    setSelectedScenes(['daily_life', 'conversation', 'work', 'social'])
  }
  
  return (
    <div id="main-content" className="pb-20">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 页面标题 */}
          <h1 id="page-title" className="text-lg font-semibold text-text-primary">短语库</h1>
          
          {/* 右侧操作按钮 */}
          <div id="header-actions" className="flex items-center space-x-3">
            {/* 搜索框 */}
            <div id="search-container" className="hidden md:flex flex-1 max-w-xs mr-3">
              <div className="relative">
                <input 
                  type="text" 
                  id="search-input"
                  placeholder="搜索短语..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
              </div>
            </div>
            
            {/* 筛选按钮 */}
            <button id="filter-btn" type="button" aria-label="打开筛选" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors" onClick={() => setShowFilterModal(true)}>
              <i className="fas fa-filter text-gray-600 text-sm"></i>
            </button>
          </div>
        </div>
      </header>
      
      {/* 移动端搜索框 */}
      <div id="mobile-search" className="bg-white px-6 py-3 border-b border-gray-100 md:hidden">
        <div className="relative">
          <input 
            type="text" 
            id="mobile-search-input"
            placeholder="搜索短语..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
        </div>
      </div>

      {/* 筛选标签栏 */}
      <section id="filter-tabs" className="px-6 py-4">
        <div id="tabs-container" className="flex space-x-3 overflow-x-auto">
          <button 
            id="tab-all" 
            type="button"
            aria-pressed={scene === 'all'}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${scene === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} text-sm`}
            onClick={() => setScene('all')}
          >
            全部
          </button>
          <button 
            id="tab-conversation" 
            type="button"
            aria-pressed={scene === 'conversation'}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${scene === 'conversation' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} text-sm`}
            onClick={() => setScene('conversation')}
          >
            对话交流
          </button>
          <button 
            id="tab-daily" 
            type="button"
            aria-pressed={scene === 'daily_life'}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${scene === 'daily_life' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} text-sm`}
            onClick={() => setScene('daily_life')}
          >
            日常生活
          </button>
          <button 
            id="tab-work" 
            type="button"
            aria-pressed={scene === 'work'}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${scene === 'work' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} text-sm`}
            onClick={() => setScene('work')}
          >
            工作职场
          </button>
          <button 
            id="tab-social" 
            type="button"
            aria-pressed={scene === 'social'}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${scene === 'social' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} text-sm`}
            onClick={() => setScene('social')}
          >
            社交场合
          </button>
        </div>
      </section>

      {/* 短语列表 */}
      <section id="phrases-section" className="px-6">
        <div id="phrases-header" className="flex items-center justify-between mb-4">
          <h2 id="phrases-title" className="text-lg font-semibold text-text-primary">短语库</h2>
          <span id="phrases-count" className="text-sm text-text-secondary">共 {filteredPhrases.length} 个短语</span>
        </div>
        
        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} />
        
        <div id="phrases-list" className="space-y-3">
          {filteredPhrases.map(phrase => {
            const difficultyClass = getDifficultyClass(phrase.difficulty)
            const difficultyText = getDifficultyText(phrase.difficulty)
            const sceneText = getSceneText(phrase.scene)
            const sceneClass = getSceneClass(phrase.scene)
            const isPlaying = playingPhraseId === phrase.id
            const isLoading = loadingPhraseId === phrase.id
            
            return (
              <div
                key={phrase.id}
                id={`phrase-card-${phrase.id}`}
                className="bg-white rounded-card shadow-card p-4 card-hover cursor-pointer"
                data-phrase-id={phrase.id}
              >
                <div className="flex items-center justify-between">
                  <Link 
                    href={`/phrase-detail?phraseId=${phrase.id}`}
                    className="flex-1"
                  >
                    <div className="flex items-center mb-1">
                      <h3 className="text-base font-semibold text-text-primary">{phrase.english}</h3>
                      {phrase.mastered ? (
                        <i className="fas fa-check-circle text-success text-sm ml-2"></i>
                      ) : (
                        <i className="fas fa-circle text-gray-300 text-sm ml-2"></i>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{phrase.chinese}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 ${sceneClass} text-xs rounded-full`}>{sceneText}</span>
                      <span className={`px-2 py-1 ${difficultyClass} text-xs rounded-full`}>{difficultyText}</span>
                    </div>
                  </Link>
                  <button 
                    type="button"
                    aria-label={isPlaying ? '暂停播放' : '播放音频'}
                    aria-pressed={isPlaying}
                    className={`phrase-audio-btn w-10 h-10 rounded-full flex items-center justify-center ml-4 transition-colors ${
                      isLoading ? 'bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    data-phrase-id={phrase.id}
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      
                      if (!phrase.audioUrl) {
                        alert('当前短语暂无音频')
                        return
                      }
                      
                      // 如果正在加载，不执行操作
                      if (isLoading) return
                      
                      // 如果正在播放当前短语，暂停
                      if (isPlaying && audioRef.current) {
                        audioRef.current.pause()
                        setPlayingPhraseId(null)
                        return
                      }
                      
                      try {
                        setLoadingPhraseId(phrase.id)

                        // 使用代理接口获取音频
                        const proxyUrl = `/api/audio/proxy?path=${encodeURIComponent(phrase.audioUrl)}`

                        // 设置音频源并播放
                        if (audioRef.current) {
                          audioRef.current.src = proxyUrl
                          audioRef.current.onended = () => setPlayingPhraseId(null)
                          audioRef.current.onerror = () => {
                            setPlayingPhraseId(null)
                            alert('音频播放失败')
                          }
                          await audioRef.current.play()
                          setPlayingPhraseId(phrase.id)
                        }
                      } catch (error) {
                        console.error('Error playing audio:', error)
                        alert('音频播放失败，请稍后重试')
                      } finally {
                        setLoadingPhraseId(null)
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-gray-600 text-sm`}></i>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 空状态 */}
        {filteredPhrases.length === 0 && (
          <div id="empty-state" className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">未找到相关短语</h3>
            <p className="text-sm text-text-secondary">试试其他关键词或筛选条件</p>
          </div>
        )}
      </section>

      {/* 筛选弹窗 */}
      {showFilterModal && (
        <div id="filter-modal" className="fixed inset-0 z-50 bg-black/50">
          <div id="filter-overlay" className="absolute inset-0" onClick={() => setShowFilterModal(false)}></div>
          <div id="filter-content" className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 transition-transform duration-300 ${showFilterModal ? 'translate-y-0' : 'translate-y-full'}`}>
            <div id="filter-header" className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">筛选条件</h3>
              <button id="close-filter-btn" type="button" aria-label="关闭筛选" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors" onClick={() => setShowFilterModal(false)}>
                <i className="fas fa-times text-gray-600 text-sm"></i>
              </button>
            </div>

            {/* 难度筛选 */}
            <div id="difficulty-filter" className="mb-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">难度等级</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  id="difficulty-all"
                  type="button"
                  aria-pressed={difficulty === 'all'}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${difficulty === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setDifficulty('all')}
                >全部</button>
                <button
                  id="difficulty-beginner"
                  type="button"
                  aria-pressed={difficulty === 'beginner'}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${difficulty === 'beginner' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setDifficulty('beginner')}
                >入门</button>
                <button
                  id="difficulty-intermediate"
                  type="button"
                  aria-pressed={difficulty === 'intermediate'}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${difficulty === 'intermediate' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setDifficulty('intermediate')}
                >进阶</button>
                <button
                  id="difficulty-advanced"
                  type="button"
                  aria-pressed={difficulty === 'advanced'}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${difficulty === 'advanced' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setDifficulty('advanced')}
                >精通</button>
              </div>
            </div>
            
            {/* 场景筛选 */}
            <div id="scene-filter" className="mb-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">使用场景</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-conversation-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('conversation')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'conversation'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'conversation'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">对话交流</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-daily-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('daily_life')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'daily_life'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'daily_life'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">日常生活</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-work-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('work')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'work'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'work'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">工作职场</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-social-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('social')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'social'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'social'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">社交场合</span>
                </label>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div id="filter-actions" className="flex space-x-3">
              <button
                id="reset-filter-btn"
                type="button"
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                onClick={resetFilters}
              >
                重置
              </button>
              <button
                id="apply-filter-btn"
                type="button"
                className="flex-1 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                onClick={applyFilters}
              >
                应用筛选
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}