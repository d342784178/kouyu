import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { phrases } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// 模拟数据，当数据库连接失败时使用
const mockPhrases = {
  "phrase1": {
    id: "phrase1",
    english: "Could you please help me?",
    chinese: "你能帮我一下吗？",
    partOfSpeech: "phrase",
    scene: "daily",
    difficulty: "beginner",
    pronunciationTips: "注意 'could' 的发音，d 不要发音",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phraseExamples: [
      {
        id: 1,
        phraseId: "phrase1",
        title: "日常求助",
        desc: "在需要别人帮助时使用",
        english: "Could you please help me carry this bag?",
        chinese: "你能帮我提这个包吗？",
        usage: "当你需要别人帮忙做某事时使用",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  "phrase2": {
    id: "phrase2",
    english: "Excuse me, where is the restroom?",
    chinese: "打扰一下，洗手间在哪里？",
    partOfSpeech: "phrase",
    scene: "travel",
    difficulty: "beginner",
    pronunciationTips: "注意 'excuse' 的发音，重音在第二个音节",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phraseExamples: [
      {
        id: 2,
        phraseId: "phrase2",
        title: "问路",
        desc: "在陌生地方询问洗手间位置",
        english: "Excuse me, where is the restroom in this mall?",
        chinese: "打扰一下，这个商场的洗手间在哪里？",
        usage: "当你需要询问公共设施位置时使用",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  "phrase3": {
    id: "phrase3",
    english: "I would like to order a coffee, please.",
    chinese: "我想要点一杯咖啡，谢谢。",
    partOfSpeech: "phrase",
    scene: "restaurant",
    difficulty: "intermediate",
    pronunciationTips: "注意 'would like' 的连读",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phraseExamples: [
      {
        id: 3,
        phraseId: "phrase3",
        title: "点餐",
        desc: "在餐厅点餐时使用",
        english: "I would like to order a coffee with milk, please.",
        chinese: "我想要点一杯加牛奶的咖啡，谢谢。",
        usage: "当你在餐厅或咖啡馆点餐时使用",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  "phrase4": {
    id: "phrase4",
    english: "How much does this cost?",
    chinese: "这个多少钱？",
    partOfSpeech: "phrase",
    scene: "shopping",
    difficulty: "beginner",
    pronunciationTips: "注意 'does' 的发音，d 不要发音",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phraseExamples: [
      {
        id: 4,
        phraseId: "phrase4",
        title: "询问价格",
        desc: "在购物时询问商品价格",
        english: "How much does this dress cost?",
        chinese: "这条裙子多少钱？",
        usage: "当你在商店询问商品价格时使用",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // 尝试从数据库获取数据
    const phrase = await db.query.phrases.findFirst({
      where: eq(phrases.id, id)
    })
    
    if (!phrase) {
      // 数据库中没有找到，尝试使用模拟数据
      const mockPhrase = mockPhrases[id as keyof typeof mockPhrases]
      if (mockPhrase) {
        return NextResponse.json(mockPhrase, { status: 200 })
      }
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 })
    }
    
    return NextResponse.json(phrase, { status: 200 })
  } catch (error) {
    console.error('Error fetching phrase from database, using mock data:', error)
    
    // 数据库连接失败时使用模拟数据
    const mockPhrase = mockPhrases[params.id as keyof typeof mockPhrases]
    if (mockPhrase) {
      return NextResponse.json(mockPhrase, { status: 200 })
    }
    
    return NextResponse.json({ error: 'Failed to fetch phrase' }, { status: 500 })
  }
}