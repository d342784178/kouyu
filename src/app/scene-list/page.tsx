'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/Loading'

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

// 分类配置 - 优化配色和图标
const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  '全部': { icon: '📚', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '日常': { icon: '☀️', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '日常问候': { icon: '👋', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '留学': { icon: '🎓', color: '#8B5CF6', bgColor: '#EDE9FE' },
  '职场': { icon: '💼', color: '#F59E0B', bgColor: '#FEF3C7' },
  '购物消费': { icon: '🛍️', color: '#FF7043', bgColor: '#FFF4F0' },
  '餐饮服务': { icon: '🍽️', color: '#F59E0B', bgColor: '#FFF8EE' },
  '旅行出行': { icon: '✈️', color: '#34D399', bgColor: '#F0FFF4' },
  '酒店住宿': { icon: '🏨', color: '#3B82F6', bgColor: '#DBEAFE' },
  '医疗健康': { icon: '🏥', color: '#EF4444', bgColor: '#FEE2E2' },
  '银行金融': { icon: '🏦', color: '#10B981', bgColor: '#D1FAE5' },
  '商务会议': { icon: '📊', color: '#6366F1', bgColor: '#E0E7FF' },
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
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 获取场景列表的函数
  const fetchScenes = async (pageNum: number, category?: string, search?: string): Promise<{ scenes: Scene[]; hasMore: boolean; totalCount: number }> => {
    try {
      const categoryParam = category && category !== '全部' ? `&category=${encodeURIComponent(category)}` : ''
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const response = await fetch(`/api/scenes?page=${pageNum}&pageSize=${PAGE_SIZE}${categoryParam}${searchParam}`)
      
      if (response.ok) {
        const result = await response.json()
        return {
          scenes: result.data || [],
          hasMore: result.pagination?.hasMore || false,
          totalCount: result.pagination?.totalCount || 0
        }
      } else {
        console.error('API call failed:', response.status)
        return { scenes: [], hasMore: false, totalCount: 0 }
      }
    } catch (error) {
      console.error('Error fetching scenes:', error)
      return { scenes: [], hasMore: false, totalCount: 0 }
    }
  }

  // 获取分类列表的函数
  const fetchCategories = async (): Promise<{ categories: string[]; categoryCounts: Record<string, number> }> => {
    try {
      const response = await fetch('/api/scenes/categories')
      if (response.ok) {
        const result = await response.json()
        return {
          categories: result.categories || [],
          categoryCounts: result.categoryCounts || {}
        }
      }
      return { categories: [], categoryCounts: {} }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return { categories: [], categoryCounts: {} }
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        const [scenesData, categoriesData] = await Promise.all([
          fetchScenes(1),
          fetchCategories()
        ])
        
        setScenes(scenesData.scenes)
        setFilteredScenes(scenesData.scenes)
        setDisplayScenes(scenesData.scenes)
        setHasMore(scenesData.hasMore)
        setTotalCount(scenesData.totalCount)
        setCategories(['全部', ...categoriesData.categories])
        setCategoryCounts(categoriesData.categoryCounts)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 根据分类切换重新获取数据
  useEffect(() => {
    // 只在分类改变时触发，避免初始化时重复请求
    if (selectedCategory) {
      const fetchDataByCategory = async () => {
        try {
          setIsLoading(true)
          setPage(1)
          
          const scenesData = await fetchScenes(1, selectedCategory)
          
          setScenes(scenesData.scenes)
          setFilteredScenes(scenesData.scenes)
          setDisplayScenes(scenesData.scenes)
          setHasMore(scenesData.hasMore)
          setTotalCount(scenesData.totalCount)
        } catch (error) {
          console.error('Error fetching data by category:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchDataByCategory()
    }
  }, [selectedCategory])

  // 根据搜索词调用后端API
  useEffect(() => {
    const fetchDataBySearch = async () => {
      try {
        setIsLoading(true)
        setPage(1)
        
        const scenesData = await fetchScenes(1, selectedCategory, searchQuery)
        
        setScenes(scenesData.scenes)
        setFilteredScenes(scenesData.scenes)
        setDisplayScenes(scenesData.scenes)
        setHasMore(scenesData.hasMore)
        setTotalCount(scenesData.totalCount)
      } catch (error) {
        console.error('Error fetching data by search:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDataBySearch()
  }, [searchQuery, selectedCategory])

  // 加载更多场景
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    try {
      const nextPage = page + 1
      const { scenes: newScenes, hasMore: more } = await fetchScenes(nextPage, selectedCategory, searchQuery)
      
      setScenes(prev => [...prev, ...newScenes])
      setDisplayScenes(prev => [...prev, ...newScenes])
      setPage(nextPage)
      setHasMore(more)
    } catch (error) {
      console.error('Error loading more scenes:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [page, isLoadingMore, hasMore, selectedCategory, searchQuery])

  // 使用滚动事件实现无限滚动
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || !hasMore) return
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      // 距离底部200px时触发加载
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
            type="text"
            aria-label="搜索场景"
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
                type="button"
                aria-pressed={isActive}
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
                <span aria-hidden="true">{config.icon}</span>
                <span>{category}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Scene Count - 优化计数显示 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">
            共 <span className="text-[#4F7CF0] font-bold">
              {totalCount}
            </span> 个场景
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
            <div className="py-8">
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-gray-400 mt-3">加载更多...</p>
                </div>
              )}
              {hasMore && !isLoadingMore && (
                <div className="h-10 flex items-center justify-center">
                  <p className="text-xs text-gray-400">下拉加载更多</p>
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
