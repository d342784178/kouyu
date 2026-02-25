'use client'

import { motion } from 'framer-motion'

interface LoadingProps {
  message?: string
  subMessage?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'purple' | 'green' | 'orange'
  fullScreen?: boolean
  className?: string
}

const sizeMap = {
  sm: { container: 'w-12 h-12', inner: 'inset-1.5', icon: 'w-5 h-5' },
  md: { container: 'w-20 h-20', inner: 'inset-2', icon: 'w-6 h-6' },
  lg: { container: 'w-24 h-24', inner: 'inset-2.5', icon: 'w-8 h-8' }
}

const colorMap = {
  primary: {
    outer: 'border-[#2563eb]/20 border-t-[#2563eb]',
    inner: 'border-[#2563eb]/10 border-b-[#2563eb]',
    center: 'text-[#2563eb]',
    dot: 'bg-[#2563eb]'
  },
  purple: {
    outer: 'border-[#7c3aed]/20 border-t-[#7c3aed]',
    inner: 'border-[#7c3aed]/10 border-b-[#7c3aed]',
    center: 'text-[#7c3aed]',
    dot: 'bg-[#7c3aed]'
  },
  green: {
    outer: 'border-[#059669]/20 border-t-[#059669]',
    inner: 'border-[#059669]/10 border-b-[#059669]',
    center: 'text-[#059669]',
    dot: 'bg-[#059669]'
  },
  orange: {
    outer: 'border-[#ea580c]/20 border-t-[#ea580c]',
    inner: 'border-[#ea580c]/10 border-b-[#ea580c]',
    center: 'text-[#ea580c]',
    dot: 'bg-[#ea580c]'
  }
}

export default function Loading({
  message = '加载中...',
  subMessage,
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  className = ''
}: LoadingProps) {
  const sizes = sizeMap[size]
  const colors = colorMap[variant]

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center px-4 ${className}`}
    >
      <div className="relative">
        {/* 外层旋转圆环 */}
        <motion.div
          className={`${sizes.container} rounded-full border-4 ${colors.outer}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {/* 内层反向旋转圆环 */}
        <motion.div
          className={`absolute ${sizes.inner} rounded-full border-4 ${colors.inner}`}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        {/* 中心图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className={`${sizes.icon} ${colors.center}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      </div>

      {message && (
        <motion.h3
          className="mt-6 text-lg font-semibold text-[#1f2937]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {message}
        </motion.h3>
      )}

      {subMessage && (
        <motion.p
          className="mt-2 text-sm text-[#6b7280] text-center max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {subMessage}
        </motion.p>
      )}

      {/* 进度点动画 */}
      <motion.div
        className="flex gap-2 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${colors.dot}`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

// 简单版本 - 仅旋转圆环
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'purple' | 'green' | 'orange'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }

  const colorClasses = {
    primary: 'border-[#2563eb]/20 border-t-[#2563eb]',
    purple: 'border-[#7c3aed]/20 border-t-[#7c3aed]',
    green: 'border-[#059669]/20 border-t-[#059669]',
    orange: 'border-[#ea580c]/20 border-t-[#ea580c]'
  }

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[variant]} rounded-full animate-spin ${className}`}
    />
  )
}

// 行内加载 - 用于按钮等场景
export function InlineLoading({
  message = '加载中...',
  size = 'sm'
}: {
  message?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-[#6b7280]">{message}</span>
    </div>
  )
}
