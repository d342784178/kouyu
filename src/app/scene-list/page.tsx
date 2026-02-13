'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react'
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

export default function SceneList() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 获取场景列表的函数
  const getScenes = async (): Promise<Scene[]> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch('/api/scenes')
      
      let scenes: Scene[] = []
      
      if (response.ok) {
        scenes = await response.json()
      } else {
        // 如果API调用失败，返回空数组
        console.error('API call failed:', response.status)
        scenes = []
      }
      
      return scenes
    } catch (error) {
      console.error('Error fetching scenes:', error)
      // 网络错误或其他异常，返回空数组
      return []
    }
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const scenesData = await getScenes()
        setScenes(scenesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])
  
  // 按分类分组场景
  const scenesByCategory = groupScenesByCategory(scenes)
  
  // 检查是否有场景数据
  const hasScenes = scenes.length > 0
  
  return (
    <div id="scene-list-content" className="pb-20">
      <header id="scene-list-header" className="bg-white px-6 py-4 shadow-sm">
        <h1 id="scene-list-title" className="text-xl font-bold text-text-primary">场景学习</h1>
      </header>
      
      <main id="scene-list-main" className="mx-6 mt-6">
        {hasScenes ? (
          Object.entries(scenesByCategory).map(([category, categoryScenes]) => (
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-map-marked-alt text-gray-400 text-2xl"></i>
            </div>
            <h2 className="text-lg font-medium text-text-primary mb-2">暂无场景数据</h2>
            <p className="text-sm text-text-secondary text-center max-w-xs">
              系统中暂无场景学习数据，请稍后再来查看
            </p>
          </div>
        )}
      </main>
    </div>
  )
}