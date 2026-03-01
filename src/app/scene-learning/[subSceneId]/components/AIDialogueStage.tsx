'use client'

/**
 * AIDialogueStage - 第三阶段：AI模拟对话
 *
 * 功能：
 * - 气泡对话样式（AI左侧，用户右侧）
 * - 底部固定麦克风按钮（按住说话，松开发送）
 * - 5秒超时提示逻辑
 * - QA_Pair 回应状态记录（fluent/prompted/failed）
 * - Fluency_Score 计算和展示
 * - Speech SDK 失败时降级为文字输入框
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateFluencyScore } from '@/lib/scene-learning/scoring'
import type { QAPair, QAResponse } from '@/types'
import type { QAPairResult, QAPairResultStatus } from '@/lib/scene-learning/scoring'

// ============================================================
// 类型定义
// ============================================================

interface AIDialogueStageProps {
  subSceneId: string
  /** 从父组件传入，避免重复请求 */
  qaPairs: QAPair[]
  /** 进入下一阶段的回调，携带流畅度得分、未通过 id 列表、对话历史 */
  onProceed: (
    fluencyScore: number,
    failedQaIds: string[],
    dialogueHistory: { qaId: string; userText: string; passed: boolean }[]
  ) => void
}

/** 对话气泡消息 */
interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  /** 是否为超时提示语 */
  isHint?: boolean
}

/** 当前录音/识别状态 */
type RecordingState = 'idle' | 'recording' | 'recognizing' | 'error'

/** 回答不匹配时的确认弹窗数据 */
interface RetryPrompt {
  /** AI 提示文案 */
  hint: string
  /** 需要撤销的用户消息 id */
  userMsgId: string
}

// ============================================================
// 工具函数
// ============================================================

/** 生成唯一消息 id */
function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 检查 Web Speech API 是否可用 */
function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  )
}

// ============================================================
// 子组件：AI 输入中指示器
// ============================================================

function TypingIndicator() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 mb-4"
    >
      {/* AI 头像 */}
      <div className="w-8 h-8 rounded-full bg-[#4F7CF0] flex items-center justify-center shrink-0 text-white text-xs font-bold">
        AI
      </div>
      {/* 输入中气泡 */}
      <div className="max-w-[75%]">
        <div className="text-[10px] text-gray-400 mb-1">AI 助手</div>
        <div className="bg-[#EEF2FF] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-1.5">
            <div className="animate-bounce">
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
              <div className="w-1.5 h-1.5 bg-[#4F7CF0] rounded-full"></div>
            </div>
            <span className="text-xs text-[#4F7CF0] ml-1">AI 正在输入...</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// 子组件：单条气泡消息
// ============================================================

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAI = message.role === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 mb-4 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {/* 头像 */}
      {isAI ? (
        <div className="w-8 h-8 rounded-full bg-[#4F7CF0] flex items-center justify-center shrink-0 text-white text-xs font-bold">
          AI
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center shrink-0 text-white text-xs font-bold">
          我
        </div>
      )}

      {/* 气泡容器 */}
      <div className="max-w-[75%]">
        {/* 角色标签 */}
        <div className={`text-[10px] mb-1 ${isAI ? 'text-gray-400' : 'text-right text-gray-400'}`}>
          {isAI ? 'AI 助手' : '我'}
        </div>
        
        {/* 气泡 */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isAI
              ? message.isHint
                ? 'bg-[#FFF8EE] border border-[#F59E0B]/20 text-[#92400E] rounded-bl-md'
                : 'bg-white border border-gray-100 text-[#1F2937] rounded-bl-md'
              : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-br-md'
          }`}
        >
          {message.isHint && (
            <span className="text-xs text-[#F59E0B] font-medium block mb-1">💡 提示</span>
          )}
          {message.text}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// 子组件：录音波形动画
// ============================================================

function WaveformAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white"
          animate={{ height: ['4px', '16px', '4px'] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// 子组件：对话完成卡片（Fluency_Score 展示）
// ============================================================

interface DialogueSummaryProps {
  fluencyScore: number
  results: QAPairResult[]
  qaPairs: QAPair[]
  onProceed: () => void
}

function DialogueSummary({ fluencyScore, results, qaPairs, onProceed }: DialogueSummaryProps) {
  /** 状态对应的中文标签和颜色 */
  const statusConfig: Record<QAPairResultStatus, { label: string; color: string }> = {
    fluent: { label: '流畅通过', color: 'text-green-600 bg-green-50' },
    prompted: { label: '提示后通过', color: 'text-amber-600 bg-amber-50' },
    failed: { label: '未通过', color: 'text-red-500 bg-red-50' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 my-4 bg-white rounded-card shadow-card border border-gray-100 overflow-hidden"
    >
      {/* 得分头部 */}
      <div className="bg-gradient-to-r from-[#4F7CF0] to-[#7B9FF5] px-5 py-5 text-center">
        <p className="text-white/80 text-sm mb-1">对话完成！流畅度得分</p>
        <div className="text-5xl font-bold text-white mb-1">{fluencyScore}</div>
        <p className="text-white/70 text-xs">/ 100</p>
      </div>

      {/* 各 QA_Pair 状态列表 */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">各环节表现</p>
        {results.map((result) => {
          const qa = qaPairs.find((q) => q.id === result.qaId)
          const cfg = statusConfig[result.status]
          return (
            <div key={result.qaId} className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-700 flex-1 truncate">
                {qa?.speakerText ?? result.qaId}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          )
        })}
        {results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">无需说话的环节</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3 rounded-card bg-[#4F7CF0] text-white text-sm font-semibold shadow-md hover:bg-[#3D6ADE] transition-colors"
        >
          查看详细反馈
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// 主组件：AIDialogueStage
// ============================================================

export default function AIDialogueStage({
  subSceneId,
  qaPairs,
  onProceed,
}: AIDialogueStageProps) {
  // ---- 对话消息列表 ----
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // ---- AI 正在输入中 ----
  const [isAITyping, setIsAITyping] = useState(false)
  // ---- 当前 QA_Pair 索引（0-based） ----
  const [currentQaIndex, setCurrentQaIndex] = useState(0)
  // ---- 录音/识别状态 ----
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  // ---- 是否降级为文字输入 ----
  const [useFallbackInput, setUseFallbackInput] = useState(false)
  // ---- 文字输入框内容 ----
  const [textInput, setTextInput] = useState('')
  // ---- 对话是否已完成 ----
  const [isComplete, setIsComplete] = useState(false)
  // ---- QA_Pair 回应结果列表 ----
  const [qaResults, setQaResults] = useState<QAPairResult[]>([])
  // ---- 每个 QA_Pair 对应的用户输入文本（用于 ReviewStage） ----
  const userTextMapRef = useRef<Map<string, string>>(new Map())
  // ---- 当前 QA_Pair 是否已收到提示（用于判断 prompted 状态） ----
  const [currentQaHinted, setCurrentQaHinted] = useState(false)
  // ---- Fluency_Score ----
  const [fluencyScore, setFluencyScore] = useState(0)
  // ---- 回答不匹配时的确认弹窗 ----
  const [retryPrompt, setRetryPrompt] = useState<RetryPrompt | null>(null)

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const conversationHistoryRef = useRef<{ role: 'ai' | 'user'; text: string }[]>([])
  const currentQaHintedRef = useRef(false)
  const currentQaIndexRef = useRef(0)
  const isProcessingRef = useRef(false) // 防止重复提交

  // ---- 同步 ref 与 state ----
  useEffect(() => {
    currentQaHintedRef.current = currentQaHinted
  }, [currentQaHinted])

  useEffect(() => {
    currentQaIndexRef.current = currentQaIndex
  }, [currentQaIndex])

  // ---- 自动滚动到底部 ----
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAITyping, scrollToBottom])

  // ---- 添加消息到列表 ----
  const addMessage = useCallback((role: 'ai' | 'user', text: string, isHint = false) => {
    const msg: ChatMessage = { id: genId(), role, text, isHint }
    setMessages((prev) => [...prev, msg])
    conversationHistoryRef.current.push({ role, text })
    return msg
  }, [])

  // ---- 清除超时计时器 ----
  const clearTimeoutTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // ---- 调用 AI 对话 API ----
  const callAIDialogue = useCallback(
    async (userMessage: string) => {
      if (isProcessingRef.current) return
      isProcessingRef.current = true
      clearTimeoutTimer()

      try {
        setIsAITyping(true)

        const body = {
          userMessage,
          currentQaIndex: currentQaIndexRef.current,
          conversationHistory: conversationHistoryRef.current,
        }

        const res = await fetch(`/api/sub-scenes/${subSceneId}/ai-dialogue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error('API 请求失败')

        const data = await res.json()
        const { pass, nextQaIndex, aiMessage, isComplete: done, hint } = data

        // 记录当前 QA_Pair 的回应状态（仅在通过时记录）
        const currentQa = qaPairs[currentQaIndexRef.current]
        if (pass && currentQa && currentQa.qaType === 'must_speak') {
          const status: QAPairResultStatus = currentQaHintedRef.current ? 'prompted' : 'fluent'
          userTextMapRef.current.set(currentQa.id, userMessage)
          setQaResults((prev) => {
            const exists = prev.find((r) => r.qaId === currentQa.id)
            if (exists) return prev
            return [...prev, { qaId: currentQa.id, status }]
          })
        }

        // 通过后重置提示状态
        if (pass) {
          setCurrentQaHinted(false)
          currentQaHintedRef.current = false
        }

        setIsAITyping(false)

        // pass: false 时，弹出确认弹窗，等用户确认后撤销消息并重新输入
        if (!pass) {
          // 使用大模型返回的具体提示信息，或默认提示
          const hintText = hint || '回答与场景不符，请重新尝试'
          // 找到刚才加入的用户消息 id（消息列表最后一条）
          setMessages((prev) => {
            const lastUserMsg = [...prev].reverse().find((m) => m.role === 'user')
            if (lastUserMsg) {
              setRetryPrompt({ hint: hintText, userMsgId: lastUserMsg.id })
            }
            return prev
          })
          return
        }

        if (done) {
          setIsComplete(true)
          setCurrentQaIndex(nextQaIndex)
          currentQaIndexRef.current = nextQaIndex
          return
        }

        // 推进到下一个 QA_Pair
        setCurrentQaIndex(nextQaIndex)
        currentQaIndexRef.current = nextQaIndex

        // AI 发送下一条消息
        if (aiMessage) {
          addMessage('ai', aiMessage)
        }
      } catch {
        setIsAITyping(false)
        // API 失败时降级为文字输入
        setUseFallbackInput(true)
      } finally {
        isProcessingRef.current = false
      }
    },
    [subSceneId, qaPairs, addMessage, clearTimeoutTimer]
  )

  // ---- 超时提示逻辑（5秒无输入，AI 发送提示语） ----
  const startTimeoutTimer = useCallback(() => {
    clearTimeoutTimer()
    timeoutRef.current = setTimeout(async () => {
      // 标记当前 QA_Pair 已收到提示
      setCurrentQaHinted(true)
      currentQaHintedRef.current = true

      // 通过 API 获取提示语（传入特殊标记）
      try {
        setIsAITyping(true)
        const body = {
          userMessage: '__timeout_hint__',
          currentQaIndex: currentQaIndexRef.current,
          conversationHistory: conversationHistoryRef.current,
        }
        const res = await fetch(`/api/sub-scenes/${subSceneId}/ai-dialogue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setIsAITyping(false)

        if (res.ok) {
          const data = await res.json()
          if (data.aiMessage) {
            addMessage('ai', data.aiMessage, true)
          }
        } else {
          // API 失败时使用默认提示语
          addMessage('ai', 'Take your time, what would you say here?', true)
        }
      } catch {
        setIsAITyping(false)
        addMessage('ai', 'Take your time, what would you say here?', true)
      }

      // 提示后再次启动计时器
      startTimeoutTimer()
    }, 5000)
  }, [subSceneId, addMessage, clearTimeoutTimer])

  // ---- 处理用户提交（文字或语音识别结果） ----
  const handleUserSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isProcessingRef.current) return

      clearTimeoutTimer()
      addMessage('user', trimmed)
      setTextInput('')
      callAIDialogue(trimmed)
    },
    [addMessage, callAIDialogue, clearTimeoutTimer]
  )

  // ---- 初始化：AI 发送第一条消息 ----
  useEffect(() => {
    if (qaPairs.length === 0) return

    const firstQa = qaPairs[0]
    // 稍作延迟，让组件渲染完成后再显示消息
    const timer = setTimeout(() => {
      addMessage('ai', firstQa.speakerText)
      // 不自动启动超时计时器，等用户开始录音后再启动
      // startTimeoutTimer()
    }, 500)

    return () => {
      clearTimeout(timer)
      clearTimeoutTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 仅在挂载时执行一次

  // ---- 对话完成时计算 Fluency_Score，并补记未通过的 QA_Pair ----
  useEffect(() => {
    if (!isComplete) return

    // 补记没有通过记录的 must_speak QA_Pair 为 failed
    const mustSpeakQas = qaPairs.filter((q) => q.qaType === 'must_speak')
    setQaResults((prev) => {
      const extra = mustSpeakQas
        .filter((q) => !prev.find((r) => r.qaId === q.id))
        .map((q) => ({ qaId: q.id, status: 'failed' as QAPairResultStatus }))
      return extra.length > 0 ? [...prev, ...extra] : prev
    })

    const mustSpeakCount = mustSpeakQas.length
    const score = calculateFluencyScore(qaResults, mustSpeakCount)
    setFluencyScore(score)
  }, [isComplete, qaResults, qaPairs])

  // ---- 组件卸载时清理超时计时器 ----
  useEffect(() => {
    return () => {
      clearTimeoutTimer()
    }
  }, [clearTimeoutTimer])

  // ---- 语音识别相关 refs ----
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleUserSubmitRef = useRef(handleUserSubmit)
  useEffect(() => { handleUserSubmitRef.current = handleUserSubmit }, [handleUserSubmit])

  // ---- 初始化语音识别（一次性，参考 OpenTestDialog）----
  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) {
      setUseFallbackInput(true)
      return
    }

    const rec = new SR() as SpeechRecognition
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true

    const clearSilence = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    }

    const setSilenceTimeout = () => {
      clearSilence()
      silenceTimeoutRef.current = setTimeout(() => {
        const transcript = (finalTranscriptRef.current || interimTranscriptRef.current).trim()
        if (transcript) {
          handleUserSubmitRef.current(transcript)
        } else {
          setRecordingState('idle')
        }
        try { rec.stop() } catch (_) {}
      }, 800)
    }

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t
        else interimText += t
      }
      if (finalText) finalTranscriptRef.current += finalText
      if (interimText) interimTranscriptRef.current = interimText
      // 每次有语音输入就重置 800ms 静音计时器
      setSilenceTimeout()
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilence()
      if (event.error === 'aborted') return
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        setUseFallbackInput(true)
        return
      }
      setRecordingState('idle')
    }

    rec.onend = () => {
      clearSilence()
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      setRecordingState((prev) => (prev === 'recording' ? 'idle' : prev))
    }

    recognitionRef.current = rec

    return () => {
      clearSilence()
      try { rec.abort() } catch (_) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 开始录音（点击触发）----
  const startRecording = useCallback(async () => {
    if (isProcessingRef.current || isAITyping || !recognitionRef.current) return

    try {
      // 重置转录内容
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      clearTimeoutTimer()

      // 先请求麦克风权限
      await navigator.mediaDevices.getUserMedia({ audio: true })

      recognitionRef.current.start()
      setRecordingState('recording')
    } catch {
      setUseFallbackInput(true)
    }
  }, [isAITyping, clearTimeoutTimer])

  // ---- 停止录音（点击触发，手动停止）----
  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return

    // 清除静音计时器
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    const transcript = (finalTranscriptRef.current || interimTranscriptRef.current).trim()
    if (transcript) {
      handleUserSubmitRef.current(transcript)
    } else {
      setRecordingState('idle')
    }
    try { recognitionRef.current.stop() } catch (_) {}
  }, [])

  // ---- 文字输入框提交 ----
  const handleTextSubmit = useCallback(() => {
    handleUserSubmit(textInput)
  }, [handleUserSubmit, textInput])

  // ---- 用户确认"重新输入"：撤销用户消息并关闭弹窗 ----
  const handleRetryConfirm = useCallback(() => {
    if (!retryPrompt) return
    const { userMsgId } = retryPrompt

    // 从消息列表中移除该用户消息
    setMessages((prev) => prev.filter((m) => m.id !== userMsgId))

    // 同步撤销 conversationHistoryRef 中最后一条 user 记录
    const history = conversationHistoryRef.current
    const lastUserIdx = [...history].map((h, i) => ({ ...h, i })).reverse().find((h) => h.role === 'user')?.i
    if (lastUserIdx !== undefined) {
      conversationHistoryRef.current = history.filter((_, i) => i !== lastUserIdx)
    }

    setRetryPrompt(null)
  }, [retryPrompt])

  // ---- 对话完成后的 onProceed 回调 ----
  const handleProceed = useCallback(() => {
    const failedQaIds = qaResults
      .filter((r) => r.status === 'failed')
      .map((r) => r.qaId)

    // 构建对话历史（供 ReviewStage 使用）
    const dialogueHistory = qaResults.map((r) => ({
      qaId: r.qaId,
      userText: userTextMapRef.current.get(r.qaId) ?? '',
      passed: r.status !== 'failed',
    }))

    onProceed(fluencyScore, failedQaIds, dialogueHistory)
  }, [qaResults, fluencyScore, onProceed])

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} className="bg-white relative">

      {/* ---- 消息列表区域（可滚动，白色背景） ---- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#6B7280] text-sm">
            等待对话开始...
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isAITyping && <TypingIndicator />}
            {isComplete && (
              <DialogueSummary
                fluencyScore={fluencyScore}
                results={qaResults}
                qaPairs={qaPairs}
                onProceed={handleProceed}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ---- 回答不匹配确认弹窗 ---- */}
      <AnimatePresence>
        {retryPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 pb-6 px-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-5 pt-5 pb-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2937] mb-1">回答与场景不符</p>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{retryPrompt.hint}</p>
                </div>
              </div>
              <div className="h-px bg-gray-100 mx-5" />
              <div className="px-5 py-4">
                <button
                  type="button"
                  onClick={handleRetryConfirm}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white text-sm font-semibold shadow-md"
                >
                  好的，重新输入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- 底部输入区域 ---- */}
      {!isComplete && (
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-safe">

          {/* 文字输入模式 */}
          {useFallbackInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTextSubmit()
                  }
                }}
                placeholder="请输入英文回复..."
                disabled={isAITyping || isProcessingRef.current}
                className="flex-1 h-11 px-4 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/20 disabled:opacity-50 bg-gray-50"
              />
              <button
                type="button"
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isAITyping}
                className="h-11 w-11 rounded-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white flex items-center justify-center shrink-0 disabled:opacity-40"
                aria-label="发送"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
              {isSpeechRecognitionAvailable() && (
                <button
                  type="button"
                  onClick={() => setUseFallbackInput(false)}
                  className="h-11 w-11 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            /* 语音模式：宽条形按钮（与 OpenDialogue 一致） */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={recordingState === 'recording' ? stopRecording : startRecording}
                disabled={isAITyping || isProcessingRef.current}
                aria-label={recordingState === 'recording' ? '停止录音' : '开始录音'}
                className={`flex-1 h-12 rounded-full font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 select-none ${
                  recordingState === 'recording'
                    ? 'bg-[#EF4444] text-white shadow-lg shadow-red-200'
                    : isAITyping || isProcessingRef.current
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white hover:shadow-lg'
                }`}
              >
                {recordingState === 'recording' ? (
                  <><WaveformAnimation /><span>停止录音</span></>
                ) : isAITyping ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>AI 思考中...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span>开始录音</span>
                  </>
                )}
              </button>

              {/* 切换文字输入 */}
              <button
                type="button"
                onClick={() => setUseFallbackInput(true)}
                disabled={isAITyping}
                className="h-12 w-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
