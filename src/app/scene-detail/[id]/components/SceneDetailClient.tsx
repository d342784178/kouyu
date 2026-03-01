'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import DialogueContent from './DialogueContent'
import VocabularyContent from './VocabularyContent'
import PlayAllButton from './PlayAllButton'
import ShadowingModule from './ShadowingModule'
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

  // 控制跟读练习模块的展开/收起状态
  const [showShadowing, setShowShadowing] = useState(false)

  // 场景分类颜色映射
  const categoryColorMap: Record<string, { bgColor: string; textColor: string }> = {
    '日常': { bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    '职场': { bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    '留学': { bgColor: 'bg-green-50', textColor: 'text-green-600' },
    '旅行': { bgColor: 'bg-green-50', textColor: 'text-green-600' },
    '社交': { bgColor: 'bg-purple-50', textColor: 'text-purple-600' }
  }

  const categoryColor = categoryColorMap[scene.category] || { bgColor: 'bg-gray-50', textColor: 'text-gray-600' }

  return (
    <div className="min-h-screen bg-bg-secondary pb-24 safe-bottom">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border-light safe-top">
        <div className="max-w-[430px] mx-auto mx-6 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/scene-list" 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon />
            </Link>
            
            <h1 className="text-lg font-semibold text-text-primary">{scene.name}</h1>
            
            <button type="button" aria-label="分享" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ShareIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto mx-6 pt-4 space-y-6">
        {/* 场景信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-card p-6 shadow-card border border-border-light hover:shadow-card-hover transition-all"
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
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${categoryColor.bgColor} ${categoryColor.textColor}`}>
                {scene.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <ClockIcon />
                {scene.duration}分钟
              </span>
            </div>
            {/* 传递对话轮次给 PlayAllButton */}
            <PlayAllButton rounds={dialogueRounds} />
          </div>
          
          {/* 描述 */}
          <p className="text-sm text-text-secondary leading-relaxed">{scene.description}</p>
          
          {/* 标签 */}
          {scene.tags && scene.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {scene.tags.map((tag, index) => (
                <span key={index} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
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
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DialogueIcon />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">对话学习</h2>
            <span className="text-xs text-text-secondary ml-auto">
              {dialogueRounds.length} 轮对话
            </span>
          </div>
          
          <div className="bg-white rounded-card p-6 shadow-card border border-border-light hover:shadow-card-hover transition-all">
            {/* 传递对话轮次给 DialogueContent */}
            <DialogueContent rounds={dialogueRounds} />
          </div>
        </motion.div>

        {/* 跟读练习入口 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* 入口按钮卡片 */}
          <button
            type="button"
            onClick={() => setShowShadowing(!showShadowing)}
            className="w-full bg-white rounded-card p-4 shadow-card border border-border-light flex items-center justify-between hover:bg-amber-50/50 transition-all transform hover:-translate-y-1"
          >
            {/* 左侧：麦克风图标 + 文字 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                {/* 麦克风 SVG 图标 */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <span className="text-base font-semibold text-text-primary">跟读练习</span>
            </div>
            {/* 右侧：展开/收起箭头图标 */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-text-secondary transition-transform duration-300 ${showShadowing ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* 展开时渲染 ShadowingModule */}
          {showShadowing && (
            <ShadowingModule
              rounds={dialogueRounds}
              onExit={() => setShowShadowing(false)}
            />
          )}
        </motion.div>

        {/* 高频词汇 */}
        {vocabulary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">高频词汇</h2>
            <span className="text-xs text-text-secondary ml-auto">{vocabulary.length} 个词汇</span>
            </div>
            
            <div className="bg-white rounded-card p-6 shadow-card border border-border-light hover:shadow-card-hover transition-all">
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
            className="block w-full py-4 bg-primary text-white rounded-card text-base font-semibold text-center shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            开始测试
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
