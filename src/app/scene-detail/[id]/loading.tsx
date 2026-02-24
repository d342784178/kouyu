/**
 * 场景详情页加载状态
 * 服务端渲染时的骨架屏
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] pb-24">
      {/* 顶部导航栏骨架 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[430px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pt-4">
        {/* 场景信息卡片骨架 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-14 h-6 bg-gray-200 rounded-full animate-pulse" />
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="w-12 h-6 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-14 h-6 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-10 h-6 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* 对话内容骨架 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-200 animate-pulse" />
            <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-16 h-4 bg-gray-200 rounded ml-auto animate-pulse" />
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6">
            {/* 对话轮次骨架 */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 高频词汇骨架 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-200 animate-pulse" />
            <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-12 h-4 bg-gray-200 rounded ml-auto animate-pulse" />
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
                    <div className="w-10 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-full h-8 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按钮骨架 */}
        <div className="mt-8 mb-24">
          <div className="w-full h-14 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
