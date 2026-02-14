import { NextResponse } from 'next/server'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log('请求音频文件:', id)
    
    // 构建音频文件路径
    const audioPath = join('/tmp', `speech_${id}.mp3`)
    console.log('音频文件路径:', audioPath)
    
    // 检查文件是否存在
    if (!existsSync(audioPath)) {
      console.log('音频文件不存在:', audioPath)
      return NextResponse.json(
        { error: '音频文件不存在' },
        { status: 404 }
      )
    }
    
    // 读取音频文件
    const audioBuffer = readFileSync(audioPath)
    console.log('音频文件读取成功，大小:', audioBuffer.length, 'bytes')
    
    // 返回音频文件
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="speech_${id}.mp3"`
      }
    })
  } catch (error) {
    console.error('音频文件请求失败:', error)
    return NextResponse.json(
      { error: '音频文件请求失败' },
      { status: 500 }
    )
  }
}
