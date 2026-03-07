'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Loading from '@/components/Loading'
import TestAnalysis from '@/app/scene-test/[id]/[testId]/TestAnalysis'
import {
  InitializingView,
  ActiveChatView,
  CompletedView,
  Message,
  DifficultyLevel,
  OpenDialogueContent
} from '@/app/scene-test/components/open-test'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface SceneInfo {
  id: string
  name: string
  category: string
  description: string
}

interface PracticeContent {
  scene: SceneInfo
  testContent: OpenDialogueContent
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="返回"
      className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  )
}

type ChatStatus = 'loading' | 'initializing' | 'active' | 'completed'

export default function ChatPage() {
  const params = useParams<{ sceneId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sceneId = params.sceneId || ''

  const selectedRole = searchParams.get('role') || 'role_0'
  const difficultyLevel = (searchParams.get('difficulty') || 'medium') as DifficultyLevel
  const voiceEnabled = searchParams.get('voice') === 'true'

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [practiceContent, setPracticeContent] = useState<PracticeContent | null>(null)
  const [status, setStatus] = useState<ChatStatus>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [maxRounds] = useState(7)
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isRoundLimitReached, setIsRoundLimitReached] = useState(false)

  const messagesRef = useRef<Message[]>([])
  const currentRoundRef = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef<boolean>(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    currentRoundRef.current = currentRound
  }, [currentRound])

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return

    const currentMessages = messagesRef.current
    const currentRoundValue = currentRoundRef.current

    const userMessage: Message = {
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    }

    const updatedMessages = [...currentMessages, userMessage]
    setMessages(updatedMessages)

    setIsGeneratingResponse(true)

    try {
      const nextRound = currentRoundValue + 1
      const { message: assistantMessage, isEnd, isComplete } = await generateAssistantMessage(
        transcript,
        updatedMessages,
        nextRound
      )

      const completeHistory = [...updatedMessages, assistantMessage]
      setMessages(completeHistory)
      setCurrentRound(nextRound)

      if (assistantMessage.audioUrl && voiceEnabled) {
        setTimeout(() => {
          playAudio(assistantMessage.audioUrl!, completeHistory.length - 1)
        }, 500)
      }

      if (isEnd || nextRound >= maxRounds) {
        setIsRoundLimitReached(true)
      }
    } catch (err) {
      console.error('处理语音输入失败:', err)
      const errorMessage = err instanceof Error ? err.message : '处理输入失败，请重试'
      setError(errorMessage)
    } finally {
      setIsGeneratingResponse(false)
    }
  }

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg)
  }, [])

  const {
    isSupported: recognitionSupported,
    isRecording,
    interimTranscript,
    startRecording: hookStartRecording,
    stopRecording: hookStopRecording,
  } = useSpeechRecognition({
    onResult: handleVoiceInput,
    onError: handleError,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const fetchPracticeContent = async () => {
      if (!sceneId) return
      
      if (isInitializedRef.current) return
      isInitializedRef.current = true

      try {
        setIsLoading(true)
        setError(null)

        const storedData = sessionStorage.getItem(`practiceContent_${sceneId}`)
        if (storedData) {
          try {
            const data: PracticeContent = JSON.parse(storedData)
            setPracticeContent(data)
            
            sessionStorage.removeItem(`practiceContent_${sceneId}`)
            
            setStatus('initializing')
            await initializeChat(data)
            return
          } catch (parseError) {
            console.error('解析 sessionStorage 数据失败:', parseError)
          }
        }

        const response = await fetch(`/api/scenes/${sceneId}/practice-content`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('场景不存在或暂无练习内容')
          } else {
            setError('加载失败，请重试')
          }
          return
        }

        const data: PracticeContent = await response.json()
        setPracticeContent(data)
        
        setStatus('initializing')
        await initializeChat(data)
      } catch {
        setError('网络错误，请检查连接后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPracticeContent()
  }, [sceneId])

  const initializeChat = async (data: PracticeContent) => {
    try {
      const selectedRoleIndex = parseInt(selectedRole.replace('role_', ''))
      const aiRoleIndex = selectedRoleIndex === 0 ? 1 : 0
      const aiRoleName = data.testContent.roles[aiRoleIndex]?.name || 'AI助手'
      const userRoleName = data.testContent.roles[selectedRoleIndex]?.name || '用户'

      const initRequest = {
        sceneId,
        testId: `practice_${sceneId}`,
        scene: data.scene.category,
        aiRole: aiRoleName,
        userRole: userRoleName,
        dialogueGoal: data.testContent.description,
        difficultyLevel,
        suggestedOpening: data.testContent.suggested_opening
      }

      const response = await fetch('/api/open-test/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initRequest),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || '初始化对话失败')
      }

      const initialMessage: Message = {
        role: 'assistant',
        content: responseData.message || data.testContent.suggested_opening,
        audioUrl: responseData.audioUrl,
        timestamp: Date.now(),
      }

      setMessages([initialMessage])
      setCurrentRound(1)
      setStatus('active')

      if (initialMessage.audioUrl && voiceEnabled) {
        setTimeout(() => {
          playAudio(initialMessage.audioUrl!, 0)
        }, 500)
      }
    } catch (err) {
      console.error('初始化对话失败:', err)
      if (data) {
        const initialMessage: Message = {
          role: 'assistant',
          content: data.testContent.suggested_opening,
          timestamp: Date.now(),
        }
        setMessages([initialMessage])
        setCurrentRound(1)
        setStatus('active')
      }
    }
  }

  const generateAssistantMessage = async (
    prompt: string,
    conversationHistory: Message[],
    round: number
  ): Promise<{ message: Message; isEnd: boolean; isComplete?: boolean }> => {
    setIsGeneratingResponse(true)

    try {
      const updatedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const selectedRoleIndex = parseInt(selectedRole.replace('role_', ''))
      const aiRoleIndex = selectedRoleIndex === 0 ? 1 : 0
      const aiRoleName = practiceContent?.testContent.roles[aiRoleIndex]?.name || 'AI助手'

      const apiRequest = {
        sceneId,
        testId: `practice_${sceneId}`,
        conversation: updatedHistory,
        round,
        maxRounds,
        scene: practiceContent?.scene.category || practiceContent?.testContent.topic,
        aiRole: aiRoleName,
        userRole: selectedRole || '用户',
        dialogueGoal: practiceContent?.testContent.description,
        difficultyLevel
      }

      const response = await fetch('/api/open-test/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiRequest),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '大模型 API 调用失败')
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.message,
        audioUrl: data.audioUrl,
        timestamp: Date.now(),
      }

      return {
        message: assistantMessage,
        isEnd: data.isEnd || false,
        isComplete: data.isComplete || false
      }
    } catch (err) {
      console.error('生成助手消息失败:', err)
      throw err
    } finally {
      setIsGeneratingResponse(false)
    }
  }

  const startRecording = useCallback(async () => {
    setError(null)
    await hookStartRecording()
  }, [hookStartRecording])

  const stopRecording = useCallback(() => {
    hookStopRecording()
  }, [hookStopRecording])

  const playAudio = (audioUrl: string, messageIndex: number) => {
    if (!voiceEnabled) return
    
    if (playingMessageIndex === messageIndex && audioElement) {
      audioElement.pause()
      setPlayingMessageIndex(null)
      setAudioElement(null)
      return
    }

    if (audioElement) {
      audioElement.pause()
    }

    const audio = new Audio(audioUrl)
    setAudioElement(audio)
    setPlayingMessageIndex(messageIndex)

    audio.play().catch(err => {
      console.error('音频播放失败:', err)
      setPlayingMessageIndex(null)
      setAudioElement(null)
    })

    audio.onended = () => {
      setPlayingMessageIndex(null)
      setAudioElement(null)
    }

    audio.onerror = () => {
      setPlayingMessageIndex(null)
      setAudioElement(null)
      console.error('音频加载失败')
    }
  }

  const endTest = () => {
    setStatus('completed')
    setShowAnalysis(true)
  }

  const handleBack = () => {
    router.push(`/scene/${sceneId}/practice/role-selection`)
  }

  const handleComplete = () => {
    router.push(`/scene/${sceneId}/overview`)
  }

  if (isLoading || status === 'loading') {
    return (
      <Loading
        message="正在准备练习内容..."
        subMessage="AI 正在为您生成个性化对话场景"
        fullScreen
      />
    )
  }

  if (error && !practiceContent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8]">
        <div className="max-w-[430px] mx-auto px-6 pt-6">
          <div className="flex items-center mb-6">
            <BackButton onClick={handleBack} />
            <h2 className="ml-3 text-base font-medium text-gray-600">对话练习</h2>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700 mb-2">{error || '加载失败'}</p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 px-5 py-2 rounded-full bg-[#4F7CF0] text-white text-sm font-medium"
            >
              返回
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-150px)] bg-gradient-to-b from-[#FAFBFC] to-[#F0F4F8] flex flex-col">
      <div className="shrink-0 px-6 pt-6 pb-4 bg-[#F5F6FA]">
        <div className="flex items-center">
          <BackButton onClick={handleBack} />
          <div className="ml-3">
            <h2 className="text-base font-medium text-gray-900">{practiceContent?.scene.name}</h2>
            <p className="text-xs text-gray-500">对话练习</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="max-w-[430px] mx-auto h-[calc(100vh-150px)]">
          {status === 'initializing' && (
            <InitializingView
              message="正在初始化对话..."
              subMessage="AI 正在准备角色和场景设置"
            />
          )}

          {status === 'active' && (
            <ActiveChatView
              messages={messages}
              currentRound={currentRound}
              maxRounds={maxRounds}
              isRecording={isRecording}
              isGeneratingResponse={isGeneratingResponse}
              playingMessageIndex={playingMessageIndex}
              error={error || ''}
              isRoundLimitReached={isRoundLimitReached}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onPlayAudio={playAudio}
              onSendText={handleVoiceInput}
              onSubmitEvaluation={endTest}
              messagesEndRef={messagesEndRef}
              interimTranscript={interimTranscript}
              onBack={handleBack}
            />
          )}

          {status === 'completed' && (
            <AnimatePresence mode="wait">
              {showAnalysis ? (
                <TestAnalysis
                  sceneId={sceneId}
                  testId={`practice_${sceneId}`}
                  conversation={messages}
                  rounds={currentRound}
                  onComplete={handleComplete}
                />
              ) : (
                <CompletedView
                  currentRound={currentRound}
                  sceneId={sceneId}
                  testId={`practice_${sceneId}`}
                  messages={messages}
                  onViewAnalysis={() => setShowAnalysis(true)}
                  onComplete={handleComplete}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
