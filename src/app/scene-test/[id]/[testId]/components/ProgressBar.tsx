'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  currentIndex: number
  totalTests: number
}

export default function ProgressBar({ currentIndex, totalTests }: ProgressBarProps) {
  const progress = ((currentIndex + 1) / totalTests) * 100

  return (
    <motion.section
      id="test-progress"
      className="mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">答题进度</span>
        <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
      </div>
      <div id="progress-bar-container" className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          id="progress-bar"
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div id="progress-text" className="flex justify-between text-xs text-text-secondary mt-2">
        <span className="flex items-center gap-1">
          <i className="fas fa-file-alt text-text-secondary"></i>
          第 {currentIndex + 1} 题
        </span>
        <span className="flex items-center gap-1">
          <i className="fas fa-layer-group text-text-secondary"></i>
          共 {totalTests} 题
        </span>
      </div>
    </motion.section>
  )
}
