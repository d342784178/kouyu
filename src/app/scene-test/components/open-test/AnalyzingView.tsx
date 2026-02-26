'use client'

import Loading from '@/components/Loading'
import { AnalyzingViewProps } from './types'

export default function AnalyzingView({
  message = '正在分析题目...',
  subMessage = 'AI 正在理解场景、角色和对话目标'
}: AnalyzingViewProps) {
  return (
    <Loading
      message={message}
      subMessage={subMessage}
      size="md"
      variant="primary"
    />
  )
}
