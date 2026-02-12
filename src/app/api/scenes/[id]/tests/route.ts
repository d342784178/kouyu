import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params
  
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景测试题目
    let rawTests
    try {
      rawTests = await neonSql`SELECT * FROM scene_tests WHERE scene_id = ${id} ORDER BY "order"`
    } catch (error) {
      console.error(`Error fetching tests for scene ${id} from database:`, error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json([
        {
          id: 'test_1',
          scene_id: id,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test_2',
          scene_id: id,
          type: 'fill-blank',
          question: 'If you prefer a window seat, you can say: "I would prefer a ______ seat if possible."',
          answer: 'window',
          analysis: 'The correct word is "window" to indicate you want a seat next to the window on the plane.',
          order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test_3',
          scene_id: id,
          type: 'open',
          question: 'What information might the check-in agent ask for?',
          answer: 'The check-in agent might ask for your passport, ticket, and how many bags you are checking in.',
          analysis: 'These are common questions asked during the check-in process at the airport.',
          order: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { status: 200 })
    }
    
    // 手动映射数据
    const tests = rawTests.map((test: any) => ({
      id: test.id,
      sceneId: test.scene_id,
      type: test.type,
      question: test.question,
      options: test.options,
      answer: test.answer,
      analysis: test.analysis,
      order: test.order,
      createdAt: test.created_at,
      updatedAt: test.updated_at
    }))
    
    return NextResponse.json(tests, { status: 200 })
  } catch (error) {
    console.error(`Error fetching tests for scene ${id}:`, error)
    // 返回模拟数据作为后备
    return NextResponse.json([
      {
        id: 'test_1',
        sceneId: id,
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
    ], { status: 200 })
  }
}