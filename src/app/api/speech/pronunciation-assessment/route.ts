import { NextRequest, NextResponse } from 'next/server'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import type { PronunciationAssessmentResult, WordFeedback } from '@/types'

export const runtime = 'nodejs'

/**
 * 发音评估 API
 * 使用 Azure Speech SDK 的 Pronunciation Assessment 功能评估用户发音
 * POST /api/speech/pronunciation-assessment
 * Body: FormData { audio: Blob(.pcm), referenceText: string, sampleRate?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const referenceText = formData.get('referenceText') as string | null
    const sampleRate = parseInt(formData.get('sampleRate') as string || '16000', 10)

    if (!audioFile) {
      return NextResponse.json({ error: '音频数据不能为空' }, { status: 400 })
    }

    if (!referenceText || !referenceText.trim()) {
      return NextResponse.json({ error: '目标文本不能为空' }, { status: 400 })
    }

    const subscriptionKey = process.env.AZURE_SPEECH_KEY
    const serviceRegion = process.env.AZURE_SPEECH_REGION || 'eastus'

    if (!subscriptionKey) {
      return NextResponse.json({ error: 'Azure Speech 密钥未配置' }, { status: 500 })
    }

    const pcmBuffer = Buffer.from(await audioFile.arrayBuffer())
    console.log('[发音评估] 收到 PCM 数据，大小:', pcmBuffer.length, 'bytes，采样率:', sampleRate)
    console.log('[发音评估] 目标文本:', referenceText)

    // 验证音频数据大小（最大 1000kB）
    const maxAudioSize = 1000 * 1024
    if (pcmBuffer.length > maxAudioSize) {
      console.error('[发音评估] 音频数据过大:', pcmBuffer.length/1024, 'KB')
      return NextResponse.json({ error: `音频数据过大，请录制不超过 ${maxAudioSize/1024}KB 的内容, 当前大小: ${pcmBuffer.length/1024}KB` }, { status: 400 })
    }

    // 创建 SDK 配置
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
    speechConfig.speechRecognitionLanguage = 'en-US'

    // 创建发音评估配置
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText.trim(),
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // enableMiscue - 启用错读检测
    )
    pronunciationConfig.phonemeAlphabet = 'IPA'

    // 创建 push stream，接收原始 PCM（16kHz 单声道 16bit）
    const pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1)
    )
    pushStream.write(pcmBuffer.buffer.slice(pcmBuffer.byteOffset, pcmBuffer.byteOffset + pcmBuffer.byteLength))
    pushStream.close()

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

    // 应用发音评估配置
    pronunciationConfig.applyTo(recognizer)

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (res) => { recognizer.close(); resolve(res) },
        (err) => { recognizer.close(); reject(new Error(String(err))) }
      )
    })

    console.log('[发音评估] 结果:', result.json)

    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      // 解析发音评估结果
      const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result)
      
      // 获取详细结果
      const detailResult = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      )
      
      let wordFeedback: WordFeedback[] = []
      
      try {
        const detailJson = JSON.parse(detailResult)
        const words = detailJson.NBest?.[0]?.Words || []
        
        wordFeedback = words.map((word: any) => ({
          word: word.Word || '',
          accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
          errorType: word.PronunciationAssessment?.ErrorType || 'None'
        }))
      } catch (parseError) {
        console.warn('[发音评估] 解析详细结果失败:', parseError)
      }

      const assessmentResult: PronunciationAssessmentResult = {
        accuracyScore: pronunciationResult.accuracyScore,
        fluencyScore: pronunciationResult.fluencyScore,
        completenessScore: pronunciationResult.completenessScore,
        pronunciationScore: pronunciationResult.pronunciationScore,
        wordFeedback
      }

      console.log('[发音评估] 评分:', {
        accuracy: assessmentResult.accuracyScore,
        fluency: assessmentResult.fluencyScore,
        completeness: assessmentResult.completenessScore,
        pronunciation: assessmentResult.pronunciationScore
      })

      return NextResponse.json({
        success: true,
        ...assessmentResult,
        recognizedText: result.text || ''
      })
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      return NextResponse.json({ 
        success: false, 
        error: '未识别到语音，请确保麦克风正常工作并大声说话' 
      }, { status: 422 })
    } else {
      console.error('[发音评估] 失败:', result.errorDetails)
      return NextResponse.json(
        { success: false, error: result.errorDetails || '发音评估失败' },
        { status: 422 }
      )
    }

  } catch (error) {
    console.error('[发音评估] 服务异常:', error)
    const errorMessage = error instanceof Error ? error.message : '发音评估服务不可用'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
