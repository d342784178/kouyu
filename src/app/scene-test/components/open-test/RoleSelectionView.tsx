'use client'

import { motion } from 'framer-motion'
import { Target, CheckCircle, MessageSquare, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { RoleSelectionViewProps, DifficultyLevel, DifficultyConfig } from './types'

const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    label: '入门',
    desc: 'AI语速慢，词汇简单',
    color: 'text-[#4F7CF0]',
    bg: 'bg-white border-[#4F7CF0]'
  },
  medium: {
    label: '标准',
    desc: '正常语速，日常词汇',
    color: 'text-[#4F7CF0]',
    bg: 'bg-white border-[#4F7CF0]'
  },
  hard: {
    label: '挑战',
    desc: '正常语速，地道表达',
    color: 'text-[#4F7CF0]',
    bg: 'bg-white border-[#4F7CF0]'
  }
}

export default function RoleSelectionView({
  questionAnalysis,
  selectedRole,
  difficultyLevel,
  voiceEnabled,
  error,
  sceneName,
  onSelectRole,
  onSelectDifficulty,
  onToggleVoice,
  onConfirm,
  onClearError
}: RoleSelectionViewProps) {
  if (!questionAnalysis) return null

  const { sceneType, sceneDescription, userRoles, dialogueGoal, suggestedTopics } = questionAnalysis

  return (
    <div className="w-full h-full flex flex-col bg-[#F5F6FA]">
      {/* Scene Banner - 渐变头部 - 固定高度，使用 mx-6 规范 */}
      <div className="bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] mx-6 mt-0 rounded-2xl shrink-0 overflow-hidden">
        <div className="px-6 pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="text-base">📊</span>
              题目分析完成
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-xl">{userRoles[0]?.emoji || '🙋'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white/70 mb-0.5">{sceneType}</p>
              <h3 className="text-white font-semibold text-lg leading-tight truncate">{sceneName}</h3>
            </div>
          </div>
          <p className="text-white/80 text-[13px] mt-2 leading-relaxed line-clamp-2">{sceneDescription}</p>
        </div>
      </div>

      {/* 内容区域 - 使用 mx-6 规范 */}
      <div className="px-6 pt-4 pb-24 space-y-4">
        {/* Dialogue Goal - 对话目标 - 白色卡片背景 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-4 w-4 text-[#D97706]" />
            <span className="text-sm font-semibold text-[#92400E]">对话目标</span>
          </div>
          <p className="text-sm text-[#78350F] leading-relaxed">{dialogueGoal}</p>
        </div>

        {/* Roles Section - 对话角色 - 白色卡片背景 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">对话角色</p>
          <div className="space-y-2">
            {userRoles.map((role) => {
              const isSelected = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  onClick={() => {
                    onSelectRole(role.id)
                    onClearError?.()
                  }}
                  className={`w-full border-2 rounded-xl p-3 flex items-center gap-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#4F7CF0] bg-[#F0F4FF]'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{role.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{role.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        你扮演
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{role.description}</p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#4F7CF0] bg-[#4F7CF0]' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty - 难度等级 - 白色卡片背景 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">难度等级</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(DIFFICULTY_CONFIG) as [DifficultyLevel, DifficultyConfig][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onSelectDifficulty(key)}
                  className={`border-2 rounded-xl p-2.5 text-center transition-all ${
                    difficultyLevel === key
                      ? `${cfg.bg} ${cfg.color}`
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <div className={`text-sm font-semibold ${difficultyLevel === key ? cfg.color : 'text-gray-700'}`}>
                    {cfg.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 leading-tight">{cfg.desc}</div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Suggested Topics - 练习要点参考 - 白色卡片背景 */}
        {suggestedTopics && suggestedTopics.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-2">练习要点参考</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Voice Toggle - AI 语音播放开关 - 白色卡片背景 */}
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4 text-[#4F7CF0]" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">AI 语音播放</span>
            </div>
            <button
              onClick={onToggleVoice}
              className={`h-6 w-11 rounded-full transition-all relative ${
                voiceEnabled ? 'bg-[#4F7CF0]' : 'bg-gray-300'
              }`}
            >
              <motion.div
                className="h-5 w-5 bg-white rounded-full absolute top-0.5"
                animate={{ left: voiceEnabled ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Error Message - 错误提示 */}
        {error && (
          <div className="text-center text-[#EF4444] text-sm mb-3 px-2 py-2 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Start Button - 开始对话练习按钮 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
          className="w-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md py-4 text-base"
        >
          <MessageSquare className="h-5 w-5" />
          开始对话练习
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  )
}
