import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { audioBlob } = await request.json()

    if (!audioBlob) {
      return NextResponse.json(
        { error: '音频数据不能为空' },
        { status: 400 }
      )
    }

    const azureKey = process.env.AZURE_SPEECH_KEY || process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY
    const azureRegion = process.env.AZURE_SPEECH_REGION || process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus'

    if (!azureKey) {
      return NextResponse.json(
        { error: 'Azure Speech 密钥未配置' },
        { status: 500 }
      )
    }

    // 将 base64 音频数据转换为 Buffer
    let audioData = audioBlob.split(',')[1]
    if (!audioData) {
      return NextResponse.json(
        { error: '音频数据格式错误' },
        { status: 400 }
      )
    }
    const buffer = Buffer.from(audioData, 'base64')

    // 检测音频格式
    const isWav = buffer.length > 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WAVE'
    const isMp3 = buffer.length > 3 && (
      (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) ||
      buffer.toString('utf8', 0, 3) === 'ID3'
    )

    console.log('[Speech API] 音频格式检测:', {
      isWav,
      isMp3,
      bufferSize: buffer.length,
      firstBytes: buffer.toString('hex', 0, Math.min(16, buffer.length))
    })

    // 使用 Azure Speech REST API（支持多种格式）
    const endpoint = `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`
    
    // 确定音频格式
    let contentType = 'audio/wav; codecs=audio/pcm; samplerate=16000'
    if (isMp3) {
      contentType = 'audio/mp3'
    } else if (!isWav) {
      // 对于其他格式，尝试作为 webm 处理
      contentType = 'audio/webm'
    }

    console.log('[Speech API] 使用 REST API，Content-Type:', contentType)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': contentType,
        'Accept': 'application/json'
      },
      body: buffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Speech API] REST API 错误:', response.status, errorText)
      return NextResponse.json({
        success: false,
        transcript: '',
        error: `语音识别失败: ${response.status}`
      }, { status: 500 })
    }

    const result = await response.json()
    console.log('[Speech API] REST API 响应:', JSON.stringify(result, null, 2))

    // 解析结果
    if (result.RecognitionStatus === 'Success') {
      return NextResponse.json({
        success: true,
        transcript: result.DisplayText || '',
        confidence: result.Confidence || 1.0
      })
    } else {
      return NextResponse.json({
        success: false,
        transcript: '',
        error: result.RecognitionStatus || '未识别到语音'
      })
    }

  } catch (error) {
    console.error('语音识别 API 错误:', error)
    return NextResponse.json(
      { error: '语音识别服务不可用' },
      { status: 500 }
    )
  }
}
