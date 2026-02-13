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
  dialogueCount?: number
  createdAt: string
  updatedAt: string
}

// 获取场景列表的辅助函数
async function getScenes(): Promise<Scene[]> {
  try {
    // 在服务器组件中，使用当前URL或环境变量构建绝对URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000' // 开发环境默认URL
    
    // 调用API获取所有场景（禁用缓存以确保获取最新数据）
    const response = await fetch(`${baseUrl}/api/scenes`, { cache: 'no-store' })
    
    let scenes: Scene[] = []
    
    if (response.ok) {
      scenes = await response.json()
    } else {
      // 如果API调用失败，返回模拟数据
      scenes = [
        {
          id: 'scene_1',
          name: '机场值机',
          category: '旅行出行',
          description: '学习在机场办理值机手续的常用对话',
          difficulty: '中级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'scene_2',
          name: '餐厅点餐',
          category: '餐饮服务',
          description: '掌握在餐厅点餐的实用英语表达',
          difficulty: '初级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'scene_3',
          name: '酒店入住',
          category: '旅行出行',
          description: '学习酒店入住的常用对话和表达',
          difficulty: '中级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'scene_4',
          name: '购物退税',
          category: '购物消费',
          description: '掌握在国外购物退税的实用英语',
          difficulty: '高级',
          coverImage: 'https://via.placeholder.com/200',
          dialogueCount: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
    
    return scenes
  } catch (error) {
    console.error('Error fetching scenes:', error)
    // 返回模拟数据
    return [
      {
        id: 'scene_1',
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话',
        difficulty: '中级',
        coverImage: 'https://via.placeholder.com/200',
        dialogueCount: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'scene_2',
        name: '餐厅点餐',
        category: '餐饮服务',
        description: '掌握在餐厅点餐的实用英语表达',
        difficulty: '初级',
        coverImage: 'https://via.placeholder.com/200',
        dialogueCount: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'scene_3',
        name: '酒店入住',
        category: '旅行出行',
        description: '学习酒店入住的常用对话和表达',
        difficulty: '中级',
        coverImage: 'https://via.placeholder.com/200',
        dialogueCount: 7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'scene_4',
        name: '购物退税',
        category: '购物消费',
        description: '掌握在国外购物退税的实用英语',
        difficulty: '高级',
        coverImage: 'https://via.placeholder.com/200',
        dialogueCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

// 按分类分组场景的辅助函数
function groupScenesByCategory(scenes: Scene[]): Record<string, Scene[]> {
  return scenes.reduce((groups, scene) => {
    const category = scene.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(scene)
    return groups
  }, {} as Record<string, Scene[]>)
}

export default async function SceneList() {
  // 获取场景列表
  const scenes = await getScenes()
  
  // 按分类分组场景
  const scenesByCategory = groupScenesByCategory(scenes)
  
  return (
    <div id="scene-list-content" className="pb-20">
      <header id="scene-list-header" className="bg-white px-6 py-4 shadow-sm">
        <h1 id="scene-list-title" className="text-xl font-bold text-text-primary">场景学习</h1>
      </header>
      
      <main id="scene-list-main" className="mx-6 mt-6">
        {Object.entries(scenesByCategory).map(([category, categoryScenes]) => (
          <section key={category} id={`category-${category}`} className="mb-8">
            <h2 id={`category-${category}-title`} className="text-lg font-semibold text-text-primary mb-4">
              {category}
            </h2>
            
            <div id={`category-${category}-list`} className="space-y-4">
              {categoryScenes.map((scene, index) => (
                <Link 
                  key={scene.id} 
                  href={`/scene-detail/${scene.id}`} 
                  id={`scene-${scene.id}`} 
                  className="block"
                >
                  <div className="scene-card bg-white rounded-card shadow-card p-4 card-hover">
                    <div className="scene-card-content">
                      <h3 className="scene-card-title text-base font-semibold text-text-primary mb-1">
                        {scene.name}
                      </h3>
                      <p className="scene-card-description text-xs text-text-secondary mb-3">
                        {scene.description}
                      </p>
                      <div className="scene-card-tags flex items-center space-x-2">
                        <span className="scene-card-category text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                          {scene.category}
                        </span>
                        <span className={`scene-card-difficulty text-xs px-2 py-1 rounded-full ${scene.difficulty === '入门' ? 'bg-green-50 text-green-600' : scene.difficulty === '初级' ? 'bg-green-50 text-green-600' : scene.difficulty === '中级' ? 'bg-yellow-50 text-yellow-600' : scene.difficulty === '进阶' ? 'bg-purple-50 text-purple-600' : scene.difficulty === '高级' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                          {scene.difficulty}
                        </span>
                        <span className="scene-card-time text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-600">
                          10分钟
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}