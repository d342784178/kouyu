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
    color: 'text-[#4F7CF0]',
    bgColor: 'bg-[#EEF2FF]',
    borderColor: 'border-[#4F7CF0]/20',
    gradient: 'from-[#4F7CF0] to-[#7B5FE8]'
  },
  'fill-blank': {
    label: '填空题',
    description: '请根据题目进行完整回答',
    icon: 'fa-edit',
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#FFF8EE]',
    borderColor: 'border-[#F59E0B]/20',
    gradient: 'from-[#F59E0B] to-[#F97316]'
  },
  'open': {
    label: '开放题',
    description: '与AI进行对话练习',
    icon: 'fa-comments',
    color: 'text-[#EC4899]',
    bgColor: 'bg-[#FFF0F5]',
    borderColor: 'border-[#EC4899]/20',
    gradient: 'from-[#EC4899] to-[#F472B6]'
  },
  'qa': {
    label: '问答题',
    description: '语音回答问题',
    icon: 'fa-microphone',
    color: 'text-[#34D399]',
    bgColor: 'bg-[#F0FFF4]',
    borderColor: 'border-[#34D399]/20',
    gradient: 'from-[#34D399] to-[#10B981]'
  }
}

export default function QuestionTypeCard({ type }: QuestionTypeCardProps) {
  const config = typeConfig[type]

  return (
    <motion.section
      className={`mb-6 p-4 rounded-2xl ${config.bgColor} border ${config.borderColor}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className={`w-12 h-12 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center shadow-md`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <i className={`fas ${config.icon} text-white text-sm`}></i>
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-base ${config.color}`}>{config.label}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {type === 'multiple-choice' ? '单选' : type === 'fill-blank' ? '填空' : type === 'open' ? '对话' : '问答'}
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">{config.description}</p>
        </div>
      </div>
    </motion.section>
  )
}
