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
  
  return (
    <Link 
      href={`/scene-detail/${scene.id}`} 
      id={`scene-card-${scene.id}`} 
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
              {learningTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}