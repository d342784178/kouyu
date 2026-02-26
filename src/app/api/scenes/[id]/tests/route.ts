/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// 强制动态渲染，禁用缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    const result = await neonSql`SELECT * FROM scene_tests WHERE scene_id = ${id} ORDER BY "order"`
    
    if (!result || result.length === 0) {
      return NextResponse.json([], { status: 200 })
    }
    
    // 直接返回数据库中的原始数据，不做任何映射转换
    const tests = result.map((test: any) => ({
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
    return NextResponse.json([], { status: 500 })
  }
}
