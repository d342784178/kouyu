import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景列表
    let rawScenes
    try {
      rawScenes = await neonSql`SELECT * FROM scenes ORDER BY category, name`
    } catch (error) {
      console.error('Error fetching scenes from database:', error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json([
        {
          id: 'scene_1',
          name: '机场值机',
          category: '旅行出行',
          description: '学习在机场办理值机手续的常用对话',
          difficulty: '中级',
          cover_image: 'https://via.placeholder.com/200',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'scene_2',
          name: '餐厅点餐',
          category: '餐饮服务',
          description: '掌握在餐厅点餐的实用英语表达',
          difficulty: '初级',
          cover_image: 'https://via.placeholder.com/200',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'scene_3',
          name: '酒店入住',
          category: '旅行出行',
          description: '学习酒店入住的常用对话和表达',
          difficulty: '中级',
          cover_image: 'https://via.placeholder.com/200',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'scene_4',
          name: '购物退税',
          category: '购物消费',
          description: '掌握在国外购物退税的实用英语',
          difficulty: '高级',
          cover_image: 'https://via.placeholder.com/200',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { status: 200 })
    }
    
    // 手动映射数据
    const allScenes = rawScenes.map((scene: any) => ({
      id: scene.id,
      name: scene.name,
      category: scene.category,
      description: scene.description,
      difficulty: scene.difficulty,
      coverImage: scene.cover_image,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at
    }))
    
    return NextResponse.json(allScenes, { status: 200 })
  } catch (error) {
    console.error('Error fetching scenes:', error)
    // 返回模拟数据作为后备
    return NextResponse.json([
      {
        id: 'scene_1',
        name: '机场值机',
        category: '旅行出行',
        description: '学习在机场办理值机手续的常用对话',
        difficulty: '中级',
        coverImage: 'https://via.placeholder.com/200',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ], { status: 200 })
  }
}