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

interface SceneCardProps {
  scene: Scene
  index: number
}

export default function SceneCard({ scene, index }: SceneCardProps) {
  // 计算学习时间（模拟）
  const learningTime = '10分钟'
  
  // 根据场景分类获取图标
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case '日常场景':
      case '日常问候':
        return '👋'
      case '职场场景':
        return '💼'
      case '留学/考试':
        return '📚'
      case '购物消费':
      case '超市购物':
        return '🛒'
      case '餐饮服务':
      case '餐厅点餐':
        return '🍽️'
      case '旅行出行':
        return '✈️'
      default:
        return '🌍'
    }
  }
  
  return (
    <Link 
      href={`/scene-detail/${scene.id}`} 
      id={`scene-card-${scene.id}`} 
      className="block"
    >
      <div className="scene-card bg-white rounded-card shadow-card p-4 card-hover">
        <div className="scene-card-content flex items-start">
          <div className="flex-1">
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
                {learningTime}
              </span>
            </div>
          </div>
          <div className="scene-card-icon ml-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
              <span className="text-lg">{getCategoryIcon(scene.category)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}