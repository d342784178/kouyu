'use client'

import { motion } from 'framer-motion'
import { AnalyzingViewProps } from './types'

export default function AnalyzingView({ 
  message = '正在分析题目...', 
  subMessage = 'AI 正在理解场景、角色和对话目标' 
}: AnalyzingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-[#6B7280] font-medium">{message}</p>
      <p className="text-xs text-[#9CA3AF] mt-1">{subMessage}</p>
    </div>
  )
}
