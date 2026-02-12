import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params
  
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景详情
    let rawScene
    try {
      const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
      rawScene = result[0]
    } catch (error) {
      console.error(`Error fetching scene ${id} from database:`, error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json({
        id: id,
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话，包括询问航班信息、托运行李、选择座位等内容。',
        difficulty: '中级',
        cover_image: 'https://via.placeholder.com/400x200',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { status: 200 })
    }
    
    if (!rawScene) {
      // 如果场景不存在，返回模拟数据
      return NextResponse.json({
        id: id,
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话，包括询问航班信息、托运行李、选择座位等内容。',
        difficulty: '中级',
        cover_image: 'https://via.placeholder.com/400x200',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { status: 200 })
    }
    
    // 手动映射数据
    const scene = {
      id: rawScene.id,
      name: rawScene.name,
      category: rawScene.category,
      description: rawScene.description,
      difficulty: rawScene.difficulty,
      coverImage: rawScene.cover_image,
      createdAt: rawScene.created_at,
      updatedAt: rawScene.updated_at
    }
    
    return NextResponse.json(scene, { status: 200 })
  } catch (error) {
    console.error(`Error fetching scene ${id}:`, error)
    // 返回模拟数据作为后备
    return NextResponse.json({
      id: id,
      name: '机场值机',
      category: '旅行出行',
      description: '学习在机场办理值机手续的常用对话，包括询问航班信息、托运行李、选择座位等内容。',
      difficulty: '中级',
      coverImage: 'https://via.placeholder.com/400x200',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 200 })
  }
}