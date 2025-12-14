import { Suspense } from 'react'
import TestClientComponent from './ClientComponent'

// 服务器组件
export default function TestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <TestClientComponent />
    </Suspense>
  )
}