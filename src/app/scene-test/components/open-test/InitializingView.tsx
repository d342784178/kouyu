'use client'

import { InitializingViewProps } from './types'

export default function InitializingView({
  message = '正在初始化对话...',
  subMessage = 'AI 正在准备角色和场景设置'
}: InitializingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-[#6B7280] font-medium">{message}</p>
      <p className="text-xs text-[#9CA3AF] mt-1">{subMessage}</p>
    </div>
  )
}
