import type { Metadata } from 'next'
import '../styles/globals.css'
import BottomNav from '../components/BottomNav'

// 引入Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.min.css'

export const metadata: Metadata = {
  title: '语习集',
  description: '聚焦日常常用英文短语学习的AI驱动型移动端APP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-bg-secondary">
        {/* 状态栏 */}
        <div id="status-bar" className="bg-white safe-top">
          <div className="flex justify-between items-center px-6 py-2 text-sm font-medium text-gray-900">
            <span>9:41</span>
            <div className="flex items-center space-x-1">
              <i className="fas fa-signal text-xs"></i>
              <i className="fas fa-wifi text-xs"></i>
              <i className="fas fa-battery-three-quarters text-xs"></i>
            </div>
          </div>
        </div>
        
        {/* 主要内容 */}
        <main className="pb-20">
          {children}
        </main>
        
        {/* 底部导航 */}
        <BottomNav />
      </body>
    </html>
  )
}