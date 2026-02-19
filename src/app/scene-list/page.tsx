'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

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

// 分类图标映射
const CATEGORY_ICONS: Record<string, string> = {
  '日常问候': 'fa-sun',
  '购物消费': 'fa-shopping-bag',
  '餐饮服务': 'fa-utensils',
  '旅行出行': 'fa-plane',
}

// 每页加载数量
const PAGE_SIZE = 10

export default function SceneList() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [filteredScenes, setFilteredScenes] = useState<Scene[]>([])
  const [displayScenes, setDisplayScenes] = useState<Scene[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 获取场景列表的函数
  const getScenes = async (): Promise<Scene[]> => {
    try {
      const response = await fetch('/api/scenes')
      
      let scenes: Scene[] = []
      
      if (response.ok) {
        scenes = await response.json()
      } else {
        console.error('API call failed:', response.status)
        scenes = []
      }
      
      return scenes
    } catch (error) {
      console.error('Error fetching scenes:', error)
      return []
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const scenesData = await getScenes()
        setScenes(scenesData)
        setFilteredScenes(scenesData)
        // 初始显示前PAGE_SIZE条
        setDisplayScenes(scenesData.slice(0, PAGE_SIZE))
        setHasMore(scenesData.length > PAGE_SIZE)
        
        // 从场景数据中提取唯一的category列表
        const uniqueCategories = Array.from(new Set(scenesData.map(scene => scene.category)))
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 根据分类筛选场景
  useEffect(() => {
    let filtered = scenes
    if (selectedCategory !== 'all') {
      filtered = scenes.filter(scene => 
        scene.category.toLowerCase().includes(selectedCategory.toLowerCase())
      )
    }
    setFilteredScenes(filtered)
    // 重置分页
    setDisplayScenes(filtered.slice(0, PAGE_SIZE))
    setPage(1)
    setHasMore(filtered.length > PAGE_SIZE)
  }, [selectedCategory, scenes])

  // 加载更多场景
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    // 模拟延迟，提升用户体验
    setTimeout(() => {
      const nextPage = page + 1
      const start = (nextPage - 1) * PAGE_SIZE
      const end = start + PAGE_SIZE
      const newScenes = filteredScenes.slice(0, end)
      
      setDisplayScenes(newScenes)
      setPage(nextPage)
      setHasMore(end < filteredScenes.length)
      setIsLoadingMore(false)
    }, 500)
  }, [page, filteredScenes, isLoadingMore, hasMore])

  // 设置Intersection Observer用于无限滚动
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.5 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore, hasMore, isLoadingMore])

  // 检查是否有场景数据
  const hasScenes = displayScenes.length > 0

  // 根据场景分类获取图标
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case '日常场景':
      case '日常问候':
        return '👋'
      case '职场场景':
        return '💼'
      case '留学/考试':
        return '📚'
      case '购物消费':
      case '超市购物':
        return '🛒'
      case '餐饮服务':
      case '餐厅点餐':
        return '🍽️'
      case '旅行出行':
        return '✈️'
      default:
        return '🌍'
    }
  }

  return (
    <div id="scene-list-content" className="pb-20">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 页面标题 */}
          <h1 id="scene-list-title" className="text-lg font-semibold text-text-primary">场景学习</h1>
          
          {/* 筛选按钮 */}
          <button id="filter-btn" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <i className="fas fa-filter text-gray-600 text-sm"></i>
          </button>
        </div>
      </header>
      
      {/* 分类筛选标签栏 */}
      <div id="category-filter" className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto px-6 py-3 space-x-3 scrollbar-hide">
          {/* 全部选项 */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
          >
            全部
          </button>
          {/* 动态生成的分类选项 */}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'} text-sm`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <main id="scene-list-main" className="mx-6 mt-6">
        <div id="scenes-header" className="flex items-center justify-between mb-4">
          <h2 id="scenes-title" className="text-lg font-semibold text-text-primary">场景列表</h2>
          <span id="scenes-count" className="text-sm text-text-secondary">共 {displayScenes.length} 个场景</span>
        </div>
        
        {isLoading ? (
          // 加载中状态
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-text-secondary">加载中...</p>
          </div>
        ) : hasScenes ? (
          <>
            <div id="scenes-list" className="space-y-3">
              {displayScenes.map((scene, index) => (
                <Link 
                  key={scene.id} 
                  href={`/scene-detail/${scene.id}`} 
                  id={`scene-${scene.id}`} 
                  className="block"
                >
                  <div className="scene-card bg-white rounded-card shadow-card p-4 card-hover">
                    <div className="scene-card-content flex items-start">
                      <div className="flex-1">
                        <h3 className="scene-card-title text-base font-semibold text-text-primary mb-1">
                          {scene.name}
                        </h3>
                        <p className="scene-card-description text-xs text-text-secondary mb-3">
                          {scene.description}
                        </p>
                        <div className="scene-card-tags flex items-center space-x-2">
                          <span className="scene-card-category text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                            {scene.category}
                          </span>
                          <span className={`scene-card-difficulty text-xs px-2 py-1 rounded-full ${scene.difficulty === '入门' ? 'bg-green-50 text-green-600' : scene.difficulty === '初级' ? 'bg-green-50 text-green-600' : scene.difficulty === '中级' ? 'bg-yellow-50 text-yellow-600' : scene.difficulty === '进阶' ? 'bg-purple-50 text-purple-600' : scene.difficulty === '高级' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                            {scene.difficulty}
                          </span>
                          <span className="scene-card-time text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-600">
                            10分钟
                          </span>
                        </div>
                      </div>
                      <div className="scene-card-icon ml-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                          <span className="text-lg">{getCategoryIcon(scene.category)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* 加载更多触发器 */}
            <div ref={loadMoreRef} className="py-6">
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-text-secondary">加载更多...</p>
                </div>
              )}
              {!hasMore && displayScenes.length > 0 && (
                <p className="text-center text-xs text-text-secondary py-2">
                  已经到底了
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-map-marked-alt text-gray-400 text-2xl"></i>
            </div>
            <h2 className="text-lg font-medium text-text-primary mb-2">暂无场景数据</h2>
            <p className="text-sm text-text-secondary text-center max-w-xs">
              系统中暂无场景学习数据，请稍后再来查看
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
