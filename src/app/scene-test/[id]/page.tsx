'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Loading from '@/components/Loading'

// 定义测试题目类型
interface Test {
  id: string
  sceneId: string
  type: 'multiple-choice' | 'fill-blank' | 'open'
  question: string
  options?: string[]
  answer: string
  analysis: string
  order: number
  createdAt: string
  updatedAt: string
}

// 返回箭头图标
function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

// 文件图标
function FileIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path 
        d="M12 8C12 6.89543 12.8954 6 14 6H28L38 16V38C38 39.1046 37.1046 40 36 40H14C12.8954 40 12 39.1046 12 38V8Z" 
        fill="#4F7CF0"
        fillOpacity="0.1"
        stroke="#4F7CF0"
        strokeWidth="2"
      />
      <path 
        d="M28 6V14C28 15.1046 28.8954 16 30 16H38" 
        stroke="#4F7CF0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="18" y1="24" x2="32" y2="24" stroke="#4F7CF0" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="18" y1="30" x2="28" y2="30" stroke="#4F7CF0" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

export default function SceneTestEntry() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id || ''
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoData, setHasNoData] = useState(false)

  // 获取场景测试题目的函数
  const getSceneTests = async (sceneId: string): Promise<Test[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch(`/api/scenes/${sceneId}/tests`)
      
      let tests: Test[] = []
      
      if (response.ok) {
        tests = await response.json()
      }
      
      // 按顺序排序测试题目
      return tests.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error(`Error fetching tests for scene ${sceneId}:`, error)
      return []
    }
  }

  // 在组件挂载时获取数据并导航
  useEffect(() => {
    const fetchDataAndNavigate = async () => {
      try {
        setIsLoading(true)
        if (id) {
          // 获取场景测试题目
          const tests = await getSceneTests(id)
          
          // 获取第一题
          const firstTest = tests[0]
          
          if (firstTest) {
            // 重定向到第一题
            router.push(`/scene-test/${id}/${firstTest.id}`)
          } else {
            // 如果没有测试题目，显示无数据状态
            setHasNoData(true)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('Error fetching tests:', error)
        setHasNoData(true)
        setIsLoading(false)
      }
    }

    fetchDataAndNavigate()
  }, [id, router])

  // 加载状态
  if (isLoading) {
    return (
      <Loading
        message="正在加载测试题目..."
        subMessage="请稍候，正在准备您的学习内容"
        fullScreen
      />
    )
  }

  // 无测试数据状态
  if (hasNoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8]">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-[430px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link 
                href={`/scene-detail/${id}`}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon />
              </Link>
              
              <h1 className="text-lg font-bold text-gray-900">场景测试</h1>
              
              <div className="w-10 h-10" />
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="max-w-[430px] mx-auto px-4 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
          >
            {/* 图标 */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#4F7CF0]/10 flex items-center justify-center">
              <FileIcon />
            </div>

            {/* 标题 */}
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              暂无测试数据
            </h2>
            
            {/* 描述 */}
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              该场景暂时没有测试题目，<br />
              请先学习其他场景
            </p>

            {/* 返回按钮 */}
            <Link
              href={`/scene-detail/${id}`}
              className="block w-full py-4 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl text-base font-bold text-center shadow-lg shadow-[#4F7CF0]/25 hover:shadow-xl hover:shadow-[#4F7CF0]/30 transition-all active:scale-[0.98]"
            >
              返回场景详情
            </Link>
          </motion.div>

          {/* 提示卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 bg-white/60 rounded-2xl p-5 border border-gray-100"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">温馨提示</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  测试题目正在筹备中，您可以先学习场景对话和词汇，巩固知识后再来挑战测试。
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // 防止组件在导航前渲染其他内容
  return null
}
