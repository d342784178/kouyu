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

function detectBrowserCompatibility(): BrowserCompatibility {
  const hasSpeechRecognition = typeof (window as any).SpeechRecognition !== 'undefined' ||
    typeof (window as any).webkitSpeechRecognition !== 'undefined'
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  const userAgent = navigator.userAgent
  const isQuark = /quark/.test(userAgent.toLowerCase())

  let isSupported = false
  let unsupportedReason: string | undefined

  if (!isSecureContext) {
    unsupportedReason = '需要HTTPS环境才能使用麦克风功能'
  } else if (!hasGetUserMedia) {
    unsupportedReason = '浏览器不支持麦克风访问，请使用Chrome、Edge或Safari浏览器'
  } else if (!hasSpeechRecognition) {
    if (isQuark) {
      unsupportedReason = '夸克浏览器需要在设置中开启语音识别权限，请前往设置 → 隐私与安全 → 权限管理'
    } else {
      unsupportedReason = '浏览器不支持语音识别，请使用Chrome、Edge或Safari浏览器'
    }
  } else {
    isSupported = true
  }

  return {
    hasSpeechRecognition,
    hasGetUserMedia,
    isSecureContext,
    isSupported,
    unsupportedReason
  }
}

// 辅助函数：将 ArrayBuffer 转换为 Base64
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
}

export function useSpeechRecognition({
  onResult,
  onError,
  lang = 'en-US',
  silenceTimeout = 800,
  maxRecordingTime = 30000,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [browserCompatibility, setBrowserCompatibility] = useState<BrowserCompatibility>({
    hasSpeechRecognition: false,
    hasGetUserMedia: false,
    isSecureContext: false,
    isSupported: false
  })
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    state: 'unknown',
    canRequest: true
  })
  const [useAzureFallback, setUseAzureFallback] = useState(false)

  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const hasResultRef = useRef<boolean>(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const compatibility = detectBrowserCompatibility()
    console.log('[useSpeechRecognition] 浏览器兼容性检测:', {
      ...compatibility,
      userAgent: navigator.userAgent
    })
    setBrowserCompatibility(compatibility)

    const userAgent = navigator.userAgent
    const isXiaomi = /MiuiBrowser|xiaomi|mi/.test(userAgent.toLowerCase())
    const isQuark = /quark/.test(userAgent.toLowerCase())
    
    console.log('[useSpeechRecognition] 浏览器信息:', {
      userAgent: navigator.userAgent,
      isXiaomi,
      isQuark,
      platform: navigator.platform,
      language: navigator.language
    })
    
    // 小米浏览器和夸克浏览器 - 直接使用 Azure SDK
    if (isXiaomi || isQuark) {
      console.log('[useSpeechRecognition] 检测到小米/夸克浏览器，将使用 Azure SDK')
      setUseAzureFallback(true)
      // 即使浏览器不支持原生 API，Azure SDK 仍然可用
      return
    }

    if (!compatibility.isSupported) {
      console.log('[useSpeechRecognition] 浏览器不支持:', compatibility.unsupportedReason)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('[useSpeechRecognition] 浏览器不支持 SpeechRecognition API，将使用 Azure SDK')
      setUseAzureFallback(true)
      return
    }
    
    // 小米浏览器特殊处理
    if (isXiaomi) {
      console.log('[useSpeechRecognition] 检测到小米浏览器，应用特殊处理')
      // 小米浏览器需要特殊的权限处理
      try {
        // 尝试在用户交互事件中创建 recognition 实例
        const testRecognition = new SpeechRecognition()
        console.log('[useSpeechRecognition] 小米浏览器 SpeechRecognition 实例创建成功')
      } catch (err) {
        console.error('[useSpeechRecognition] 小米浏览器 SpeechRecognition 创建失败:', err)
      }
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    
    console.log('[useSpeechRecognition] 识别配置:', {
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      lang: recognition.lang
    })

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
      console.log('[useSpeechRecognition] onresult 触发, event.resultIndex:', event.resultIndex, 'results.length:', event.results.length)
      
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        console.log('[useSpeechRecognition] 识别结果', i, ':', {
          transcript,
          isFinal: event.results[i].isFinal,
          confidence: event.results[i][0].confidence
        })
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText
        console.log('[useSpeechRecognition] 最终文本累积:', finalTranscriptRef.current)
      }
      if (interimText) {
        interimTranscriptRef.current = interimText
        setInterimTranscript(interimText)
        console.log('[useSpeechRecognition] 临时文本:', interimText)
      }

      setSilenceTimeout()

      if (finalText) {
        hasResultRef.current = true
      }
    }

    recognition.onstart = () => {
      console.log('[useSpeechRecognition] onstart - 语音识别已启动')
    }

    recognition.onaudiostart = () => {
      console.log('[useSpeechRecognition] onaudiostart - 音频捕获已开始')
    }

    recognition.onsoundstart = () => {
      console.log('[useSpeechRecognition] onsoundstart - 检测到声音')
    }

    recognition.onspeechstart = () => {
      console.log('[useSpeechRecognition] onspeechstart - 检测到语音')
    }

    recognition.onspeechend = () => {
      console.log('[useSpeechRecognition] onspeechend - 语音结束')
    }

    recognition.onaudioend = () => {
      console.log('[useSpeechRecognition] onaudioend - 音频捕获结束')
    }

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error)
      clearSilenceTimeout()

      let errorMessage = '语音识别失败，请重试'
      const userAgent = navigator.userAgent
      const isXiaomi = /MiuiBrowser|xiaomi|mi/.test(userAgent.toLowerCase())
      const isQuark = /quark/.test(userAgent.toLowerCase())

      switch (event.error) {
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查麦克风权限和设备'
          break
        case 'not-allowed':
          if (isXiaomi) {
            errorMessage = '小米浏览器需要在系统设置中允许语音识别权限，请前往设置 → 应用管理 → 浏览器 → 权限管理，开启语音识别权限'
          } else if (isQuark) {
            errorMessage = '夸克浏览器需要在设置中允许语音识别权限，请前往设置 → 隐私与安全 → 权限管理，开启麦克风和语音识别权限'
          } else {
            errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          }
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
      console.log('[useSpeechRecognition] 请求麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionStatus({ state: 'granted', canRequest: false })
      console.log('[useSpeechRecognition] 麦克风权限已授予')
      return true
    } catch (err) {
      console.error('[useSpeechRecognition] 权限请求失败:', err)
      
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

  const startAzureRecording = useCallback(async () => {
    console.log('[useSpeechRecognition] startAzureRecording 被调用 - 使用服务端 API')
    
    try {
      hasResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(true)
      isRecordingRef.current = true
      setError(null)
      setInterimTranscript('')
      audioChunksRef.current = []

      console.log('[useSpeechRecognition] 请求麦克风权限...')
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

      // 使用 MediaRecorder 录制音频
      // 优先使用 audio/wav 格式，如果不支持则使用 audio/webm
      const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
        ? 'audio/wav' 
        : MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')
          ? 'audio/webm;codecs=pcm'
          : 'audio/webm;codecs=opus'
      
      console.log('[useSpeechRecognition] 使用 MIME 类型:', mimeType)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[useSpeechRecognition] 录音停止，发送到服务端识别...')
        
        // 将 Blob 转换为 ArrayBuffer
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const arrayBuffer = await audioBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        console.log('[useSpeechRecognition] 音频数据大小:', uint8Array.length, '字节')
        
        try {
          // 直接发送 ArrayBuffer 作为 base64
          const base64Audio = arrayBufferToBase64(uint8Array)
          
          const response = await fetch('/api/speech/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBlob: `data:audio/wav;base64,${base64Audio}` }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || '语音识别失败')
          }

          console.log('[useSpeechRecognition] 识别结果:', result.transcript)
          
          if (result.transcript) {
            finalTranscriptRef.current = result.transcript
            hasResultRef.current = true
            onResultRef.current(result.transcript)
          }
        } catch (error) {
          console.error('[useSpeechRecognition] 服务端识别失败:', error)
          const errorMessage = error instanceof Error ? error.message : '语音识别失败'
          setError(errorMessage)
          onErrorRef.current?.(errorMessage)
        }
        
        setIsRecording(false)
        isRecordingRef.current = false
      }

      // 启动录音
      mediaRecorder.start(1000) // 每秒收集一次数据
      console.log('[useSpeechRecognition] MediaRecorder 已启动')

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
    }
  }, [lang, maxRecordingTime])

  const startRecording = useCallback(async () => {
    console.log('[useSpeechRecognition] startRecording 被调用，isSupported:', browserCompatibility.isSupported, 'isRecording:', isRecording, 'useAzureFallback:', useAzureFallback)
    
    // 使用 Azure SDK 的情况
    if (useAzureFallback) {
      console.log('[useSpeechRecognition] 使用 Azure SDK 进行语音识别')
      await startAzureRecording()
      return
    }

    // 使用原生 SpeechRecognition API 的情况
    if (!browserCompatibility.isSupported) {
      const msg = browserCompatibility.unsupportedReason || '您的浏览器不支持语音识别'
      console.log('[useSpeechRecognition] 不支持:', msg)
      setError(msg)
      onErrorRef.current?.(msg)
      return
    }

    if (!recognitionRef.current) {
      const msg = '语音识别初始化失败，请刷新页面重试'
      console.log('[useSpeechRecognition] recognitionRef.current 为空')
      setError(msg)
      onErrorRef.current?.(msg)
      return
    }

    if (isRecording) {
      console.log('[useSpeechRecognition] 正在录音中，忽略重复调用')
      return
    }

    const userAgent = navigator.userAgent
    const isXiaomi = /MiuiBrowser|xiaomi|mi/.test(userAgent.toLowerCase())
    const isQuark = /quark/.test(userAgent.toLowerCase())
    
    console.log('[useSpeechRecognition] 开始录音 - 浏览器类型:', {
      isXiaomi,
      isQuark
    })

    try {
      hasResultRef.current = false
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setIsRecording(true)
      isRecordingRef.current = true
      setError(null)
      setInterimTranscript('')

      console.log('[useSpeechRecognition] 请求麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      mediaStreamRef.current = stream
      setPermissionStatus({ state: 'granted', canRequest: false })
      console.log('[useSpeechRecognition] 麦克风权限已获取, tracks:', stream.getTracks().length)
      
      const audioTrack = stream.getAudioTracks()[0]
      console.log('[useSpeechRecognition] 音频轨道信息:', {
        label: audioTrack?.label,
        enabled: audioTrack?.enabled,
        muted: audioTrack?.muted,
        readyState: audioTrack?.readyState
      })

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        analyser.fftSize = 256
        
        audioContextRef.current = audioContext
        analyserRef.current = analyser
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        const updateAudioLevel = () => {
          if (!analyserRef.current || !isRecordingRef.current) return
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setAudioLevel(Math.round(average))
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
        updateAudioLevel()
        console.log('[useSpeechRecognition] 音量检测已启动')
      }
      
      console.log('[useSpeechRecognition] 启动语音识别...')
      
      // 小米浏览器特殊处理
      if (isXiaomi) {
        console.log('[useSpeechRecognition] 小米浏览器 - 尝试启动语音识别...')
        try {
          // 直接启动，不设置额外参数
          recognitionRef.current.start()
          console.log('[useSpeechRecognition] 小米浏览器 - recognition.start() 已调用')
        } catch (xiaomiError) {
          console.error('[useSpeechRecognition] 小米浏览器 - 启动失败:', xiaomiError)
          // 尝试备选方案
          console.log('[useSpeechRecognition] 小米浏览器 - 尝试备选方案...')
          // 这里可以添加备选方案，比如使用其他语音识别服务
          throw new Error('小米浏览器语音识别权限被限制，请尝试使用Chrome浏览器')
        }
      } else {
        // 正常浏览器
        recognitionRef.current.start()
        console.log('[useSpeechRecognition] recognition.start() 已调用')
      }

      recordingTimeoutRef.current = setTimeout(() => {
        console.log('[useSpeechRecognition] 达到最大录音时长')
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
    }
  }, [browserCompatibility, isRecording, maxRecordingTime, checkPermission])

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return
    
    isRecordingRef.current = false

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setAudioLevel(0)

    const transcript = finalTranscriptRef.current || interimTranscriptRef.current
    if (transcript.trim()) {
      hasResultRef.current = true
      onResultRef.current(transcript.trim())
    }

    try {
      recognitionRef.current.stop()
    } catch (_) {}
  }, [])

  return {
    isSupported: browserCompatibility.isSupported,
    isRecording,
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
