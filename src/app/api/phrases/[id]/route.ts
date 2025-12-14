import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { phrases, phraseExamples } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // 尝试从数据库获取短语基本信息
    const phrase = await db.query.phrases.findFirst({
      where: eq(phrases.id, id)
    })
    
    if (!phrase) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 })
    }
    
    // 从数据库获取该短语的所有示例
    const examples = await db.query.phraseExamples.findMany({
      where: eq(phraseExamples.phraseId, id)
    })
    
    // 合并短语和示例数据
    const responseData = {
      ...phrase,
      phraseExamples: examples
    }
    
    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrase from database:', error)
    return NextResponse.json({ error: 'Failed to fetch phrase' }, { status: 500 })
  }
}