'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  message?: string
  subMessage?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'purple' | 'amber' | 'blue'
}

const sizeMap = {
  sm: { container: 'w-12 h-12', inner: 'inset-1.5' },
  md: { container: 'w-20 h-20', inner: 'inset-2' },
  lg: { container: 'w-24 h-24', inner: 'inset-2' }
}

const colorMap = {
  primary: { outer: 'border-[#4F7CF0]/20 border-t-[#4F7CF0]', inner: 'border-[#4F7CF0]/10 border-b-[#4F7CF0]', center: 'text-[#4F7CF0]' },
  purple: { outer: 'border-[#7B5FE8]/20 border-t-[#7B5FE8]', inner: 'border-[#7B5FE8]/10 border-b-[#7B5FE8]', center: 'text-[#7B5FE8]' },
  amber: { outer: 'border-[#F59E0B]/20 border-t-[#F59E0B]', inner: 'border-[#F59E0B]/10 border-b-[#F59E0B]', center: 'text-[#F59E0B]' },
  blue: { outer: 'border-[#3B82F6]/20 border-t-[#3B82F6]', inner: 'border-[#3B82F6]/10 border-b-[#3B82F6]', center: 'text-[#3B82F6]' }
}

export default function LoadingSpinner({
  message = '加载中...',
  subMessage,
  size = 'md',
  variant = 'primary'
}: LoadingSpinnerProps) {
  const sizes = sizeMap[size]
  const colors = colorMap[variant]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[40vh] px-4"
    >
      <div className="relative">
        {/* 外层旋转圆环 */}
        <motion.div
          className={`${sizes.container} rounded-full border-4 ${colors.outer}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        {/* 内层反向旋转圆环 */}
        <motion.div
          className={`absolute ${sizes.inner} rounded-full border-4 ${colors.inner}`}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        {/* 中心图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className={`w-6 h-6 ${colors.center}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      {message && (
        <motion.h3
          className="mt-6 text-lg font-semibold text-[#1F2937]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.h3>
      )}

      {subMessage && (
        <motion.p
          className="mt-2 text-sm text-[#6B7280] text-center max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {subMessage}
        </motion.p>
      )}

      {/* 进度点动画 */}
      <motion.div
        className="flex gap-2 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${colors.center.replace('text-', 'bg-')}`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
