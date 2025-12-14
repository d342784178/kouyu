import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { phrases, phraseExamples } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // 使用 neon 客户端执行原始 SQL 查询，因为 Drizzle ORM 映射有问题
    const neonSql = neon(process.env.DATABASE_URL || '')
    const rawResult = await neonSql`SELECT * FROM phrases WHERE id = ${id}`
    const rawExamples = await neonSql`SELECT * FROM phrase_examples WHERE phrase_id = ${id}`
    
    console.log('=== DEBUG INFO ===')
    console.log('Raw SQL result:', JSON.stringify(rawResult, null, 2))
    console.log('Raw SQL examples:', JSON.stringify(rawExamples, null, 2))
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set (length: ' + process.env.DATABASE_URL.length + ')' : 'Not set')
    
    if (!rawResult || rawResult.length === 0) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 })
    }
    
    // 手动映射数据，解决 Drizzle ORM 的映射问题
    const phrase = {
      id: rawResult[0].id,
      english: rawResult[0].english,
      chinese: rawResult[0].chinese,
      partOfSpeech: rawResult[0].part_of_speech,
      scene: rawResult[0].scene,
      difficulty: rawResult[0].difficulty,
      pronunciationTips: rawResult[0].pronunciation_tips,
      audioUrl: rawResult[0].audio_url, // 手动映射 audio_url 到 audioUrl
      createdAt: rawResult[0].created_at,
      updatedAt: rawResult[0].updated_at
    }
    
    // 手动映射示例数据
    const examples = rawExamples.map(example => ({
      id: example.id,
      phraseId: example.phrase_id,
      title: example.title,
      desc: example.desc,
      english: example.english,
      chinese: example.chinese,
      usage: example.usage,
      audioUrl: example.audio_url, // 手动映射 audio_url 到 audioUrl
      createdAt: example.created_at,
      updatedAt: example.updated_at
    }))
    
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