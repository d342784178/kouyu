'use client'

import { motion } from 'framer-motion'

interface QuestionTypeCardProps {
  type: 'multiple-choice' | 'fill-blank' | 'open' | 'qa'
}

const typeConfig = {
  'multiple-choice': {
    label: '选择题',
    description: '选择正确的答案',
    icon: 'fa-list-ul',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    gradient: 'from-blue-400 to-blue-600'
  },
  'fill-blank': {
    label: '填空题',
    description: '请根据题目进行完整回答',
    icon: 'fa-edit',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    gradient: 'from-amber-400 to-orange-500'
  },
  'open': {
    label: '开放题',
    description: '与AI进行对话练习',
    icon: 'fa-comments',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    gradient: 'from-purple-400 to-purple-600'
  },
  'qa': {
    label: '问答题',
    description: '语音回答问题',
    icon: 'fa-microphone',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    gradient: 'from-rose-400 to-rose-600'
  }
}

export default function QuestionTypeCard({ type }: QuestionTypeCardProps) {
  const config = typeConfig[type]

  return (
    <motion.section
      id="question-type-info"
      className={`mb-6 p-4 rounded-card ${config.bgColor} border ${config.borderColor}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className={`w-10 h-10 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center shadow-card`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <i className={`fas ${config.icon} text-white text-sm`}></i>
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-base ${config.color}`}>{config.label}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {type === 'multiple-choice' ? '单选' : type === 'fill-blank' ? '填空' : type === 'open' ? '对话' : '问答'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">{config.description}</p>
        </div>
      </div>
    </motion.section>
  )
}
