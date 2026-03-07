'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  lang?: string
  silenceTimeout?: number
  maxRecordingTime?: number
}

export interface BrowserCompatibility {
  hasSpeechRecognition: boolean
  hasGetUserMedia: boolean
  isSecureContext: boolean
  isSupported: boolean
  unsupportedReason?: string
}

export interface PermissionStatus {
  state: 'prompt' | 'granted' | 'denied' | 'unknown'
  canRequest: boolean
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isRecording: boolean
  isRecognizing: boolean
  interimTranscript: string
  startRecording: () => Promise<void>
  stopRecording: () => void
  error: string | null
  audioLevel: number
  browserCompatibility: BrowserCompatibility
  permissionStatus: PermissionStatus
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<boolean>
  useAzureFallback: boolean
}

// ============================================================
// 浏览器检测工具函数
// ============================================================

/**
 * 检测浏览器类型
 * 注意：夸克和小米浏览器不支持原生 Web Speech API，需要使用服务端语音识别
 */
function detectBrowser(): { isQuark: boolean; isXiaomi: boolean } {
  const userAgent = navigator.userAgent
  return {
    isQuark: /quark/i.test(userAgent),
    isXiaomi: /MiuiBrowser|xiaomi|mi/i.test(userAgent)
  }
}

/**
 * 检测浏览器兼容性
 */
function detectBrowserCompatibility(): BrowserCompatibility {
  const hasSpeechRecognition = typeof (window as any).SpeechRecognition !== 'undefined' ||
    typeof (window as any).webkitSpeechRecognition !== 'undefined'
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  const { isQuark, isXiaomi } = detectBrowser()

  let isSupported = false
  let unsupportedReason: string | undefined

  if (!isSecureContext) {
    unsupportedReason = '需要 HTTPS 环境才能使用麦克风功能'
  } else if (!hasGetUserMedia) {
    unsupportedReason = '浏览器不支持麦克风访问，请使用 Chrome、Edge 或 Safari 浏览器'
  } else {
    // 有原生 SpeechRecognition API 的浏览器
    if (hasSpeechRecognition) {
      isSupported = true
    } 
    // 夸克/小米浏览器：无原生 API，但可通过服务端识别
    else if (isQuark || isXiaomi) {
      isSupported = true
    } else {
      unsupportedReason = '浏览器不支持语音识别，请使用 Chrome、Edge、Safari 浏览器或夸克/小米浏览器'
    }
  }

  return {
    hasSpeechRecognition,
    hasGetUserMedia,
    isSecureContext,
    isSupported,
    unsupportedReason
  }
}

// ============================================================
// 音频电平检测工具函数
// ============================================================

interface AudioLevelDetector {
  audioContext: AudioContext
  analyser: AnalyserNode
  stream: MediaStream
  cleanup: () => void
}

/**
 * 创建音频电平检测器
 * 使用 RMS（均方根）算法计算音量，兼容所有浏览器
 */
async function createAudioLevelDetector(
  onLevelUpdate: (level: number) => void,
  existingStream?: MediaStream
): Promise<AudioLevelDetector> {
  // 使用现有 stream 或创建新的
  const stream = existingStream || await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  })

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  const audioContext = new AudioContextClass()
  const analyser = audioContext.createAnalyser()
  const microphone = audioContext.createMediaStreamSource(stream)
  microphone.connect(analyser)
  
  // 配置分析器
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.3

  const timeDomainData = new Uint8Array(analyser.fftSize)
  let animationFrameId: number | null = null

  const updateLevel = () => {
    // 使用时域数据计算 RMS 音量（更可靠，兼容所有浏览器）
    analyser.getByteTimeDomainData(timeDomainData)
    let sum = 0
    for (let i = 0; i < timeDomainData.length; i++) {
      const normalized = (timeDomainData[i] - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / timeDomainData.length)
    const level = Math.round(rms * 100) // 转换为 0-100 范围
    
    onLevelUpdate(level)
    animationFrameId = requestAnimationFrame(updateLevel)
  }

  updateLevel()

  return {
    audioContext,
    analyser,
    stream,
    cleanup: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      audioContext.close()
      // 只清理自己创建的 stream，不清理传入的
      if (!existingStream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }
}

// ============================================================
// 主 Hook
// ============================================================

export function useSpeechRecognition({
  onResult,
  onError,
  lang = 'en-US',
  silenceTimeout = 800,
  maxRecordingTime = 30000,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  // 状态
  const [browserCompatibility, setBrowserCompatibility] = useState<BrowserCompatibility>({
    hasSpeechRecognition: false,
    hasGetUserMedia: false,
    isSecureContext: false,
    isSupported: false,
    unsupportedReason: undefined
  })
  const [isRecording, setIsRecording] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    state: 'unknown',
    canRequest: true
  })
  const [useAzureFallback, setUseAzureFallback] = useState(false)

  // Refs
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const hasResultRef = useRef<boolean>(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const audioLevelDetectorRef = useRef<AudioLevelDetector | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const silenceStartTimeRef = useRef<number | null>(null)

  // 停顿检测配置
  const SILENCE_THRESHOLD = 3 // RMS 阈值
  const SILENCE_DURATION = silenceTimeout // 停顿时间

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // 初始化：检测浏览器兼容性
  useEffect(() => {
    const compatibility = detectBrowserCompatibility()
    const { isQuark, isXiaomi } = detectBrowser()
    
    console.log('[useSpeechRecognition] 浏览器检测:', {
      isQuark,
      isXiaomi,
      hasSpeechRecognition: compatibility.hasSpeechRecognition,
      userAgent: navigator.userAgent
    })
    
    setBrowserCompatibility(compatibility)

    // 夸克/小米浏览器：使用服务端语音识别
    if (isQuark || isXiaomi) {
      console.log('[useSpeechRecognition] 使用服务端语音识别模式')
      setUseAzureFallback(true)
      return
    }

    if (!compatibility.isSupported) {
      console.log('[useSpeechRecognition] 浏览器不支持:', compatibility.unsupportedReason)
      return
    }

    // 初始化原生 SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('[useSpeechRecognition] 无原生 SpeechRecognition API，使用服务端模式')
      setUseAzureFallback(true)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    const clearSilenceTimeout = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    }

    const setSilenceTimeout = () => {
      clearSilenceTimeout()
      silenceTimeoutRef.current = setTimeout(() => {
        const transcript = finalTranscriptRef.current || interimTranscriptRef.current
        if (transcript.trim()) {
          hasResultRef.current = true
          onResultRef.current(transcript.trim())
        }
        try {
          recognition.stop()
        } catch (_) {}
      }, silenceTimeout)
    }

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText
      }
      if (interimText) {
        interimTranscriptRef.current = interimText
        setInterimTranscript(interimText)
      }

      setSilenceTimeout()

      if (finalText) {
        hasResultRef.current = true
      }
    }

    recognition.onerror = (event: any) => {
      clearSilenceTimeout()
      let errorMessage = '语音识别失败，请重试'

      switch (event.error) {
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查麦克风权限和设备'
          break
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          break
        case 'network':
          errorMessage = '网络错误，语音识别服务不可用'
          break
        case 'aborted':
          errorMessage = ''
          break
        case 'no-speech':
          errorMessage = '未检测到语音，请重试'
          break
        default:
          errorMessage = `语音识别失败: ${event.error}`
      }

      if (errorMessage) {
        setError(errorMessage)
        onErrorRef.current?.(errorMessage)
      }
      hasResultRef.current = false
      setIsRecording(false)
      isRecordingRef.current = false
    }

    recognition.onend = () => {
      clearSilenceTimeout()
      if (!hasResultRef.current && !finalTranscriptRef.current && !interimTranscriptRef.current) {
        setError('未检测到语音，请重试')
      }
      hasResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setInterimTranscript('')
      setIsRecording(false)
      isRecordingRef.current = false
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch (_) {}
      clearSilenceTimeout()
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
    }
  }, [lang, silenceTimeout])

  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (!navigator.permissions) {
      return { state: 'unknown', canRequest: true }
    }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      const status: PermissionStatus = {
        state: result.state as 'prompt' | 'granted' | 'denied',
        canRequest: result.state !== 'denied'
      }
      setPermissionStatus(status)
      return status
    } catch {
      return { state: 'unknown', canRequest: true }
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!browserCompatibility.hasGetUserMedia) {
      const msg = '浏览器不支持麦克风访问'
      setError(msg)
      onErrorRef.current?.(msg)
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setPermissionStatus({ state: 'granted', canRequest: false })
      return true
    } catch (err) {
      let errorMessage = '无法访问麦克风'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          setPermissionStatus({ state: 'denied', canRequest: false })
        } else if (err.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备'
        } else if (err.name === 'NotReadableError') {
          errorMessage = '麦克风被其他应用占用'
        }
      }
      setError(errorMessage)
      onErrorRef.current?.(errorMessage)
      return false
    }
  }, [browserCompatibility.hasGetUserMedia])

  // 清理资源
  const cleanup = useCallback(() => {
    // 清理音频检测器
    if (audioLevelDetectorRef.current) {
      audioLevelDetectorRef.current.cleanup()
      audioLevelDetectorRef.current = null
    }
    
    // 清理媒体流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    // 清理录音器
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (_) {}
      mediaRecorderRef.current = null
    }
    
    // 清理定时器
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    
    setAudioLevel(0)
  }, [])

  // 服务端语音识别模式（夸克/小米浏览器）
  const startServerSideRecording = useCallback(async () => {
    console.log('[useSpeechRecognition] 启动服务端语音识别模式')
    
    try {
      hasResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(true)
      isRecordingRef.current = true
      setError(null)
      setInterimTranscript('')
      audioChunksRef.current = []
      silenceStartTimeRef.current = null

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })
      mediaStreamRef.current = stream
      console.log('[useSpeechRecognition] 麦克风权限已获取')

      // 创建 MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/wav')
        ? 'audio/wav'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')
          ? 'audio/webm;codecs=pcm'
          : 'audio/webm;codecs=opus'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[useSpeechRecognition] 录音停止，发送到服务端识别...')
        
        setIsRecording(false)
        isRecordingRef.current = false
        setIsRecognizing(true)
        cleanup()

        if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
          setError('未检测到录音数据，请重试')
          setIsRecognizing(false)
          return
        }

        try {
          // 解码音频并转换为 PCM
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          const arrayBuffer = await audioBlob.arrayBuffer()

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          const offlineCtx = new AudioContextClass()
          const decoded = await offlineCtx.decodeAudioData(arrayBuffer)

          // 转换为 16kHz, 16-bit, 单声道 PCM
          const targetSampleRate = 16000
          const sourceSampleRate = decoded.sampleRate
          const sourceData = decoded.getChannelData(0)
          const ratio = sourceSampleRate / targetSampleRate
          const pcmLength = Math.floor(sourceData.length / ratio)
          const pcmInt16 = new Int16Array(pcmLength)

          for (let i = 0; i < pcmLength; i++) {
            const srcIdx = Math.floor(i * ratio)
            const sample = Math.max(-1, Math.min(1, sourceData[srcIdx]))
            pcmInt16[i] = sample < 0 ? sample * 32768 : sample * 32767
          }

          // 发送到服务端识别
          const formData = new FormData()
          formData.append('audio', new Blob([pcmInt16.buffer], { type: 'audio/pcm' }), 'recording.pcm')
          formData.append('sampleRate', String(targetSampleRate))

          const response = await fetch('/api/speech/recognize', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            let errMsg = '语音识别失败'
            try {
              const errData = await response.json()
              errMsg = errData.error || errMsg
            } catch (_) {
              errMsg = `语音识别失败 (HTTP ${response.status})`
            }
            throw new Error(errMsg)
          }

          const result = await response.json()
          console.log('[useSpeechRecognition] 识别结果:', result.transcript)

          if (result.transcript) {
            finalTranscriptRef.current = result.transcript
            hasResultRef.current = true
            onResultRef.current(result.transcript)
          }
        } catch (err) {
          console.error('[useSpeechRecognition] 服务端识别失败:', err)
          const errorMessage = err instanceof Error ? err.message : '语音识别失败'
          setError(errorMessage)
          onErrorRef.current?.(errorMessage)
        }

        setIsRecognizing(false)
      }

      // 启动录音
      mediaRecorder.start(1000)
      console.log('[useSpeechRecognition] MediaRecorder 已启动')

      // 启动音频电平检测和停顿检测
      audioLevelDetectorRef.current = await createAudioLevelDetector((level) => {
        setAudioLevel(level)

        // 停顿检测
        if (level < SILENCE_THRESHOLD) {
          if (!silenceStartTimeRef.current) {
            silenceStartTimeRef.current = Date.now()
          } else if (Date.now() - silenceStartTimeRef.current > SILENCE_DURATION) {
            console.log('[useSpeechRecognition] 检测到停顿，自动停止录音')
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
          }
        } else {
          silenceStartTimeRef.current = null
        }
      })

      // 设置最大录音时长
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('[useSpeechRecognition] 达到最大录音时长，停止录音')
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxRecordingTime)

    } catch (err) {
      console.error('[useSpeechRecognition] 启动录音失败:', err)
      let errorMessage = '无法访问麦克风，请检查麦克风权限和设备'

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
        } else if (err.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备，请连接麦克风后重试'
        }
      }

      setError(errorMessage)
      onErrorRef.current?.(errorMessage)
      setIsRecording(false)
      isRecordingRef.current = false
      cleanup()
    }
  }, [maxRecordingTime, cleanup, SILENCE_THRESHOLD, SILENCE_DURATION])

  // 原生 Web Speech API 模式
  const startNativeRecording = useCallback(async () => {
    if (!browserCompatibility.isSupported) {
      const msg = browserCompatibility.unsupportedReason || '您的浏览器不支持语音识别'
      setError(msg)
      onErrorRef.current?.(msg)
      return
    }

    if (!recognitionRef.current) {
      const msg = '语音识别初始化失败，请刷新页面重试'
      setError(msg)
      onErrorRef.current?.(msg)
      return
    }

    if (isRecording) return

    try {
      hasResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(true)
      isRecordingRef.current = true
      setError(null)
      setInterimTranscript('')

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      mediaStreamRef.current = stream
      setPermissionStatus({ state: 'granted', canRequest: false })

      // 启动音频电平检测
      audioLevelDetectorRef.current = await createAudioLevelDetector((level) => {
        setAudioLevel(level)
      }, stream)

      // 启动语音识别
      recognitionRef.current.start()
      console.log('[useSpeechRecognition] 原生语音识别已启动')

      // 设置最大录音时长
      recordingTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            const transcript = finalTranscriptRef.current || interimTranscriptRef.current
            if (transcript.trim()) {
              hasResultRef.current = true
              onResultRef.current(transcript.trim())
            }
            recognitionRef.current.stop()
          } catch (_) {}
        }
      }, maxRecordingTime)

    } catch (err) {
      console.error('[useSpeechRecognition] 启动录音失败:', err)
      let errorMessage = '无法访问麦克风，请检查麦克风权限和设备'

      if (err instanceof Error) {
        if (err.name === 'NotReadableError') {
          errorMessage = '麦克风设备被占用或故障，请检查是否有其他应用正在使用麦克风'
        } else if (err.name === 'NotAllowedError') {
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
        } else if (err.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备，请连接麦克风后重试'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      onErrorRef.current?.(errorMessage)
      setIsRecording(false)
      isRecordingRef.current = false
      cleanup()
    }
  }, [browserCompatibility, isRecording, maxRecordingTime, cleanup])

  const startRecording = useCallback(async () => {
    console.log('[useSpeechRecognition] startRecording, useAzureFallback:', useAzureFallback)
    
    if (useAzureFallback) {
      await startServerSideRecording()
    } else {
      await startNativeRecording()
    }
  }, [useAzureFallback, startServerSideRecording, startNativeRecording])

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    silenceStartTimeRef.current = null

    cleanup()

    // 原生模式：处理识别结果
    const transcript = finalTranscriptRef.current || interimTranscriptRef.current
    if (transcript.trim() && !useAzureFallback) {
      hasResultRef.current = true
      onResultRef.current(transcript.trim())
    }

    // 停止原生识别
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
    }

    // 停止服务端录音
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [cleanup, useAzureFallback])

  return {
    isSupported: browserCompatibility.isSupported,
    isRecording,
    isRecognizing,
    interimTranscript,
    startRecording,
    stopRecording,
    error,
    audioLevel,
    browserCompatibility,
    permissionStatus,
    checkPermission,
    requestPermission,
    useAzureFallback,
  }
}
