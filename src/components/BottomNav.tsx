'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

// 场景学习自定义图标
function SceneIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-[#4F7CF0]' : 'text-gray-400'}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

// 首页图标
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-[#4F7CF0]' : 'text-gray-400'}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

// 短语库图标
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-[#4F7CF0]' : 'text-gray-400'}
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

// 个人中心图标
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-[#4F7CF0]' : 'text-gray-400'}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const navItems = [
  {
    path: '/',
    label: '首页',
    icon: HomeIcon,
  },
  {
    path: '/phrase-library',
    label: '短语库',
    icon: BookIcon,
  },
  {
    path: '/scene-learning',
    label: '场景学习',
    icon: SceneIcon,
  },
  {
    path: '/profile',
    label: '我的',
    icon: UserIcon,
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const items = navItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 bottom-nav-shadow safe-bottom">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 py-2">
        {items.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path + label}
              href={path}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                active ? 'text-[#4F7CF0]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                <Icon active={active} />
              </motion.div>
              <span
                className={`text-xs transition-all ${
                  active ? 'font-medium text-[#4F7CF0]' : ''
                }`}
              >
                {label}
              </span>
              {active && (
                <div
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4F7CF0]"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
