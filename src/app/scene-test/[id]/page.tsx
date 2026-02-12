import { redirect } from 'next/navigation'

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

// 获取场景测试题目的辅助函数
async function getSceneTests(sceneId: string): Promise<Test[]> {
  try {
    // 在服务器组件中，使用当前URL或环境变量构建绝对URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000' // 开发环境默认URL
    
    // 调用API获取场景测试题目（禁用缓存以确保获取最新数据）
    const response = await fetch(`${baseUrl}/api/scenes/${sceneId}/tests`, { cache: 'no-store' })
    
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

export default async function SceneTestEntry({ params }: { params: { id: string } }) {
  const { id } = params
  
  // 获取场景测试题目
  const tests = await getSceneTests(id)
  
  // 获取第一题
  const firstTest = tests[0]
  
  if (firstTest) {
    // 重定向到第一题
    redirect(`/scene-test/${id}/${firstTest.id}`)
  } else {
    // 如果没有测试题目，重定向回场景详情页
    redirect(`/scene-detail/${id}`)
  }
}