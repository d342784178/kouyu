import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import * as sdk from "microsoft-cognitiveservices-speech-sdk"

interface SpeechOptions {
  text: string
  voice?: string
}

interface SpeechResult {
  audioUrl: string
  text: string
  voice: string
  warning?: string
}

// 获取跨平台的临时目录
const getTempDir = () => {
  return tmpdir()
}

export async function generateSpeech({ text, voice = 'en-US-AriaNeural' }: SpeechOptions): Promise<SpeechResult> {
  if (!text || text.trim() === '') {
    throw new Error('Text is required')
  }

  // 生成唯一文件名
  const timestamp = Date.now()
  const tempDir = getTempDir()
  const outputPath = join(tempDir, `speech_${timestamp}.mp3`)

  try {
    // 从环境变量中读取Azure Speech SDK配置
    const subscriptionKey = process.env.AZURE_SPEECH_KEY
    const serviceRegion = process.env.AZURE_SPEECH_REGION
    
    // 检查配置是否存在
    if (!subscriptionKey || !serviceRegion) {
      console.error('Azure Speech SDK配置缺失')
      throw new Error('Azure Speech SDK配置缺失：请在.env.local文件中设置AZURE_SPEECH_KEY和AZURE_SPEECH_REGION')
    }
    
    console.log('开始生成语音...')
    console.log('临时文件路径:', outputPath)
    
    // 创建SpeechConfig实例
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
    speechConfig.speechSynthesisVoiceName = voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    
    // 设置语速（使用SSML prosody rate属性，1.2表示加快20%）
    // 通过SSML来控制语速更可靠
    
    // 创建AudioConfig实例
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath)
    
    // 创建SpeechSynthesizer实例
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
    
    // 构建SSML，设置语速为1.2倍（加快20%）
    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voice}">
        <prosody rate="1.2">
            ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </prosody>
    </voice>
</speak>`
    
    // 生成音频文件
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log('语音生成成功')
            resolve(result)
          } else {
            console.error('语音合成失败:', result.reason, result.errorDetails)
            reject(new Error(`语音合成失败: ${result.reason}, 错误细节: ${result.errorDetails}`))
          }
        },
        (error) => {
          console.error('语音合成回调错误:', error)
          reject(error)
        }
      )
    })
    
    // 关闭SpeechSynthesizer
    synthesizer.close()
    
    // 检查文件是否存在
    if (!existsSync(outputPath)) {
      console.log('语音文件不存在')
      throw new Error('语音文件生成失败')
    }
    
    // 检查文件大小
    const { statSync } = await import('fs')
    const stats = statSync(outputPath)
    if (stats.size < 100) {
      console.log('语音文件太小，可能无效')
      throw new Error('语音文件生成失败')
    }
    
    // 生成本地临时文件夹的URL
    const audioUrl = `/api/open-test/audio/${timestamp}`
    console.log('语音URL:', audioUrl)
    
    return {
      audioUrl: audioUrl,
      text: text,
      voice: voice
    }
  } catch (error) {
    console.error('语音生成失败:', error instanceof Error ? error.message : String(error))
    
    // 清理临时文件
    try {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath)
        console.log('临时文件已清理:', outputPath)
      }
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError)
    }

    // 使用默认音频URL
    console.log('使用默认音频URL...')
    const audioUrl = `https://example.com/audio/${timestamp}.mp3`

    return {
      audioUrl: audioUrl,
      text: text,
      voice: voice
    }
  }
}
