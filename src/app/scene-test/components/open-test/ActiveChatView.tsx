'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, CheckCircle } from 'lucide-react'
import { ActiveChatViewProps } from './types'
import AudioInputBar from '@/components/AudioInputBar'

export default function ActiveChatView({
  messages,
  currentRound,
  maxRounds,
  isRecording,
  isRecognizing,
  isAssessing,
  isGeneratingResponse,
  playingMessageIndex,
  error,
  isRoundLimitReached,
  onStartRecording,
  onStopRecording,
  onPlayAudio,
  onSendText,
  onSubmitEvaluation,
  messagesEndRef,
  onBack,
  interimTranscript
}: ActiveChatViewProps & { interimTranscript?: string }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isGeneratingResponse, interimTranscript])

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] bg-[#F5F6FA] px-6">

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto  py-6 space-y-5 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#6B7280] text-sm">
            等待对话开始...
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[85%]">
                  <div className={`text-[10px] mb-1 ${message.role === 'assistant' ? 'text-gray-400' : 'text-right text-gray-400'}`}>
                    {message.role === 'assistant' ? 'AI 助手' : '我'}
                  </div>
                  
                  <div className={`px-5 py-4 rounded-2xl text-sm shadow-sm transition-all duration-300 ${
                    message.role === 'assistant' 
                      ? 'bg-white border border-gray-100 text-[#1F2937] rounded-bl-md hover:shadow-md' 
                      : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-br-md shadow-md hover:shadow-lg'
                  }`}>
                    <p className="leading-relaxed">{message.content}</p>
                  </div>
                  
                  {message.audioUrl && message.role === 'assistant' && (
                    <button
                      className="mt-3 text-xs flex items-center text-[#4F7CF0] hover:text-[#7B5FE8] transition-colors font-medium px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100"
                      onClick={() => onPlayAudio(message.audioUrl!, index)}
                    >
                      {playingMessageIndex === index ? (
                        <Pause className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1" />
                      )}
                      {playingMessageIndex === index ? '暂停' : '播放'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isRecording && interimTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[80%]">
                  <div className="text-[10px] text-right text-gray-400 mb-1">识别中...</div>
                  <div className="px-4 py-3 rounded-2xl text-sm bg-gray-100 text-gray-500 rounded-br-md border border-dashed border-gray-300">
                    <p className="leading-relaxed">{interimTranscript}</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}

        {isGeneratingResponse && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-white border border-gray-100 text-[#1F2937] rounded-bl-md shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#4F7CF0] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-[#4F7CF0] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#4F7CF0] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-[#4F7CF0] font-medium">AI 正在输入...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 px-2 py-3 pb-4">
        <div className="text-center text-xs text-gray-500 mb-3">
          第 {currentRound} / {maxRounds} 轮
        </div>

        {isRoundLimitReached ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <p className="text-sm font-medium text-[#1F2937] mb-1">
                对话已完成
              </p>
              <p className="text-xs text-[#6B7280]">
                点击按钮提交对话进行评测
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-2xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 bg-[#10b981] text-white hover:shadow-lg"
              onClick={onSubmitEvaluation}
            >
              <CheckCircle className="h-5 w-5" />
              提交评测
            </motion.button>
          </div>
        ) : (
          <AudioInputBar
            isRecording={isRecording}
            isRecognizing={isRecognizing || false}
            isAssessing={isAssessing}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            onSendText={onSendText}
            isGeneratingResponse={isGeneratingResponse}
            interimTranscript={interimTranscript}
            disabledReason={error}
          />
        )}
      </div>
    </div>
  )
}
