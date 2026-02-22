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

// 分类配置 - 优化配色
const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  '全部': { icon: '✨', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '日常问候': { icon: '👋', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '购物消费': { icon: '🛍️', color: '#FF7043', bgColor: '#FFF4F0' },
  '餐饮服务': { icon: '🍽️', color: '#F59E0B', bgColor: '#FFF8EE' },
  '旅行出行': { icon: '✈️', color: '#34D399', bgColor: '#F0FFF4' },
}

// 难度配置 - 优化标签样式
const difficultyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  '入门': { label: '入门', color: '#10B981', bgColor: '#D1FAE5' },
  '初级': { label: '初级', color: '#10B981', bgColor: '#D1FAE5' },
  '中级': { label: '中级', color: '#3B82F6', bgColor: '#DBEAFE' },
  '进阶': { label: '进阶', color: '#8B5CF6', bgColor: '#EDE9FE' },
  '高级': { label: '高级', color: '#F59E0B', bgColor: '#FEF3C7' },
  '挑战': { label: '挑战', color: '#EF4444', bgColor: '#FEE2E2' },
}

// 搜索图标
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// 右箭头图标
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

// 场景图标
function SceneIcon({ category }: { category: string }) {
  const config = categoryConfig[category] || categoryConfig['全部']
  return (
    <div 
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
      style={{ backgroundColor: config.bgColor }}
    >
      {config.icon}
    </div>
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
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-8">
        
        {/* Header - 优化标题样式 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">场景学习</h1>
          <p className="text-sm text-gray-500">在真实场景中练习英语口语</p>
        </motion.div>

        {/* Search - 优化搜索框样式 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-5"
        >
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            placeholder="搜索场景..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-2xl pl-12 pr-4 py-3.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none shadow-sm border border-gray-100 focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/10 transition-all"
          />
        </motion.div>

        {/* Category Filter - 优化分类标签 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category
            const config = categoryConfig[category] || categoryConfig['全部']
            
            return (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-100 hover:border-gray-200'
                }`}
                style={{
                  backgroundColor: isActive ? config.color : undefined,
                }}
              >
                <span>{config.icon}</span>
                <span>{category}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Scene Count - 优化计数显示 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">
            共 <span className="text-[#4F7CF0] font-bold">{filteredScenes.length}</span> 个场景
          </span>
        </div>

        {/* Scene List - 优化卡片设计 */}
        {isLoading ? (
          // 加载骨架屏 - 优化样式
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-200 shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
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
            className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"
          >
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium">暂无相关场景</p>
            <p className="text-xs text-gray-400 mt-1">试试其他关键词</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {displayScenes.map((scene, i) => {
              const config = categoryConfig[scene.category] || categoryConfig['全部']
              const difficulty = difficultyConfig[scene.difficulty] || { label: scene.difficulty, color: '#6B7280', bgColor: '#F3F4F6' }
              
              return (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link href={`/scene-detail/${scene.id}`}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* 场景图标 */}
                          <SceneIcon category={scene.category} />
                          
                          {/* 内容区域 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-gray-900 text-base truncate">
                                {scene.name}
                              </h3>
                              <ChevronRightIcon className="text-gray-300 group-hover:text-[#4F7CF0] transition-colors shrink-0 mt-0.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {scene.description}
                            </p>
                            
                            {/* 标签区域 - 优化样式 */}
                            <div className="flex items-center gap-2 mt-3">
                              <span 
                                className="text-xs font-medium px-3 py-1 rounded-full"
                                style={{ color: config.color, backgroundColor: config.bgColor }}
                              >
                                {scene.category}
                              </span>
                              <span 
                                className="text-xs font-medium px-3 py-1 rounded-full"
                                style={{ color: difficulty.color, backgroundColor: difficulty.bgColor }}
                              >
                                {difficulty.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 底部装饰条 */}
                      <div 
                        className="h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: config.color }}
                      />
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
            
            {/* 加载更多触发器 */}
            <div ref={loadMoreRef} className="py-8">
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-3 border-[#4F7CF0]/20 border-t-[#4F7CF0] rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-gray-400">加载更多...</p>
                </div>
              )}
              {!hasMore && displayScenes.length > 0 && (
                <div className="text-center py-4">
                  <div className="w-12 h-px bg-gray-200 mx-auto mb-3"></div>
                  <p className="text-xs text-gray-400">已经到底了</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
