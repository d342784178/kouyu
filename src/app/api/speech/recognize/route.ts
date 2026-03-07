import { NextRequest, NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

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
    // WAV 文件头：52 49 46 46 (RIFF) + 57 41 56 45 (WAVE)
    const isWav = buffer.length > 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WAVE'

    console.log('[Speech API] 音频格式检测:', {
      isWav,
      bufferSize: buffer.length,
      firstBytes: buffer.toString('hex', 0, Math.min(16, buffer.length))
    })

    // 创建 Azure Speech 配置
    const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion)
    speechConfig.speechRecognitionLanguage = 'en-US'

    // 创建音频配置和识别器
    let audioConfig: sdk.AudioConfig
    
    // 直接使用 WAV 文件输入，Azure SDK 会自动处理格式
    console.log('[Speech API] 使用 WAV 文件输入')
    try {
      audioConfig = sdk.AudioConfig.fromWavFileInput(buffer)
    } catch (error) {
      console.error('[Speech API] WAV 文件输入创建失败:', error)
      // 备选方案：使用 PushAudioInputStream
      console.log('[Speech API] 尝试使用 PushAudioInputStream')
      const pushStream = sdk.AudioInputStream.createPushStream()
      pushStream.write(buffer)
      pushStream.close()
      audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)
    }

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

    return new Promise((resolve) => {
      recognizer.recognizeOnceAsync(
        (result: sdk.SpeechRecognitionResult) => {
          recognizer.close()
          
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            resolve(NextResponse.json({
              success: true,
              transcript: result.text,
              confidence: result.properties
            }))
          } else if (result.reason === sdk.ResultReason.NoMatch) {
            resolve(NextResponse.json({
              success: false,
              transcript: '',
              error: '未识别到语音'
            }))
          } else {
            resolve(NextResponse.json({
              success: false,
              transcript: '',
              error: `识别失败：${sdk.ResultReason[result.reason]}`
            }, { status: 500 }))
          }
        },
        (error: any) => {
          recognizer.close()
          console.error('Azure Speech 识别错误:', error)
          resolve(NextResponse.json({
            success: false,
            transcript: '',
            error: error.message || '语音识别失败'
          }, { status: 500 }))
        }
      )
    })

  } catch (error) {
    console.error('语音识别 API 错误:', error)
    return NextResponse.json(
      { error: '语音识别服务不可用' },
      { status: 500 }
    )
  }
}
