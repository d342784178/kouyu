import { NextRequest, NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

export const runtime = 'nodejs'

/**
 * 语音识别 API
 * 接收前端用 AudioContext 解码后的原始 PCM 数据（16kHz 单声道 Int16）
 * 通过 Azure SDK push stream 进行识别，无需 GStreamer
 * POST /api/speech/recognize
 * Body: FormData { audio: Blob(.pcm), sampleRate: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const sampleRate = parseInt(formData.get('sampleRate') as string || '16000', 10)

    if (!audioFile) {
      return NextResponse.json({ error: '音频数据不能为空' }, { status: 400 })
    }

    const subscriptionKey = process.env.AZURE_SPEECH_KEY
    const serviceRegion = process.env.AZURE_SPEECH_REGION || 'eastus'

    if (!subscriptionKey) {
      return NextResponse.json({ error: 'Azure Speech 密钥未配置' }, { status: 500 })
    }

    const pcmBuffer = Buffer.from(await audioFile.arrayBuffer())
    console.log('[语音识别] 收到 PCM 数据，大小:', pcmBuffer.length, 'bytes，采样率:', sampleRate)

    // 验证音频数据大小（最大 10MB，约 5 分钟录音）
    const maxAudioSize = 10 * 1024 * 1024
    if (pcmBuffer.length > maxAudioSize) {
      console.error('[语音识别] 音频数据过大:', pcmBuffer.length)
      return NextResponse.json({ error: '音频数据过大，请录制更短的内容' }, { status: 400 })
    }

    // 创建 SDK 配置
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
    speechConfig.speechRecognitionLanguage = 'en-US'

    // 创建 push stream，接收原始 PCM（16kHz 单声道 16bit）
    const pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1)
    )
    pushStream.write(pcmBuffer.buffer.slice(pcmBuffer.byteOffset, pcmBuffer.byteOffset + pcmBuffer.byteLength))
    pushStream.close()

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (res) => { recognizer.close(); resolve(res) },
        (err) => { recognizer.close(); reject(new Error(String(err))) }
      )
    })

    console.log('[语音识别] 结果:', result.reason, result.text)

    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      return NextResponse.json({ success: true, transcript: result.text || '' })
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      return NextResponse.json({ success: false, transcript: '', error: '未识别到语音' })
    } else {
      console.error('[语音识别] 失败:', result.errorDetails)
      return NextResponse.json(
        { success: false, transcript: '', error: result.errorDetails || '识别失败' },
        { status: 422 }
      )
    }

  } catch (error) {
    console.error('[语音识别] 服务异常:', error)
    const errorMessage = error instanceof Error ? error.message : '语音识别服务不可用'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
