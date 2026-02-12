'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light flex justify-around items-center h-16 px-2 safe-bottom z-40">
      <Link 
        id="nav-home" 
        href="/" 
        className={`flex flex-col items-center p-2 ${pathname === '/' ? 'text-primary' : 'text-text-secondary'}`}
      >
        <i className="fas fa-home text-xl"></i>
        <span className="text-xs mt-0.5 font-medium">首页</span>
      </Link>
      <Link 
        id="nav-library" 
        href="/phrase-library" 
        className={`flex flex-col items-center p-2 ${pathname === '/phrase-library' ? 'text-primary' : 'text-text-secondary'}`}
      >
        <i className="fas fa-book text-xl"></i>
        <span className="text-xs mt-0.5">短语库</span>
      </Link>
      <Link 
        id="nav-scene" 
        href="/scene-list" 
        className={`flex flex-col items-center p-2 ${pathname === '/scene-list' ? 'text-primary' : 'text-text-secondary'}`}
      >
        <i className="fas fa-map text-xl"></i>
        <span className="text-xs mt-0.5">场景学习</span>
      </Link>
      <Link 
        id="nav-profile" 
        href="#" 
        className="flex flex-col items-center p-2 text-text-secondary"
      >
        <i className="fas fa-user text-xl"></i>
        <span className="text-xs mt-0.5">我的</span>
      </Link>
    </nav>
  )
}