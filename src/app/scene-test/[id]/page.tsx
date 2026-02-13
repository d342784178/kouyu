'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

export default function SceneTestEntry() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id || ''
  const [isLoading, setIsLoading] = useState(true)

  // 获取场景测试题目的函数
  const getSceneTests = async (sceneId: string): Promise<Test[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch(`/api/scenes/${sceneId}/tests`)
      
      let tests: Test[] = []
      
      if (response.ok) {
        tests = await response.json()
      } else {
        // 如果API调用失败，返回模拟数据
        tests = [
          {
            id: 'test_1',
            sceneId: sceneId,
            type: 'multiple-choice',
            question: 'What would you say to check in for a flight?',
            options: [
              'Hello, I would like to check in for my flight.',
              'Hello, I want to buy a ticket.',
              'Hello, I need to cancel my flight.',
              'Hello, I lost my luggage.'
            ],
            answer: 'Hello, I would like to check in for my flight.',
            analysis: 'This is the correct phrase to use when you want to check in for your flight at the airport.',
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'test_2',
            sceneId: sceneId,
            type: 'fill-blank',
            question: 'If you prefer a window seat, you can say: "I would prefer a ______ seat if possible."',
            answer: 'window',
            analysis: 'The correct word is "window" to indicate you want a seat next to the window on the plane.',
            order: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'test_3',
            sceneId: sceneId,
            type: 'open',
            question: 'What information might the check-in agent ask for?',
            answer: 'The check-in agent might ask for your passport, ticket, and how many bags you are checking in.',
            analysis: 'These are common questions asked during the check-in process at the airport.',
            order: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
      
      // 按顺序排序测试题目
      return tests.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error(`Error fetching tests for scene ${sceneId}:`, error)
      // 返回模拟数据
      return [
        {
          id: 'test_1',
          sceneId: sceneId,
          type: 'multiple-choice',
          question: 'What would you say to check in for a flight?',
          options: [
            'Hello, I would like to check in for my flight.',
            'Hello, I want to buy a ticket.',
            'Hello, I need to cancel my flight.',
            'Hello, I lost my luggage.'
          ],
          answer: 'Hello, I would like to check in for my flight.',
          analysis: 'This is the correct phrase to use when you want to check in for your flight at the airport.',
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
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
            // 如果没有测试题目，重定向回场景详情页
            router.push(`/scene-detail/${id}`)
          }
        }
      } catch (error) {
        console.error('Error fetching tests:', error)
        // 发生错误时，重定向回场景详情页
        if (id) {
          router.push(`/scene-detail/${id}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchDataAndNavigate()
  }, [id, router])

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-primary">加载中...</div>
      </div>
    )
  }

  // 防止组件在导航前渲染其他内容
  return null
}