import { Suspense } from 'react'
import PhraseLibraryClient from './ClientComponent'

// 服务器组件
export default function PhraseLibrary() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <PhraseLibraryClient />
    </Suspense>
  )
}