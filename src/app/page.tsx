'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SceneCard from './SceneCard'

// 定义短语类型
interface Phrase {
  id: string
  english: string
  chinese: string
  partOfSpeech: string
  scene: string
  difficulty: string
  pronunciationTips: string
  audioUrl: string | null
  createdAt: string
  updatedAt: string
}

// 定义场景类型
interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  coverImage: string | null
  dialogueCount?: number
  createdAt: string
  updatedAt: string
}

export default function Home() {
  const [randomPhrases, setRandomPhrases] = useState<Phrase[]>([])
  const [recommendedScenes, setRecommendedScenes] = useState<Scene[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 获取随机短语的函数
  const getRandomPhrases = async (count: number = 2): Promise<Phrase[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch('/api/phrases')
      if (!response.ok) {
        throw new Error('Failed to fetch phrases')
      }
      
      const allPhrases: Phrase[] = await response.json()
      
      // 随机打乱数组并返回指定数量的短语
      const shuffled = [...allPhrases].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    } catch (error) {
      console.error('Error fetching random phrases:', error)
      return []
    }
  }

  // 获取推荐场景的函数
  const getRecommendedScenes = async (count: number = 2): Promise<Scene[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch('/api/scenes')
      
      let scenes: Scene[] = []
      
      if (response.ok) {
        scenes = await response.json()
      } else {
        // 如果API调用失败，返回模拟数据
        scenes = [
          {
            id: 'scene_1',
            name: '机场值机',
            category: '旅行出行',
            description: '学习在机场办理值机手续的常用对话',
            difficulty: '中级',
            coverImage: 'https://via.placeholder.com/200',
            dialogueCount: 8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'scene_2',
            name: '餐厅点餐',
            category: '餐饮服务',
            description: '掌握在餐厅点餐的实用英语表达',
            difficulty: '初级',
            coverImage: 'https://via.placeholder.com/200',
            dialogueCount: 6,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
      
      // 随机打乱数组并返回指定数量的场景
      const shuffled = [...scenes].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    } catch (error) {
      console.error('Error fetching recommended scenes:', error)
      // 返回模拟数据
      return [
        {
          id: 'scene_1',
          name: '机场值机',
          category: '旅行出行',
          description: '学习在机场办理值机手续的常用对话',
          difficulty: '中级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'scene_2',
          name: '餐厅点餐',
          category: '餐饮服务',
          description: '掌握在餐厅点餐的实用英语表达',
          difficulty: '初级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const phrases = await getRandomPhrases(2)
        const scenes = await getRecommendedScenes(2)
        setRandomPhrases(phrases)
        setRecommendedScenes(scenes)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])
  
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
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>
          
          {/* 个人中心入口 */}
          <button id="profile-btn" className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <img 
              src="https://s.coze.cn/image/7mUzSxkYdY0/" 
              alt="用户头像" 
              className="w-full h-full rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* 学习进度概览 */}
      <section id="learning-overview" className="mx-6 mt-6">
        <div id="progress-card" className="bg-white rounded-card shadow-card p-6">
          <div id="progress-header" className="flex items-center justify-between mb-6">
            <h2 id="progress-title" className="text-lg font-semibold text-text-primary">今日学习</h2>
            <button id="view-all-btn" className="text-primary text-sm font-medium">查看全部</button>
          </div>
          
          <div id="progress-content" className="flex items-center justify-between">
            {/* 进度环 */}
            <div id="progress-ring-container" className="relative">
              <svg className="w-20 h-20 progress-ring" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="42"
                  cy="42"
                  r="40"
                  stroke="#2563eb"
                  strokeWidth="4"
                  fill="transparent"
                  className="progress-ring-circle"
                  strokeLinecap="round"
                />
              </svg>
              <div id="progress-text" className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-text-primary">60%</span>
                <span className="text-xs text-text-secondary">完成度</span>
              </div>
            </div>
            
            {/* 学习数据 */}
            <div id="learning-stats" className="flex-1 ml-6 space-y-3">
              <div id="stat-learned" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">已学短语</span>
                <span className="text-sm font-semibold text-text-primary">12/20</span>
              </div>
              <div id="stat-time" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">学习时长</span>
                <span className="text-sm font-semibold text-text-primary">25分钟</span>
              </div>
              <div id="stat-streak" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">连续天数</span>
                <span className="text-sm font-semibold text-tertiary">7天</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 复习提醒 */}
      <section id="review-reminder" className="mx-6 mt-4">
        <div id="reminder-card" className="bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-100 rounded-card p-5">
          <div id="reminder-content" className="flex items-center justify-between">
            <div id="reminder-info" className="flex items-center">
              <div id="reminder-icon" className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-clock text-white text-sm"></i>
              </div>
              <div>
                <h3 id="reminder-title" className="text-sm font-semibold text-text-primary">复习提醒</h3>
                <p id="reminder-text" className="text-xs text-text-secondary">有5个短语需要复习</p>
              </div>
            </div>
            <button id="review-btn" className="text-orange-500 text-sm font-medium">去复习</button>
          </div>
        </div>
      </section>

      {/* 推荐场景 */}
      <section id="recommended-scenes" className="mx-6 mt-6">
        <div id="recommended-header" className="flex items-center justify-between mb-4">
          <h2 id="recommended-title" className="text-lg font-semibold text-text-primary">推荐场景</h2>
          <Link href="/scene-list" id="more-scenes-btn" className="text-primary text-sm font-medium">更多</Link>
        </div>
        
        <div id="scenes-list" className="space-y-3">
          {recommendedScenes.length > 0 ? (
            recommendedScenes.map((scene, index) => (
              <SceneCard key={scene.id} scene={scene} index={index} />
            ))
          ) : (
            <div id="no-scenes" className="text-center py-6">
              <p className="text-text-secondary">暂无推荐场景</p>
            </div>
          )}
        </div>
      </section>

      {/* 场景分类 */}
      <section id="scene-categories" className="mx-6 mt-6 mb-6">
        <h2 id="categories-title" className="text-lg font-semibold text-text-primary mb-4">学习场景</h2>
        
        <div id="categories-grid" className="grid grid-cols-2 gap-4">
          {/* 日常问候 */}
          <Link href="/phrase-library?sceneId=scene_daily" id="scene-daily" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-daily-content" className="text-center">
              <div id="scene-daily-icon" className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-hand-paper text-white"></i>
              </div>
              <h3 id="scene-daily-title" className="text-sm font-semibold text-text-primary mb-1">日常问候</h3>
              <p id="scene-daily-count" className="text-xs text-text-secondary">156个短语</p>
            </div>
          </Link>

          {/* 购物消费 */}
          <Link href="/phrase-library?sceneId=scene_shopping" id="scene-shopping" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-shopping-content" className="text-center">
              <div id="scene-shopping-icon" className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-shopping-bag text-white"></i>
              </div>
              <h3 id="scene-shopping-title" className="text-sm font-semibold text-text-primary mb-1">购物消费</h3>
              <p id="scene-shopping-count" className="text-xs text-text-secondary">98个短语</p>
            </div>
          </Link>

          {/* 餐饮服务 */}
          <Link href="/phrase-library?sceneId=scene_restaurant" id="scene-restaurant" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-restaurant-content" className="text-center">
              <div id="scene-restaurant-icon" className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-utensils text-white"></i>
              </div>
              <h3 id="scene-restaurant-title" className="text-sm font-semibold text-text-primary mb-1">餐饮服务</h3>
              <p id="scene-restaurant-count" className="text-xs text-text-secondary">74个短语</p>
            </div>
          </Link>

          {/* 旅行出行 */}
          <Link href="/phrase-library?sceneId=scene_travel" id="scene-travel" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-travel-content" className="text-center">
              <div id="scene-travel-icon" className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-plane text-white"></i>
              </div>
              <h3 id="scene-travel-title" className="text-sm font-semibold text-text-primary mb-1">旅行出行</h3>
              <p id="scene-travel-count" className="text-xs text-text-secondary">122个短语</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}