import { NextResponse } from 'next/server'
import { generateSpeech } from '../utils/speechGenerator'

interface SpeechRequest {
  text: string
  voice?: string
}

export async function POST(request: Request) {
  try {
    const body: SpeechRequest = await request.json()
    const { text, voice = 'en-US-AriaNeural' } = body

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const result = await generateSpeech({ text, voice })
    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '语音处理失败'
    console.log('语音处理API错误:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
