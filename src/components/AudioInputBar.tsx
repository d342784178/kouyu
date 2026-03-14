'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, Keyboard } from 'lucide-react'
import { LoadingSpinner } from '@/components/Loading'

export interface AudioInputBarProps {
  isRecording: boolean
  isRecognizing: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onSendText: (text: string) => void
  isGeneratingResponse: boolean
  isAssessing?: boolean
  interimTranscript?: string
  audioLevel?: number
  defaultMode?: 'voice' | 'text'
  disabledReason?: string
  className?: string
}

function RecordingWaveform({ isRecording, audioLevel }: { isRecording: boolean; audioLevel?: number }) {
  if (!isRecording) return null

  const threshold = 5
  const normalizedLevel = audioLevel && audioLevel > threshold 
    ? Math.min((audioLevel - threshold) / 45, 1) 
    : 0

  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0, 1, 2, 3, 4].map((i) => {
        const baseHeight = 4
        const maxHeight = 16
        const barLevel = normalizedLevel * (1 - Math.abs(i - 2) * 0.15)
        const targetHeight = baseHeight + (maxHeight - baseHeight) * barLevel

        return (
          <motion.div
            key={i}
            className="w-0.5 bg-white rounded-full"
            animate={{
              height: audioLevel !== undefined ? targetHeight : [4, 16, 4],
            }}
            transition={{
              duration: 0.5,
              repeat: audioLevel !== undefined ? 0 : Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            style={audioLevel !== undefined ? { height: targetHeight } : undefined}
          />
        )
      })}
    </div>
  )
}

export default function AudioInputBar({
  isRecording,
  isRecognizing,
  onStartRecording,
  onStopRecording,
  onSendText,
  isGeneratingResponse,
  isAssessing = false,
  interimTranscript,
  audioLevel,
  defaultMode = 'voice',
  disabledReason,
  className = '',
}: AudioInputBarProps) {
  const [showTextInput, setShowTextInput] = useState(defaultMode === 'text')
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showTextInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showTextInput])

  const handleSendText = () => {
    const currentValue = inputRef.current?.value || textInput
    if (currentValue.trim()) {
      onSendText(currentValue.trim())
      setTextInput('')
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput.trim()) {
      handleSendText()
    }
  }

  const handleToggleVoice = () => {
    setShowTextInput(false)
  }

  const handleToggleText = () => {
    setShowTextInput(true)
  }

  const handleMainButtonClick = () => {
    if (isRecording) {
      onStopRecording()
    } else {
      onStartRecording()
    }
  }

  const isDisabled = isGeneratingResponse
  const showAssessing = isAssessing && !isRecording && !isRecognizing

  return (
    <div className={`shrink-0 border-t border-gray-100 px-2 py-3 pb-4 ${className}`}>
      {showTextInput ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入英文回复..."
            className="flex-1 h-12 px-5 w-64 rounded-full border border-gray-200 focus:outline-none focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/20 bg-white text-sm shadow-sm"
            disabled={isGeneratingResponse}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="h-12 w-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-full flex items-center justify-center disabled:bg-gray-300 shadow-md hover:shadow-lg"
            onClick={handleSendText}
            disabled={isGeneratingResponse}
          >
            <Send className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="h-12 w-12 bg-white text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100 shadow-md border border-gray-200 hover:bg-gray-50"
            onClick={handleToggleVoice}
            disabled={isGeneratingResponse}
          >
            <Mic className="h-5 w-5 text-gray-600" />
          </motion.button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className={`h-12 px-24 rounded-full font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap ${
              isRecording
                ? 'bg-[#EF4444] text-white shadow-red-200 hover:bg-red-600'
                : isRecognizing
                ? 'bg-gray-400 text-white cursor-wait'
                : showAssessing
                ? 'bg-gray-400 text-white cursor-wait'
                : isGeneratingResponse
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white hover:shadow-xl'
            }`}
            onClick={handleMainButtonClick}
            disabled={isDisabled || isRecognizing || showAssessing}
          >
            {isRecording ? (
              <>
                <RecordingWaveform isRecording={true} audioLevel={audioLevel} />
                <span className="whitespace-nowrap">停止录音</span>
              </>
            ) : isRecognizing ? (
              <>
                <LoadingSpinner size="sm" variant="primary" className="border-white/30 border-t-white" />
                <span className="whitespace-nowrap">识别中...</span>
              </>
            ) : showAssessing ? (
              <>
                <LoadingSpinner size="sm" variant="primary" className="border-white/30 border-t-white" />
                <span className="whitespace-nowrap">发音评估中...</span>
              </>
            ) : isGeneratingResponse ? (
              <>
                <LoadingSpinner size="sm" variant="primary" className="border-white/30 border-t-white" />
                <span className="whitespace-nowrap">AI 思考中...</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">开始录音</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="h-12 w-12 bg-white text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100 hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
            onClick={handleToggleText}
            disabled={isGeneratingResponse}
          >
            <Keyboard className="h-5 w-5 text-gray-600" />
          </motion.button>
        </div>
      )}

      {disabledReason && (
        <div className="text-center text-[#EF4444] text-xs mt-2">
          {disabledReason}
        </div>
      )}
    </div>
  )
}
