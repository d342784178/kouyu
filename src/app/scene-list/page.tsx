'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

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

// 分类配置
const categoryConfig: Record<string, { icon: string; gradient: string }> = {
  '全部': { icon: '🌟', gradient: 'from-[#4F7CF0] to-[#7B5FE8]' },
  '日常问候': { icon: '👋', gradient: 'from-[#4F7CF0] to-[#7B5FE8]' },
  '购物消费': { icon: '🛒', gradient: 'from-[#FF7043] to-[#FF9A76]' },
  '餐饮服务': { icon: '🍽️', gradient: 'from-[#F59E0B] to-[#FBBF24]' },
  '旅行出行': { icon: '✈️', gradient: 'from-[#34D399] to-[#6EE7B7]' },
}

// 难度配置
const difficultyConfig: Record<string, { label: string; color: string }> = {
  '入门': { label: '入门', color: 'bg-green-100 text-green-700' },
  '初级': { label: '初级', color: 'bg-green-100 text-green-700' },
  '中级': { label: '中级', color: 'bg-blue-100 text-blue-700' },
  '进阶': { label: '进阶', color: 'bg-purple-100 text-purple-700' },
  '高级': { label: '高级', color: 'bg-red-100 text-red-700' },
}

// 搜索图标
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// 时钟图标
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// 书本图标
function BookOpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

// 右箭头图标
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

// 每页加载数量
const PAGE_SIZE = 10

export default function SceneList() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [filteredScenes, setFilteredScenes] = useState<Scene[]>([])
  const [displayScenes, setDisplayScenes] = useState<Scene[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
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
        setCategories(['全部', ...uniqueCategories])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 根据分类和搜索筛选场景
  useEffect(() => {
    let filtered = scenes
    
    // 分类筛选
    if (selectedCategory !== '全部') {
      filtered = filtered.filter(scene => scene.category === selectedCategory)
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(scene => 
        scene.name.toLowerCase().includes(query) ||
        scene.description.toLowerCase().includes(query)
      )
    }
    
    setFilteredScenes(filtered)
    // 重置分页
    setDisplayScenes(filtered.slice(0, PAGE_SIZE))
    setPage(1)
    setHasMore(filtered.length > PAGE_SIZE)
  }, [selectedCategory, searchQuery, scenes])

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

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h1 className="text-xl font-bold text-gray-800 mb-1">场景学习</h1>
          <p className="text-sm text-gray-400">在真实场景中练习英语口语</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4"
        >
          <SearchIcon />
          <input
            placeholder="搜索场景..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-400 ml-2"
          />
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category
            const config = categoryConfig[category] || { icon: '📚', gradient: 'from-[#4F7CF0] to-[#7B5FE8]' }
            
            return (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm transition-all ${
                  isActive
                    ? 'bg-[#4F7CF0] text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100'
                }`}
              >
                <span>{config.icon}</span>
                <span>{category}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Scene Count */}
        <div className="mb-3">
          <span className="text-sm text-gray-400">{filteredScenes.length} 个场景</span>
        </div>

        {/* Scene List */}
        {isLoading ? (
          // 加载骨架屏
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredScenes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100"
          >
            <div className="text-3xl mb-3">🎭</div>
            <p className="text-gray-400 text-sm">暂无相关场景</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {displayScenes.map((scene, i) => {
              const config = categoryConfig[scene.category] || { icon: '📚', gradient: 'from-[#4F7CF0] to-[#7B5FE8]' }
              const difficulty = difficultyConfig[scene.difficulty] || { label: scene.difficulty, color: 'bg-gray-100 text-gray-600' }
              const learningTime = scene.dialogueCount ? `${scene.dialogueCount * 2}分钟` : '10分钟'
              
              return (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <Link href={`/scene-detail/${scene.id}`}>
                    <motion.div
                      whileTap={{ scale: 0.99 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Gradient header strip */}
                      <div className={`bg-gradient-to-r ${config.gradient} h-1.5`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0`}>
                              <span className="text-lg">{config.icon}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{scene.name}</div>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 max-w-[200px]">
                                {scene.description}
                              </p>
                            </div>
                          </div>
                          <ChevronRightIcon />
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs bg-[#EEF2FF] text-[#4F7CF0] px-2.5 py-1 rounded-full">
                            {scene.category}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${difficulty.color}`}>
                            {difficulty.label}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ClockIcon />
                            {learningTime}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <BookOpenIcon />
                            {scene.dialogueCount || 5}轮对话
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
            
            {/* 加载更多触发器 */}
            <div ref={loadMoreRef} className="py-6">
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#4F7CF0] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-gray-400">加载更多...</p>
                </div>
              )}
              {!hasMore && displayScenes.length > 0 && (
                <p className="text-center text-xs text-gray-400 py-2">
                  已经到底了
                </p>
              )}
            </div>
          </div>
        )}

        {/* Categories Overview */}
        {selectedCategory === '全部' && !searchQuery && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 mb-2"
          >
            <div className="font-semibold text-gray-800 mb-3">场景分类</div>
            <div className="grid grid-cols-2 gap-3">
              {categories.filter(c => c !== '全部').map((category, index) => {
                const config = categoryConfig[category] || { icon: '📚', gradient: 'from-[#4F7CF0] to-[#7B5FE8]' }
                const count = scenes.filter(s => s.category === category).length
                
                return (
                  <motion.button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-4 text-white text-left shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className="text-2xl mb-2">{config.icon}</div>
                    <div className="text-sm font-semibold">{category}</div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {count} 个场景
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
