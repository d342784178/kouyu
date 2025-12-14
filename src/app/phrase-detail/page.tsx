import { Suspense } from 'react'
import PhraseDetailClient from './ClientComponent'

// 服务器组件
export default function PhraseDetail() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <PhraseDetailClient />
    </Suspense>
  )
}