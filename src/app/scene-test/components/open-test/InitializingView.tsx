'use client'

import Loading from '@/components/Loading'
import { InitializingViewProps } from './types'

export default function InitializingView({
  message = '正在初始化对话...',
  subMessage = 'AI 正在准备角色和场景设置'
}: InitializingViewProps) {
  return (
    <Loading
      message={message}
      subMessage={subMessage}
      size="md"
      variant="primary"
    />
  )
}
