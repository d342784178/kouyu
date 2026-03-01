import { NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/**
 * 跟读评测 API
 * 接收前端解码后的原始 PCM 数据（16kHz 单声道 Int16），通过 Azure SDK push stream 进行发音评测
 * 不依赖 ffmpeg，完全在内存中处理
 * POST /api/shadowing/evaluate
 * Body: FormData { audio: Blob(.pcm), text: string, sampleRate: string, channels: string }
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const targetText = formData.get('text') as string | null
    const sampleRate = parseInt(formData.get('sampleRate') as string || '16000', 10)

    // 参数校验
    if (!audioFile) {
      return NextResponse.json({ error: '缺少音频文件' }, { status: 400 })
    }
    if (!targetText || targetText.trim() === '') {
      return NextResponse.json({ error: '缺少目标文本' }, { status: 400 })
    }

    // 读取环境变量
    const subscriptionKey = process.env.AZURE_SPEECH_KEY
    const serviceRegion = process.env.AZURE_SPEECH_REGION

    if (!subscriptionKey || !serviceRegion) {
      console.error('[跟读评测] Azure Speech SDK 配置缺失')
      return NextResponse.json(
        { error: 'Azure Speech SDK 配置缺失，请检查 AZURE_SPEECH_KEY 和 AZURE_SPEECH_REGION 环境变量' },
        { status: 500 }
      )
    }

    // 读取 PCM 数据
    const pcmBuffer = Buffer.from(await audioFile.arrayBuffer())
    console.log('[跟读评测] 收到 PCM 数据，大小:', pcmBuffer.length, 'bytes，采样率:', sampleRate)

    // 创建 Speech SDK 配置
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
    speechConfig.speechRecognitionLanguage = 'en-US'

    // 创建发音评测配置
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      targetText.trim(),
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true
    )

    // 创建 push stream（接收原始 PCM，16kHz 单声道 16bit）
    const pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1)
    )

    // 将 PCM 数据推入 stream，然后关闭
    pushStream.write(pcmBuffer.buffer.slice(pcmBuffer.byteOffset, pcmBuffer.byteOffset + pcmBuffer.byteLength))
    pushStream.close()

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    pronunciationConfig.applyTo(recognizer)

    // 执行发音评测
    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (res) => {
          recognizer.close()
          resolve(res)
        },
        (err) => {
          recognizer.close()
          reject(new Error(String(err)))
        }
      )
    })

    console.log('[跟读评测] 识别结果:', result.reason)

    if (
      result.reason === sdk.ResultReason.RecognizedSpeech ||
      result.reason === sdk.ResultReason.NoMatch
    ) {
      const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result)

      // 安全提取逐词反馈
      const wordFeedback = (pronunciationResult.detailResult?.Words ?? []).map((word) => ({
        word: word.Word ?? '',
        isCorrect: (word.PronunciationAssessment?.AccuracyScore ?? 0) >= 60,
        score: Math.round(word.PronunciationAssessment?.AccuracyScore ?? 0),
      }))

      const evaluationResult = {
        score: Math.round(pronunciationResult.pronunciationScore ?? 0),
        accuracyScore: Math.round(pronunciationResult.accuracyScore ?? 0),
        intonationScore: Math.round(pronunciationResult.prosodyScore ?? 0),
        wordFeedback,
      }

      console.log('[跟读评测] 评测完成:', evaluationResult)
      return NextResponse.json(evaluationResult)
    } else {
      console.error('[跟读评测] 识别失败，原因:', result.reason, result.errorDetails)
      return NextResponse.json(
        { error: `语音识别失败: ${result.errorDetails || '未知错误'}` },
        { status: 422 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发音评测失败'
    console.error('[跟读评测] 处理错误:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
