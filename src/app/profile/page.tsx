'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import CircularProgress from '@/components/CircularProgress'

// 用户进度数据
const mockUserProgress = {
  todayLearned: 12,
  todayMinutes: 25,
  consecutiveDays: 7,
  reviewCount: 8,
  totalLearned: 156,
}

// 成就数据
const achievements = [
  {
    icon: '🎯',
    label: '初学者',
    desc: '学习10个短语',
    unlocked: true,
    color: 'bg-[#FFF8EE]',
  },
  {
    icon: '🔥',
    label: '坚持者',
    desc: '连续学习7天',
    unlocked: true,
    color: 'bg-[#FFF0EB]',
  },
  {
    icon: '📚',
    label: '词汇达人',
    desc: '学习50个短语',
    unlocked: true,
    color: 'bg-[#EEF2FF]',
  },
  {
    icon: '🌟',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
  {
    icon: '🏆',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
  {
    icon: '💎',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
]

// 菜单项
const menuItems = [
  { 
    icon: (props: { className?: string }) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ), 
    label: '学习提醒设置', 
    color: 'text-[#4F7CF0]', 
    bg: 'bg-[#EEF2FF]' 
  },
  { 
    icon: (props: { className?: string }) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ), 
    label: '学习记录', 
    color: 'text-[#34D399]', 
    bg: 'bg-[#F0FFF4]' 
  },
  { 
    icon: (props: { className?: string }) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ), 
    label: '收藏的短语', 
    color: 'text-[#F59E0B]', 
    bg: 'bg-[#FFFBEB]' 
  },
  { 
    icon: (props: { className?: string }) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ), 
    label: '应用设置', 
    color: 'text-gray-500', 
    bg: 'bg-gray-100' 
  },
]

// 火焰图标
function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-5a2.5 2.5 0 1 0-4.5 1.5c0 2.143 2 3.5 3 5 .5 1 1 1.62 1 3a2.5 2.5 0 0 0 5 0Z" />
      <path d="M15.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-5a2.5 2.5 0 1 0-4.5 1.5c0 2.143 2 3.5 3 5 .5 1 1 1.62 1 3a2.5 2.5 0 0 0 5 0Z" />
    </svg>
  )
}

// 书本图标
function BookOpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4F7CF0]">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

// 时钟图标
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#34D399]">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// 奖杯图标
function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

// 右箭头图标
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default function Profile() {
  const progress = mockUserProgress
  const todayPct = Math.round((progress.todayLearned / 20) * 100)
  const timePct = Math.round((progress.todayMinutes / 60) * 100)

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto">

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] px-4 pt-12 pb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <span className="text-2xl">👤</span>
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">英语学习者</h2>
              <p className="text-white/70 text-sm mt-0.5">每天进步一点点 💪</p>
              <div className="flex items-center gap-1 mt-1">
                <FlameIcon />
                <span className="text-xs text-white/90">
                  连续学习 {progress.consecutiveDays} 天
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 -mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-[#4F7CF0]">{progress.totalLearned}</div>
                <div className="text-xs text-gray-400 mt-0.5">累计短语</div>
              </div>
              <div className="border-x border-gray-100">
                <div className="text-2xl font-semibold text-[#FF7043]">{progress.consecutiveDays}</div>
                <div className="text-xs text-gray-400 mt-0.5">连续天数</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#34D399]">{progress.todayMinutes}</div>
                <div className="text-xs text-gray-400 mt-0.5">今日分钟</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Today's Progress */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="font-semibold text-gray-800 mb-4">今日进度</div>
            <div className="flex items-center gap-5">
              <CircularProgress
                value={todayPct}
                size={80}
                strokeWidth={8}
                label={`${todayPct}%`}
                sublabel="完成"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <BookOpenIcon />
                      今日学习
                    </div>
                    <span className="text-sm font-medium">{progress.todayLearned}/20</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${todayPct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-[#4F7CF0] rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <ClockIcon />
                      学习时长
                    </div>
                    <span className="text-sm font-medium">{progress.todayMinutes}分钟</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${timePct}%` }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="h-full bg-[#34D399] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Achievements */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">成就徽章</span>
              <span className="text-xs text-gray-400">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} 已解锁
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((ach, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                  className={`${ach.color} rounded-2xl p-3 text-center ${
                    !ach.unlocked ? 'opacity-40' : ''
                  }`}
                >
                  <div className="text-2xl mb-1">{ach.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{ach.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{ach.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Menu Items */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {menuItems.map(({ icon: Icon, label, color, bg }, i) => (
              <motion.button
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                whileTap={{ scale: 0.99 }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  i < menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={color} />
                </div>
                <span className="flex-1 text-left text-sm text-gray-700">{label}</span>
                <ChevronRightIcon />
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Weekly Streak */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-[#FF7043] to-[#FF9A76] rounded-2xl p-4 flex items-center gap-3 text-white"
          >
            <TrophyIcon />
            <div>
              <div className="font-semibold">连续学习 {progress.consecutiveDays} 天！</div>
              <div className="text-sm text-white/80 mt-0.5">保持下去，你已超越 85% 的学习者！</div>
            </div>
          </motion.div>
        </div>

        {/* Logout */}
        <div className="px-4 mt-3">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 text-sm text-gray-400 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
          >
            退出登录
          </motion.button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
