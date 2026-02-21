'use client'

import { motion } from 'framer-motion'
import { CompletedViewProps } from './types'

export default function CompletedView({
  currentRound,
  onViewAnalysis
}: CompletedViewProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
    >
      {/* 成功动画圆圈 */}
      <motion.div
        className="relative w-28 h-28"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* 背景圆 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[#34D399] to-[#10B981]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        />
        {/* 内圈 */}
        <motion.div
          className="absolute inset-2 rounded-full bg-white flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <motion.svg
            className="w-12 h-12 text-[#34D399]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            />
          </motion.svg>
        </motion.div>
        {/* 装饰圆点 */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-[#34D399]"
            style={{
              top: '50%',
              left: '50%',
            }}
            initial={{
              x: '-50%',
              y: '-50%',
              scale: 0
            }}
            animate={{
              x: `calc(-50% + ${Math.cos(i * 60 * Math.PI / 180) * 60}px)`,
              y: `calc(-50% + ${Math.sin(i * 60 * Math.PI / 180) * 60}px)`,
              scale: [0, 1, 0],
            }}
            transition={{
              delay: 0.5 + i * 0.1,
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
      </motion.div>

      <motion.h3
        className="mt-8 text-2xl font-bold text-[#1F2937]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        测试完成！
      </motion.h3>

      <motion.p
        className="mt-3 text-[#6B7280] text-center max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        您已完成 {currentRound} 轮对话，点击下方按钮查看详细分析报告
      </motion.p>

      <motion.button
        className="mt-8 px-10 py-4 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-semibold shadow-lg shadow-[#4F7CF0]/25 hover:shadow-xl hover:shadow-[#4F7CF0]/30 transition-all active:scale-95 flex items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onViewAnalysis}
      >
        <span>查看分析报告</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    </motion.div>
  )
}
