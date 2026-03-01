'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/Loading'

interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

// 分类配色
const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  '全部':    { icon: '📚', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '日常':    { icon: '☀️', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '日常问候': { icon: '👋', color: '#4F7CF0', bgColor: '#EEF2FF' },
  '留学':    { icon: '🎓', color: '#8B5CF6', bgColor: '#EDE9FE' },
  '职场':    { icon: '💼', color: '#F59E0B', bgColor: '#FEF3C7' },
  '购物消费': { icon: '🛍️', color: '#FF7043', bgColor: '#FFF4F0' },
  '餐饮服务': { icon: '🍽️', color: '#F59E0B', bgColor: '#FFF8EE' },
  '旅行出行': { icon: '✈️', color: '#34D399', bgColor: '#F0FFF4' },
  '酒店住宿': { icon: '🏨', color: '#3B82F6', bgColor: '#DBEAFE' },
  '医疗健康': { icon: '🏥', color: '#EF4444', bgColor: '#FEE2E2' },
  '银行金融': { icon: '🏦', color: '#10B981', bgColor: '#D1FAE5' },
  '商务会议': { icon: '📊', color: '#6366F1', bgColor: '#E0E7FF' },
}

const difficultyConfig: Record<string, { color: string; bgColor: string }> = {
  '入门': { color: '#10B981', bgColor: '#D1FAE5' },
  '初级': { color: '#10B981', bgColor: '#D1FAE5' },
  '中级': { color: '#3B82F6', bgColor: '#DBEAFE' },
  '进阶': { color: '#8B5CF6', bgColor: '#EDE9FE' },
  '高级': { color: '#F59E0B', bgColor: '#FEF3C7' },
  '挑战': { color: '#EF4444', bgColor: '#FEE2E2' },
}

const PAGE_SIZE = 10

export default function SceneLearningList() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 获取场景列表
  const fetchScenes = async (
    pageNum: number,
    category?: string,
    search?: string
  ): Promise<{ scenes: Scene[]; hasMore: boolean; totalCount: number }> => {
    try {
      const categoryParam = category && category !== '全部' ? `&category=${encodeURIComponent(category)}` : ''
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/scenes?page=${pageNum}&pageSize=${PAGE_SIZE}${categoryParam}${searchParam}`)
      if (!res.ok) return { scenes: [], hasMore: false, totalCount: 0 }
      const result = await res.json()
      return {
        scenes: result.data || [],
        hasMore: result.pagination?.hasMore || false,
        totalCount: result.pagination?.totalCount || 0,
      }
    } catch {
      return { scenes: [], hasMore: false, totalCount: 0 }
    }
  }

  // 初始化：加载分类 + 第一页场景
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const [scenesData, catRes] = await Promise.all([
        fetchScenes(1),
        fetch('/api/scenes/categories').then((r) => r.ok ? r.json() : { categories: [] }).catch(() => ({ categories: [] })),
      ])
      setScenes(scenesData.scenes)
      setHasMore(scenesData.hasMore)
      setTotalCount(scenesData.totalCount)
      setCategories(['全部', ...(catRes.categories || [])])
      setIsLoading(false)
    }
    init()
  }, [])

  // 分类 / 搜索变化时重新加载
  useEffect(() => {
    const reload = async () => {
      setIsLoading(true)
      setPage(1)
      const data = await fetchScenes(1, selectedCategory, searchQuery)
      setScenes(data.scenes)
      setHasMore(data.hasMore)
      setTotalCount(data.totalCount)
      setIsLoading(false)
    }
    reload()
  }, [selectedCategory, searchQuery])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    const data = await fetchScenes(nextPage, selectedCategory, searchQuery)
    setScenes((prev) => [...prev, ...data.scenes])
    setPage(nextPage)
    setHasMore(data.hasMore)
    setIsLoadingMore(false)
  }, [page, isLoadingMore, hasMore, selectedCategory, searchQuery])

  // 无限滚动
  useEffect(() => {
    const onScroll = () => {
      if (isLoadingMore || !hasMore) return
      const { scrollY, innerHeight } = window
      const { scrollHeight } = document.documentElement
      if (scrollY + innerHeight >= scrollHeight - 200) loadMore()
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [loadMore, hasMore, isLoadingMore])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-8">

        {/* 标题 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">场景学习 <span className="text-xs font-normal text-white bg-[#4F7CF0] px-2 py-0.5 rounded-full align-middle">新</span></h1>
          <p className="text-sm text-gray-500">分阶段学习，AI陪练对话</p>
        </motion.div>

        {/* 搜索框 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            aria-label="搜索场景"
            placeholder="搜索场景..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-2xl pl-12 pr-4 py-3.5 text-base text-gray-700 placeholder:text-gray-400 outline-none shadow-sm border border-gray-100 focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/10 transition-all"
          />
        </motion.div>

        {/* 分类筛选 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat
            const cfg = categoryConfig[cat] || categoryConfig['全部']
            return (
              <motion.button
                key={cat}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(cat)}
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100'
                }`}
                style={{ backgroundColor: isActive ? cfg.color : undefined }}
              >
                <span aria-hidden="true">{cfg.icon}</span>
                <span>{cat}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* 数量 */}
        <div className="mb-4 text-sm font-medium text-gray-600">
          共 <span className="text-[#4F7CF0] font-bold">{totalCount}</span> 个场景
        </div>

        {/* 列表 */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-200 shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16" />
                      <div className="h-6 bg-gray-200 rounded-full w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : scenes.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium">暂无相关场景</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {scenes.map((scene, i) => {
              const cfg = categoryConfig[scene.category] || categoryConfig['全部']
              const diff = difficultyConfig[scene.difficulty] || { color: '#6B7280', bgColor: '#F3F4F6' }
              return (
                <motion.div key={scene.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                  {/* 跳转到 scene-overview 而非 scene-detail */}
                  <Link href={`/scene-overview/${scene.id}`}>
                    <motion.div whileTap={{ scale: 0.98 }} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* 场景图标 */}
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: cfg.bgColor }}>
                            {cfg.icon}
                          </div>
                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-gray-900 text-base truncate">{scene.name}</h3>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-[#4F7CF0] transition-colors shrink-0 mt-0.5">
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{scene.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>{scene.category}</span>
                              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: diff.color, backgroundColor: diff.bgColor }}>{scene.difficulty}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: cfg.color }} />
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}

            {/* 加载更多 */}
            <div className="py-8 flex flex-col items-center">
              {isLoadingMore && <><LoadingSpinner size="md" /><p className="text-xs text-gray-400 mt-3">加载更多...</p></>}
              {!hasMore && scenes.length > 0 && (
                <div className="text-center">
                  <div className="w-12 h-px bg-gray-200 mx-auto mb-3" />
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
