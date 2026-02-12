import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params
  
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景对话
    let rawDialogues
    try {
      rawDialogues = await neonSql`SELECT * FROM scene_dialogues WHERE scene_id = ${id} ORDER BY "order"`
    } catch (error) {
      console.error(`Error fetching dialogues for scene ${id} from database:`, error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json([
        {
          id: 'dialogue_1',
          scene_id: id,
          speaker: '乘客',
          content: 'Hello, I would like to check in for my flight to New York.',
          translation: '你好，我想办理去纽约的航班值机手续。',
          audio_url: null,
          order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_2',
          scene_id: id,
          speaker: '值机员',
          content: 'Sure, may I see your passport and ticket please?',
          translation: '当然可以，请出示您的护照和机票。',
          audio_url: null,
          order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_3',
          scene_id: id,
          speaker: '乘客',
          content: 'Here you are. I would prefer a window seat if possible.',
          translation: '给您。如果可能的话，我想要一个靠窗的座位。',
          audio_url: null,
          order: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_4',
          scene_id: id,
          speaker: '值机员',
          content: 'Let me check... Yes, I can assign you a window seat. How many bags are you checking in?',
          translation: '让我查一下...好的，我可以给您安排一个靠窗的座位。您要托运几件行李？',
          audio_url: null,
          order: 4,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_5',
          scene_id: id,
          speaker: '乘客',
          content: 'Just one bag.',
          translation: '只托运一件。',
          audio_url: null,
          order: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_6',
          scene_id: id,
          speaker: '值机员',
          content: 'Alright, here is your boarding pass. Your gate is B12 and boarding starts at 10:30 AM.',
          translation: '好的，这是您的登机牌。您的登机口是B12，上午10:30开始登机。',
          audio_url: null,
          order: 6,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_7',
          scene_id: id,
          speaker: '乘客',
          content: 'Thank you very much.',
          translation: '非常感谢。',
          audio_url: null,
          order: 7,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dialogue_8',
          scene_id: id,
          speaker: '值机员',
          content: 'You are welcome. Have a nice flight!',
          translation: '不客气，祝您旅途愉快！',
          audio_url: null,
          order: 8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { status: 200 })
    }
    
    // 手动映射数据
    const dialogues = rawDialogues.map((dialogue: any) => ({
      id: dialogue.id,
      sceneId: dialogue.scene_id,
      speaker: dialogue.speaker,
      content: dialogue.content,
      translation: dialogue.translation,
      audioUrl: dialogue.audio_url,
      order: dialogue.order,
      createdAt: dialogue.created_at,
      updatedAt: dialogue.updated_at
    }))
    
    return NextResponse.json(dialogues, { status: 200 })
  } catch (error) {
    console.error(`Error fetching dialogues for scene ${id}:`, error)
    // 返回模拟数据作为后备
    return NextResponse.json([
      {
        id: 'dialogue_1',
        sceneId: id,
        speaker: '乘客',
        content: 'Hello, I would like to check in for my flight to New York.',
        translation: '你好，我想办理去纽约的航班值机手续。',
        audioUrl: null,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'dialogue_2',
        sceneId: id,
        speaker: '值机员',
        content: 'Sure, may I see your passport and ticket please?',
        translation: '当然可以，请出示您的护照和机票。',
        audioUrl: null,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ], { status: 200 })
  }
}