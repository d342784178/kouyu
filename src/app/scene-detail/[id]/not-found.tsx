import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          场景未找到
        </h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          抱歉，您访问的场景不存在或已被删除。请检查URL是否正确，或浏览其他场景。
        </p>
        <div className="space-y-3">
          <Link
            href="/scene-list"
            className="block w-full py-3 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            浏览场景列表
          </Link>
          <Link
            href="/"
            className="block w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
