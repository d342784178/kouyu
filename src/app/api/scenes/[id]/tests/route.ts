/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { id: string }
  }
) {
  const { id } = params

  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景测试题
    let testData
    try {
      const result = await neonSql`SELECT * FROM scene_tests WHERE scene_id = ${id} ORDER BY "order"`
      testData = result
      
      if (!testData || testData.length === 0) {
        // 如果数据库中没有找到测试题，返回空数组
        return NextResponse.json([], { status: 200 })
      }
    } catch (error) {
      console.error('Error fetching scene tests from database:', error)
      // 数据库查询失败，返回空数组
      return NextResponse.json([], { status: 500 })
    }
    
    // 转换数据库格式为API响应格式
    const tests = testData.map((test: any) => ({
      id: test.id,
      sceneId: test.scene_id,
      type: test.type,
      order: test.order,
      content: test.content,
      createdAt: test.created_at,
      updatedAt: test.updated_at
    }))
    
    return NextResponse.json(tests, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]/tests:', error)
    // 服务器错误，返回空数组
    return NextResponse.json([], { status: 500 })
  }
}


