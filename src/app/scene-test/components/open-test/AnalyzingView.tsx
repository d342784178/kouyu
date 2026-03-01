'use client'

import Loading from '@/components/Loading'
import { AnalyzingViewProps } from './types'

export default function AnalyzingView({
  message = '正在分析题目...',
  subMessage = 'AI 正在理解场景、角色和对话目标'
}: AnalyzingViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <Loading
        message={message}
        subMessage={subMessage}
        size="md"
        variant="primary"
      />
    </div>
  )
}
