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
      <body className="bg-[#F5F6FA]">
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
