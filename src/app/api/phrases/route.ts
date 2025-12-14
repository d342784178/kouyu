import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { phrases } from '@/lib/db/schema'

// 模拟数据，当数据库连接失败时使用
const mockPhrases = [
  {
    id: "phrase1",
    english: "Could you please help me?",
    chinese: "你能帮我一下吗？",
    partOfSpeech: "phrase",
    scene: "daily",
    difficulty: "beginner",
    pronunciationTips: "注意 'could' 的发音，d 不要发音",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "phrase2",
    english: "Excuse me, where is the restroom?",
    chinese: "打扰一下，洗手间在哪里？",
    partOfSpeech: "phrase",
    scene: "travel",
    difficulty: "beginner",
    pronunciationTips: "注意 'excuse' 的发音，重音在第二个音节",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "phrase3",
    english: "I would like to order a coffee, please.",
    chinese: "我想要点一杯咖啡，谢谢。",
    partOfSpeech: "phrase",
    scene: "restaurant",
    difficulty: "intermediate",
    pronunciationTips: "注意 'would like' 的连读",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "phrase4",
    english: "How much does this cost?",
    chinese: "这个多少钱？",
    partOfSpeech: "phrase",
    scene: "shopping",
    difficulty: "beginner",
    pronunciationTips: "注意 'does' 的发音，d 不要发音",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export async function GET() {
  try {
    // 尝试从数据库获取数据
    const allPhrases = await db.query.phrases.findMany()
    
    return NextResponse.json(allPhrases, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrases from database, using mock data:', error)
    // 数据库连接失败时返回模拟数据
    return NextResponse.json(mockPhrases, { status: 200 })
  }
}