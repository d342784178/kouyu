/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from 'next/link'

// 定义场景类型
interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

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

// 获取场景详情的辅助函数
async function getSceneById(id: string): Promise<Scene> {
  try {
    // 在服务器组件中，使用当前URL或环境变量构建绝对URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000' // 开发环境默认URL
    
    // 调用API获取场景详情（禁用缓存以确保获取最新数据）
    const response = await fetch(`${baseUrl}/api/scenes/${id}`, { cache: 'no-store' })
    
    let scene: Scene
    
    if (response.ok) {
      scene = await response.json()
    } else {
      // 如果API调用失败，返回模拟数据
      scene = {
        id: id,
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话',
        difficulty: '中级',
        coverImage: 'https://via.placeholder.com/400x200',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    return scene
  } catch (error) {
    console.error(`Error fetching scene ${id}:`, error)
    // 返回模拟数据
    return {
      id: id,
      name: '机场值机',
      category: '旅行出行',
      description: '学习在机场办理值机手续的常用对话',
      difficulty: '中级',
      coverImage: 'https://via.placeholder.com/400x200',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
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
}

export default async function SceneTest({ params }: { params: { id: string; testId: string } }) {
  const { id, testId } = params
  // 获取场景信息
  const scene = await getSceneById(id)
  // 获取测试题目
  const tests = await getSceneTests(id)
  // 获取当前题目
  const currentTest = tests.find(test => test.id === testId)
  // 获取当前题目索引
  const currentIndex = tests.findIndex(test => test.id === testId)
  // 获取上一题和下一题
  const prevTest = currentIndex > 0 ? tests[currentIndex - 1] : null
  const nextTest = currentIndex < tests.length - 1 ? tests[currentIndex + 1] : null
  
  if (!currentTest) {
    return (
      <div id="test-not-found" className="flex items-center justify-center h-screen">
        <p className="text-text-secondary">测试题目未找到</p>
      </div>
    )
  }
  
  return (
    <div id="scene-test-content" className="pb-20">
      <header id="scene-test-header" className="bg-white px-6 py-4 shadow-sm sticky top-0 z-30">
        <div id="scene-test-header-content" className="flex items-center justify-between">
          <Link 
            href={`/scene-detail/${id}`} 
            id="back-btn" 
            className="w-8 h-8 flex items-center justify-center"
          >
            <i className="fas fa-arrow-left text-text-primary text-lg"></i>
          </Link>
          <h1 id="scene-test-title" className="text-xl font-bold text-text-primary">场景测试</h1>
          <div className="w-8"></div> {/* 占位，保持标题居中 */}
        </div>
      </header>
      
      <main id="scene-test-main" className="mx-6 mt-6">
        <section id="test-progress" className="mb-6">
          <div id="progress-bar-container" className="w-full h-2 bg-gray-100 rounded-full mb-2">
            <div 
              id="progress-bar" 
              className="h-full bg-primary rounded-full" 
              style={{ width: `${((currentIndex + 1) / tests.length) * 100}%` }}
            ></div>
          </div>
          <div id="progress-text" className="flex justify-between text-xs text-text-secondary">
            <span>第 {currentIndex + 1} 题</span>
            <span>共 {tests.length} 题</span>
          </div>
        </section>
        
        <section id="test-question" className="mb-8">
          <h2 id="question-text" className="text-lg font-semibold text-text-primary mb-6">
            {currentTest.question}
          </h2>
          
          {currentTest.type === 'multiple-choice' && (
            <div id="multiple-choice-options" className="space-y-3">
              {currentTest.options?.map((option, index) => (
                <button 
                  key={index} 
                  id={`option-${index}`} 
                  className="w-full py-3 px-4 bg-white rounded-card shadow-sm border border-border-light text-left"
                >
                  <span className="text-base text-text-primary">{option}</span>
                </button>
              ))}
            </div>
          )}
          
          {currentTest.type === 'fill-blank' && (
            <div id="fill-blank-input">
              <input 
                type="text" 
                id="answer-input" 
                placeholder="请输入答案..." 
                className="w-full py-3 px-4 bg-white rounded-card shadow-sm border border-border-light"
              />
            </div>
          )}
          
          {currentTest.type === 'open' && (
            <div id="open-answer-input">
              <textarea 
                id="answer-textarea" 
                placeholder="请输入答案..." 
                rows={4} 
                className="w-full py-3 px-4 bg-white rounded-card shadow-sm border border-border-light"
              ></textarea>
            </div>
          )}
        </section>
        
        <section id="test-navigation" className="flex justify-between">
          <Link 
            href={prevTest ? `/scene-test/${id}/${prevTest.id}` : '#'} 
            id="prev-btn" 
            className={`py-3 px-6 rounded-card font-medium ${prevTest ? 'bg-white shadow-sm text-text-primary' : 'opacity-50 cursor-not-allowed'}`}
            aria-disabled={!prevTest}
          >
            上一题
          </Link>
          <Link 
            href={nextTest ? `/scene-test/${id}/${nextTest.id}` : `/scene-detail/${id}`} 
            id="next-btn" 
            className={`py-3 px-6 rounded-card font-medium ${nextTest ? 'bg-white shadow-sm text-text-primary' : 'bg-gradient-to-r from-primary to-secondary text-white'}`}
          >
            {nextTest ? '下一题' : '提交'}
          </Link>
        </section>
      </main>
    </div>
  )
}