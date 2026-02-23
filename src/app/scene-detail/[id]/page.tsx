'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import DialogueContent from './components/DialogueContent'
import VocabularyContent from './components/VocabularyContent'
import PlayAllButton from './components/PlayAllButton'

// 定义对话项类型
interface DialogueItem {
  index: number
  speaker: string
  speaker_name: string
  text: string
  translation: string
  audio_url: string
  is_key_qa: boolean
}

// 定义对话分析类型
interface DialogueAnalysis {
  analysis_detail: string
  standard_answer: {
    text: string
    translation: string
    scenario: string
    formality: 'casual' | 'neutral' | 'formal'
  }
  alternative_answers: Array<{
    text: string
    translation: string
    scenario: string
    formality: 'casual' | 'neutral' | 'formal'
  }>
  usage_notes: string
}

// 定义对话轮次类型
interface DialogueRound {
  round_number: number
  content: DialogueItem[]
  analysis?: DialogueAnalysis
}

// 定义词汇类型（新格式）
interface Vocabulary {
  vocab_id: string
  type: string
  content: string
  phonetic: string
  translation: string
  example: string
  example_translation: string
  audio_url: string
  example_audio_url: string
  round_number: number
  difficulty?: 'easy' | 'medium' | 'hard'
}

// 定义场景类型
interface Scene {
  id: string
  name: string
  category: string  // 中文: 日常/职场/留学/旅行/社交
  description: string
  difficulty: string  // 中文: 初级/中级/高级
  duration: number
  tags: string[]
  dialogue: {
    rounds: DialogueRound[]
  }
  vocabulary: Vocabulary[]
  createdAt: string
  updatedAt: string
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

export default function SceneDetail() {
  const params = useParams<{ id: string }>()
  const id = params.id || ''
  
  const [scene, setScene] = useState<Scene | null>(null)
  const [dialogueRounds, setDialogueRounds] = useState<DialogueRound[]>([])
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 获取场景详情的函数
  const getSceneById = async (id: string): Promise<Scene> => {
    try {
      const response = await fetch(`/api/scenes/${id}`)
      
      if (response.ok) {
        const scene = await response.json()
        return scene
      }
      
      // 如果API失败，返回默认数据
      return {
        id: id,
        name: '日常问候',
        category: '日常',
        description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
        difficulty: '初级',
        duration: 10,
        tags: ['问候', '日常', '基础'],
        dialogue: {
          rounds: [
            {
              round_number: 1,
              content: [
                {
                  index: 1,
                  speaker: 'speaker1',
                  speaker_name: 'A',
                  text: 'Hello! How are you today?',
                  translation: '你好！你今天怎么样？',
                  audio_url: `https://cdn.example.com/audio/${id}_r1_1.mp3`,
                  is_key_qa: true
                },
                {
                  index: 2,
                  speaker: 'speaker2',
                  speaker_name: 'B',
                  text: "I'm doing great, thanks! How about you?",
                  translation: '我很好，谢谢！你呢？',
                  audio_url: `https://cdn.example.com/audio/${id}_r1_2.mp3`,
                  is_key_qa: false
                }
              ],
              analysis: {
                analysis_detail: '这是问候场景的基本对话',
                standard_answer: {
                  text: "I'm doing great, thanks! How about you?",
                  translation: '我很好，谢谢！你呢？',
                  scenario: '日常问候',
                  formality: 'neutral'
                },
                alternative_answers: [
                  {
                    text: "I'm fine, thank you. And you?",
                    translation: '我很好，谢谢。你呢？',
                    scenario: '正式场合',
                    formality: 'formal'
                  }
                ],
                usage_notes: '这是最基本的英语问候方式'
              }
            }
          ]
        },
        vocabulary: [
          {
            vocab_id: `vocab_${id}_01`,
            type: 'word',
            content: 'hello',
            phonetic: '/həˈloʊ/',
            translation: '你好',
            example: 'Hello! How are you today?',
            example_translation: '你好！你今天怎么样？',
            audio_url: `https://cdn.example.com/audio/vocab_hello.mp3`,
            example_audio_url: `https://cdn.example.com/audio/vocab_hello_example.mp3`,
            round_number: 1
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(`Error fetching scene ${id}:`, error)
      throw error
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const sceneData = await getSceneById(id)
        setScene(sceneData)
        
        // 新格式：dialogue 是 {rounds: [...]} 结构
        setDialogueRounds(sceneData.dialogue?.rounds || [])
        setVocabulary(sceneData.vocabulary || [])
      } catch (error) {
        console.error('Error fetching scene data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])
  
  // 如果场景数据未加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-3 border-[#4F7CF0]/20 border-t-[#4F7CF0] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    )
  }
  
  if (!scene) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600 font-medium">场景不存在</p>
        </div>
      </div>
    )
  }

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
            
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
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
