import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { phrases } from '@/lib/db/schema'

export async function GET() {
  try {
    // 从数据库获取所有短语
    const allPhrases = await db.query.phrases.findMany()
    
    return NextResponse.json(allPhrases, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrases from database:', error)
    return NextResponse.json({ error: 'Failed to fetch phrases' }, { status: 500 })
  }
}