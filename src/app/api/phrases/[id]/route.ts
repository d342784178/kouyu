import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 查询短语详情
    const phraseResult = await neonSql`SELECT * FROM phrases WHERE id = ${id}`
    
    if (!phraseResult || phraseResult.length === 0) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 })
    }
    
    const rawPhrase = phraseResult[0]
    
    // 查询关联的短语示例
    const examplesResult = await neonSql`SELECT * FROM phrase_examples WHERE phrase_id = ${id}`
    
    // 手动映射短语示例数据
    const phraseExamples = examplesResult.map(example => ({
      id: example.id,
      title: example.title,
      desc: example.desc,
      english: example.english,
      chinese: example.chinese,
      usage: example.usage,
      audioUrl: example.audio_url,
      createdAt: example.created_at,
      updatedAt: example.updated_at
    }))
    
    // 手动映射短语数据，包含关联示例
    const phrase = {
      id: rawPhrase.id,
      english: rawPhrase.english,
      chinese: rawPhrase.chinese,
      partOfSpeech: rawPhrase.part_of_speech,
      scene: rawPhrase.scene,
      difficulty: rawPhrase.difficulty,
      pronunciationTips: rawPhrase.pronunciation_tips,
      audioUrl: rawPhrase.audio_url,
      createdAt: rawPhrase.created_at,
      updatedAt: rawPhrase.updated_at,
      phraseExamples: phraseExamples
    }
    
    return NextResponse.json(phrase, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrase from database:', error)
    return NextResponse.json({ error: 'Failed to fetch phrase' }, { status: 500 })
  }
}