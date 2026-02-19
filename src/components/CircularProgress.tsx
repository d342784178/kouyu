'use client'

import { motion } from 'framer-motion'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
}

export default function CircularProgress({
  value,
  size = 88,
  strokeWidth = 9,
  label,
  sublabel,
  color = '#4F7CF0',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="text-lg font-bold text-gray-800">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-gray-400">{sublabel}</span>
        )}
      </div>
    </div>
  )
}
