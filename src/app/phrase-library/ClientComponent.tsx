'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// 模拟短语数据
const mockPhrases = [
  {
    id: 'phrase1',
    english: 'Could you please...',
    chinese: '请问你可以...吗？',
    difficulty: 'beginner',
    scenes: ['daily'],
    mastered: false
  },
  {
    id: 'phrase2',
    english: "I'm looking for...",
    chinese: '我在找...',
    difficulty: 'beginner',
    scenes: ['shopping'],
    mastered: true
  },
  {
    id: 'phrase3',
    english: 'Can I get a table for two?',
    chinese: '我可以要一张两人桌吗？',
    difficulty: 'intermediate',
    scenes: ['restaurant'],
    mastered: false
  },
  {
    id: 'phrase4',
    english: 'How much does this cost?',
    chinese: '这个多少钱？',
    difficulty: 'beginner',
    scenes: ['shopping'],
    mastered: true
  },
  {
    id: 'phrase5',
    english: 'Where is the nearest restroom?',
    chinese: '最近的洗手间在哪里？',
    difficulty: 'intermediate',
    scenes: ['travel'],
    mastered: false
  },
  {
    id: 'phrase6',
    english: "I'd like to order...",
    chinese: '我想要点...',
    difficulty: 'intermediate',
    scenes: ['restaurant'],
    mastered: true
  },
  {
    id: 'phrase7',
    english: 'Could you repeat that?',
    chinese: '你能再说一遍吗？',
    difficulty: 'beginner',
    scenes: ['daily'],
    mastered: false
  },
  {
    id: 'phrase8',
    english: 'What time does the store open?',
    chinese: '商店几点开门？',
    difficulty: 'intermediate',
    scenes: ['shopping'],
    mastered: true
  },
  {
    id: 'phrase9',
    english: 'I need to book a flight.',
    chinese: '我需要订一张机票。',
    difficulty: 'advanced',
    scenes: ['travel'],
    mastered: false
  },
  {
    id: 'phrase10',
    english: 'Thank you for your help.',
    chinese: '谢谢你的帮助。',
    difficulty: 'beginner',
    scenes: ['daily'],
    mastered: true
  }
]

export default function PhraseLibraryClient() {
  const searchParams = useSearchParams()
  const initialScene = searchParams.get('scene_id') || 'all'
  
  const [search, setSearch] = useState('')
  const [scene, setScene] = useState(initialScene)
  const [difficulty, setDifficulty] = useState('all')
  const [selectedScenes, setSelectedScenes] = useState(['daily', 'shopping', 'restaurant', 'travel'])
  const [filteredPhrases, setFilteredPhrases] = useState(mockPhrases)
  const [showFilterModal, setShowFilterModal] = useState(false)
  
  // 筛选短语
  useEffect(() => {
    const result = mockPhrases.filter(phrase => {
      // 搜索筛选
      if (search && 
          !phrase.english.toLowerCase().includes(search.toLowerCase()) && 
          !phrase.chinese.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      
      // 场景筛选（顶部标签）
      if (scene !== 'all' && !phrase.scenes.includes(scene)) {
        return false
      }
      
      // 难度筛选
      if (difficulty !== 'all' && phrase.difficulty !== difficulty) {
        return false
      }
      
      // 筛选弹窗场景筛选
      if (!selectedScenes.some(s => phrase.scenes.includes(s))) {
        return false
      }
      
      return true
    })
    setFilteredPhrases(result)
  }, [search, scene, difficulty, selectedScenes])
  
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
      case 'daily': return '日常问候'
      case 'shopping': return '购物消费'
      case 'restaurant': return '餐饮服务'
      case 'travel': return '旅行出行'
      default: return '其他'
    }
  }
  
  const getSceneClass = (scene: string) => {
    switch(scene) {
      case 'daily': return 'bg-blue-50 text-blue-600'
      case 'shopping': return 'bg-purple-50 text-purple-600'
      case 'restaurant': return 'bg-orange-50 text-orange-600'
      case 'travel': return 'bg-green-50 text-green-600'
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
    setSelectedScenes(['daily', 'shopping', 'restaurant', 'travel'])
  }
  
  return (
    <div id="main-content" className="pb-20">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 搜索框 */}
          <div id="search-container" className="flex-1 mr-4">
            <div className="relative">
              <input 
                type="text" 
                id="search-input"
                placeholder="搜索短语..." 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>
          
          {/* 筛选按钮 */}
          <button id="filter-btn" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center" onClick={() => setShowFilterModal(true)}>
            <i className="fas fa-filter text-gray-600 text-sm"></i>
          </button>
        </div>
      </header>

      {/* 筛选标签栏 */}
      <section id="filter-tabs" className="px-6 py-4">
        <div id="tabs-container" className="flex space-x-3 overflow-x-auto">
          <button 
            id="tab-all" 
            className={`px-4 py-2 rounded-full whitespace-nowrap ${scene === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            onClick={() => setScene('all')}
          >
            全部
          </button>
          <button 
            id="tab-daily" 
            className={`px-4 py-2 rounded-full whitespace-nowrap ${scene === 'daily' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            onClick={() => setScene('daily')}
          >
            日常问候
          </button>
          <button 
            id="tab-shopping" 
            className={`px-4 py-2 rounded-full whitespace-nowrap ${scene === 'shopping' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            onClick={() => setScene('shopping')}
          >
            购物消费
          </button>
          <button 
            id="tab-restaurant" 
            className={`px-4 py-2 rounded-full whitespace-nowrap ${scene === 'restaurant' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            onClick={() => setScene('restaurant')}
          >
            餐饮服务
          </button>
          <button 
            id="tab-travel" 
            className={`px-4 py-2 rounded-full whitespace-nowrap ${scene === 'travel' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            onClick={() => setScene('travel')}
          >
            旅行出行
          </button>
        </div>
      </section>

      {/* 短语列表 */}
      <section id="phrases-section" className="px-6">
        <div id="phrases-header" className="flex items-center justify-between mb-4">
          <h2 id="phrases-title" className="text-lg font-semibold text-text-primary">短语库</h2>
          <span id="phrases-count" className="text-sm text-text-secondary">共 {filteredPhrases.length} 个短语</span>
        </div>
        
        <div id="phrases-list" className="space-y-3">
          {filteredPhrases.map(phrase => {
            const difficultyClass = getDifficultyClass(phrase.difficulty)
            const difficultyText = getDifficultyText(phrase.difficulty)
            const sceneText = getSceneText(phrase.scenes[0])
            const sceneClass = getSceneClass(phrase.scenes[0])
            const masteredIcon = phrase.mastered ? 
                '<i class="fas fa-check-circle text-success text-sm ml-2"></i>' : 
                '<i class="fas fa-circle text-gray-300 text-sm ml-2"></i>'
            
            return (
              <Link 
                key={phrase.id}
                href={`/phrase-detail?phraseId=${phrase.id}`}
                id={`phrase-card-${phrase.id}`} 
                className="bg-white rounded-card shadow-card p-4 card-hover cursor-pointer block"
                data-phrase-id={phrase.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="text-base font-semibold text-text-primary">{phrase.english}</h3>
                      <span dangerouslySetInnerHTML={{ __html: masteredIcon }}></span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{phrase.chinese}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 ${sceneClass} text-xs rounded-full`}>{sceneText}</span>
                      <span className={`px-2 py-1 ${difficultyClass} text-xs rounded-full`}>{difficultyText}</span>
                    </div>
                  </div>
                  <button className="phrase-audio-btn w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center ml-4" data-phrase-id={phrase.id}>
                    <i className="fas fa-play text-gray-600 text-sm"></i>
                  </button>
                </div>
              </Link>
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
        <div id="filter-modal" className="fixed inset-0 z-50 backdrop-filter blur(10px) bg-black/50">
          <div id="filter-overlay" className="absolute inset-0" onClick={() => setShowFilterModal(false)}></div>
          <div id="filter-content" className={`absolute bottom-0 left-0 right-0 bg-white rounded-2xl p-6 transition-transform duration-300 ${showFilterModal ? 'translate-y-0' : 'translate-y-full'}`}>
            <div id="filter-header" className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">筛选条件</h3>
              <button id="close-filter-btn" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" onClick={() => setShowFilterModal(false)}>
                <i className="fas fa-times text-gray-600 text-sm"></i>
              </button>
            </div>
            
            {/* 难度筛选 */}
            <div id="difficulty-filter" className="mb-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">难度等级</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  id="difficulty-all" 
                  className={`px-3 py-2 rounded-full text-sm ${difficulty === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setDifficulty('all')}
                >全部</button>
                <button 
                  id="difficulty-beginner" 
                  className={`px-3 py-2 rounded-full text-sm ${difficulty === 'beginner' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setDifficulty('beginner')}
                >入门</button>
                <button 
                  id="difficulty-intermediate" 
                  className={`px-3 py-2 rounded-full text-sm ${difficulty === 'intermediate' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setDifficulty('intermediate')}
                >进阶</button>
                <button 
                  id="difficulty-advanced" 
                  className={`px-3 py-2 rounded-full text-sm ${difficulty === 'advanced' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
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
                    id="scene-daily-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('daily')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'daily'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'daily'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">日常问候</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-shopping-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('shopping')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'shopping'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'shopping'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">购物消费</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-restaurant-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('restaurant')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'restaurant'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'restaurant'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">餐饮服务</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="scene-travel-check" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedScenes.includes('travel')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScenes([...selectedScenes, 'travel'])
                      } else {
                        setSelectedScenes(selectedScenes.filter(s => s !== 'travel'))
                      }
                    }}
                  />
                  <span className="ml-3 text-sm text-text-primary">旅行出行</span>
                </label>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div id="filter-actions" className="flex space-x-3">
              <button 
                id="reset-filter-btn" 
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl"
                onClick={resetFilters}
              >
                重置
              </button>
              <button 
                id="apply-filter-btn" 
                className="flex-1 py-3 bg-primary text-white text-sm font-medium rounded-xl"
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