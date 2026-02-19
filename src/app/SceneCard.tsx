'use client'

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

interface SceneCardProps {
  scene: Scene
  index: number
}

// 分类渐变映射
const categoryGradients: Record<string, string> = {
  '日常问候': 'from-[#4F7CF0] to-[#7B5FE8]',
  '购物消费': 'from-[#FF7043] to-[#FF9A76]',
  '超市购物': 'from-[#FF7043] to-[#FF9A76]',
  '餐饮服务': 'from-[#F59E0B] to-[#FBBF24]',
  '餐厅点餐': 'from-[#F59E0B] to-[#FBBF24]',
  '旅行出行': 'from-[#34D399] to-[#6EE7B7]',
  '机场值机': 'from-[#34D399] to-[#6EE7B7]',
}

// 分类表情映射
const categoryEmojis: Record<string, string> = {
  '日常问候': '👋',
  '购物消费': '🛒',
  '超市购物': '🛒',
  '餐饮服务': '🍽️',
  '餐厅点餐': '🍽️',
  '旅行出行': '✈️',
  '机场值机': '✈️',
}

// 难度标签映射
const difficultyConfig: Record<string, { label: string; color: string }> = {
  '入门': { label: '入门', color: 'bg-green-100 text-green-700' },
  '初级': { label: '初级', color: 'bg-green-100 text-green-700' },
  '中级': { label: '中级', color: 'bg-blue-100 text-blue-700' },
  '进阶': { label: '进阶', color: 'bg-purple-100 text-purple-700' },
  '高级': { label: '高级', color: 'bg-red-100 text-red-700' },
}

// 右箭头图标
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default function SceneCard({ scene, index }: SceneCardProps) {
  const gradient = categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]'
  const emoji = categoryEmojis[scene.category] || '📚'
  const difficulty = difficultyConfig[scene.difficulty] || { label: scene.difficulty, color: 'bg-gray-100 text-gray-600' }
  
  // 计算学习时间
  const learningTime = scene.dialogueCount ? `${scene.dialogueCount * 2}分钟` : '10分钟'

  return (
    <Link href={`/scene-detail/${scene.id}`} className="block">
      <motion.div
        whileTap={{ scale: 0.99 }}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
              <span className="text-lg">{emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-base truncate">{scene.name}</div>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{scene.description}</p>
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
          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
            {learningTime}
          </span>
        </div>
      </motion.div>
    </Link>
  )
}
