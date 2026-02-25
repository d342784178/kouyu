'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import SceneCard from './SceneCard'
import CircularProgress from '@/components/CircularProgress'

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

// 用户进度数据
const mockUserProgress = {
  todayLearned: 12,
  todayMinutes: 25,
  consecutiveDays: 7,
  reviewCount: 8,
  totalLearned: 156,
}

// 搜索图标
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// 右箭头图标
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

// 时钟图标
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// 闪电图标
function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [randomPhrases, setRandomPhrases] = useState<Phrase[]>([])
  const [recommendedScenes, setRecommendedScenes] = useState<Scene[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const progress = mockUserProgress
  const progressPercentage = Math.round((progress.todayLearned / 20) * 100)

  // 获取随机短语的函数
  const getRandomPhrases = async (count: number = 2): Promise<Phrase[]> => {
    try {
      const response = await fetch('/api/phrases')
      if (!response.ok) {
        throw new Error('Failed to fetch phrases')
      }
      
      const allPhrases: Phrase[] = await response.json()
      const shuffled = [...allPhrases].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    } catch (error) {
      console.error('Error fetching random phrases:', error)
      return []
    }
  }

  // 获取推荐场景的函数
  const getRecommendedScenes = async (count: number = 3): Promise<Scene[]> => {
    try {
      const response = await fetch(`/api/scenes?pageSize=${count}`)
      
      if (response.ok) {
        const result = await response.json()
        const scenes: Scene[] = result.data || []
        const shuffled = [...scenes].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
      } else {
        return [
          {
            id: 'scene_1',
            name: '机场值机',
            category: '旅行出行',
            description: '学习在机场办理值机手续的常用对话',
            difficulty: '中级',
            coverImage: null,
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
            coverImage: null,
            dialogueCount: 6,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'scene_3',
            name: '超市购物',
            category: '购物消费',
            description: '学习在超市购物时的常用英语表达',
            difficulty: '初级',
            coverImage: null,
            dialogueCount: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
    } catch (error) {
      console.error('Error fetching recommended scenes:', error)
      return []
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const phrases = await getRandomPhrases(2)
        const scenes = await getRecommendedScenes(3)
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

  // 快速操作按钮数据
  const quickActions = [
    { icon: '🎯', label: '每日任务', color: 'bg-[#EEF2FF]', textColor: 'text-[#4F7CF0]' },
    { icon: '🔥', label: '热门场景', color: 'bg-[#FFF4F0]', textColor: 'text-[#FF7043]' },
    { icon: '📊', label: '学习报告', color: 'bg-[#F0FFF4]', textColor: 'text-[#34D399]' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">
        
        {/* Search Bar + Avatar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <SearchIcon />
            <input
              type="text"
              aria-label="搜索短语"
              placeholder="搜索短语..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-400 ml-2"
            />
          </div>
          <Link href="/profile">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center shadow-sm shrink-0 cursor-pointer"
            >
              <span className="text-white text-sm font-semibold">我</span>
            </motion.div>
          </Link>
        </div>

        {/* Today's Learning Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-800">今日学习</span>
            <Link href="/profile" className="text-sm text-[#4F7CF0] flex items-center gap-0.5 hover:opacity-80 transition-opacity">
              查看全部
              <ChevronRightIcon />
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <CircularProgress
              value={progressPercentage}
              size={88}
              strokeWidth={9}
              label={`${progressPercentage}%`}
              sublabel="完成度"
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">已学短语</span>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayLearned}/20
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">学习时长</span>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayMinutes}分钟
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">连续天数</span>
                <span className="text-sm font-semibold text-[#FF7043]">
                  {progress.consecutiveDays}天
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review Reminder */}
        {progress.reviewCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-[#FFF4F0] rounded-2xl p-4 mb-5 border border-[#FFE4D9]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#FF7043] flex items-center justify-center shadow-sm shrink-0">
                  <ClockIcon />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">复习提醒</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    有{progress.reviewCount}个短语需要复习
                  </div>
                </div>
              </div>
              <Link href="/phrase-library">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="text-sm font-medium text-[#FF7043] bg-white rounded-xl px-3 py-1.5 shadow-sm border border-[#FFE4D9] hover:bg-gray-50 transition-colors"
                >
                  去复习
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {quickActions.map((item, index) => (
            <motion.button
              key={item.label}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${item.color} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:opacity-90 transition-opacity`}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Recommended Scenes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800">推荐场景</span>
            <Link href="/scene-list" className="text-sm text-[#4F7CF0] flex items-center gap-0.5 hover:opacity-80 transition-opacity">
              更多
              <ChevronRightIcon />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              // 加载骨架屏
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))
            ) : (
              recommendedScenes.map((scene, i) => (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                >
                  <SceneCard scene={scene} index={i} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Daily Tip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-2xl p-4 mb-4 text-white"
        >
          <div className="flex items-start gap-3">
            <ZapIcon />
            <div>
              <div className="text-sm font-semibold mb-1">每日一句</div>
              <div className="text-sm opacity-90 italic">
                &ldquo;The best time to plant a tree was 20 years ago. The second best time is now.&rdquo;
              </div>
              <div className="text-xs opacity-70 mt-1">种树最好的时机是20年前，其次是现在。</div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
