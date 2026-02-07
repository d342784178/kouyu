import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    // 使用 neon 客户端执行原始 SQL 查询，解决 Drizzle ORM 的映射问题
    const neonSql = neon(process.env.DATABASE_URL || '')
    const rawPhrases = await neonSql`SELECT * FROM phrases`
    
    // 手动映射数据
    const allPhrases = rawPhrases.map(phrase => ({
      id: phrase.id,
      english: phrase.english,
      chinese: phrase.chinese,
      partOfSpeech: phrase.part_of_speech,
      scene: phrase.scene,
      difficulty: phrase.difficulty,
      pronunciationTips: phrase.pronunciation_tips,
      audioUrl: phrase.audio_url, // 手动映射 audio_url 到 audioUrl
      createdAt: phrase.created_at,
      updatedAt: phrase.updated_at
    }))
    
    return NextResponse.json(allPhrases, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrases from database:', error)
    return NextResponse.json({ error: 'Failed to fetch phrases' }, { status: 500 })
  }
}