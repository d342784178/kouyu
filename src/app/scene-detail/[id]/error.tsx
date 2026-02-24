'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 记录错误到日志服务
    console.error('[SceneDetail Error] 页面渲染错误:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          页面加载出错
        </h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          抱歉，加载场景详情时遇到了问题。这可能是由于网络连接不稳定或服务器暂时不可用导致的。
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            重试加载
          </button>
          <Link
            href="/scene-list"
            className="block w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            返回场景列表
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-gray-400">
            错误代码: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
