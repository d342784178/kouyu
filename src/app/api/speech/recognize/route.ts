import { NextRequest, NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

// 简单的 WAV 文件头生成（44 字节）
function createWavHeader(dataLength: number): Buffer {
  const buffer = Buffer.alloc(44)
  
  // RIFF chunk descriptor
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataLength, 4) // file length - 8
  buffer.write('WAVE', 8)
  
  // fmt sub-chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22) // NumChannels (1 for mono)
  buffer.writeUInt32LE(16000, 24) // SampleRate (16000 Hz)
  buffer.writeUInt32LE(32000, 28) // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32) // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34) // BitsPerSample (16)
  
  // data sub-chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40) // Subchunk2Size (data length)
  
  return buffer
}

// 将 webm/opus 转换为 PCM（简化版本，实际应该使用 ffmpeg）
async function convertWebmToPcm(webmBuffer: Buffer): Promise<Buffer> {
  // 注意：这是一个简化的实现
  // 生产环境建议使用 fluent-ffmpeg 或 @ffmpeg/ffmpeg 进行格式转换
  // 这里我们直接返回原始数据，Azure SDK 通常能处理 webm 格式
  return webmBuffer
}

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
    const audioData = audioBlob.split(',')[1]
    let buffer = Buffer.from(audioData, 'base64')

    // 检测音频格式并处理
    // WebM 文件头：1A 45 DF A3
    // WAV 文件头：52 49 46 46 (RIFF) + 57 41 56 45 (WAVE)
    const isWebm = buffer.length > 4 && buffer[0] === 0x1A && buffer.toString('hex', 1, 4) === '45dfA3'
    const isWav = buffer.length > 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WAVE'

    console.log('[Speech API] 音频格式检测:', {
      isWebm,
      isWav,
      bufferSize: buffer.length,
      firstBytes: buffer.toString('hex', 0, Math.min(16, buffer.length))
    })

    let audioConfig: sdk.AudioConfig

    if (isWav) {
      // WAV 格式，直接使用
      audioConfig = sdk.AudioConfig.fromWavFileInput(buffer)
    } else if (isWebm) {
      // WebM 格式，转换为 PCM（简化处理）
      const pcmBuffer = await convertWebmToPcm(buffer)
      // Azure SDK 也支持从流输入，我们尝试直接使用
      audioConfig = sdk.AudioConfig.fromWavFileInput(pcmBuffer)
    } else {
      // 其他格式，尝试直接使用
      console.log('[Speech API] 未知音频格式，尝试直接处理')
      audioConfig = sdk.AudioConfig.fromWavFileInput(buffer)
    }

    // 创建 Azure Speech 配置
    const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion)
    speechConfig.speechRecognitionLanguage = 'en-US'

    // 创建识别器
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
