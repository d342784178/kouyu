'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import DialogueContent from './DialogueContent'
import VocabularyContent from './VocabularyContent'
import PlayAllButton from './PlayAllButton'
import type { DialogueRound, VocabularyItem } from '@/types'

// 难度配置（支持中文）
const difficultyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  '初级': { label: '初级', color: '#10B981', bgColor: '#D1FAE5' },
  '中级': { label: '中级', color: '#3B82F6', bgColor: '#DBEAFE' },
  '高级': { label: '高级', color: '#F59E0B', bgColor: '#FEF3C7' },
  // 保留英文映射以兼容旧数据
  'beginner': { label: '初级', color: '#10B981', bgColor: '#D1FAE5' },
  'intermediate': { label: '中级', color: '#3B82F6', bgColor: '#DBEAFE' },
  'advanced': { label: '高级', color: '#F59E0B', bgColor: '#FEF3C7' },
}

// 返回箭头图标
function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

// 分享图标
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

// 时钟图标
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// 对话图标
function DialogueIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

interface SceneDetailClientProps {
  scene: {
    id: string
    name: string
    category: string
    description: string
    difficulty: string
    duration: number
    tags: string[]
    dialogue: DialogueRound[]
    vocabulary: VocabularyItem[]
  }
}

export default function SceneDetailClient({ scene }: SceneDetailClientProps) {
  const dialogueRounds = scene.dialogue || []
  const vocabulary = scene.vocabulary || []
  const difficulty = difficultyConfig[scene.difficulty] || { label: scene.difficulty, color: '#6B7280', bgColor: '#F3F4F6' }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-24">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[430px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/scene-list" 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon />
            </Link>
            
            <h1 className="text-lg font-bold text-gray-900">{scene.name}</h1>
            
            <button type="button" aria-label="分享" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ShareIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pt-4">
        {/* 场景信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6"
        >
          {/* 标签和操作 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span 
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ color: difficulty.color, backgroundColor: difficulty.bgColor }}
              >
                {difficulty.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon />
                {scene.duration}分钟
              </span>
            </div>
            {/* 传递对话轮次给 PlayAllButton */}
            <PlayAllButton rounds={dialogueRounds} />
          </div>
          
          {/* 描述 */}
          <p className="text-sm text-gray-600 leading-relaxed">{scene.description}</p>
          
          {/* 标签 */}
          {scene.tags && scene.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {scene.tags.map((tag, index) => (
                <span key={index} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* 对话内容 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#4F7CF0]/10 flex items-center justify-center">
              <DialogueIcon />
            </div>
            <h2 className="text-lg font-bold text-gray-900">对话学习</h2>
            <span className="text-xs text-gray-400 ml-auto">
              {dialogueRounds.length} 轮对话
            </span>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {/* 传递对话轮次给 DialogueContent */}
            <DialogueContent rounds={dialogueRounds} />
          </div>
        </motion.div>

        {/* 高频词汇 */}
        {vocabulary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">高频词汇</h2>
              <span className="text-xs text-gray-400 ml-auto">{vocabulary.length} 个词汇</span>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <VocabularyContent vocabulary={vocabulary} />
            </div>
          </motion.div>
        )}

        {/* 开始测试按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 mb-24"
        >
          <Link 
            href={`/scene-test/${scene.id}`}
            className="block w-full py-4 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl text-base font-bold text-center shadow-lg shadow-[#4F7CF0]/25 hover:shadow-xl hover:shadow-[#4F7CF0]/30 transition-all active:scale-[0.98]"
          >
            开始测试
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
