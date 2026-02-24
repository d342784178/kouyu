'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, Keyboard, Play, Pause, CheckCircle } from 'lucide-react'
import { ActiveChatViewProps } from './types'

export default function ActiveChatView({
  messages,
  currentRound,
  maxRounds,
  isRecording,
  isGeneratingResponse,
  playingMessageIndex,
  error,
  isRoundLimitReached,
  onStartRecording,
  onStopRecording,
  onPlayAudio,
  onSendText,
  onSubmitEvaluation,
  messagesEndRef
}: ActiveChatViewProps) {
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isGeneratingResponse])

  const handleSendText = () => {
    // 优先使用输入框的当前值，确保能获取到最新输入
    const currentValue = inputRef.current?.value || textInput
    console.log('handleSendText 被调用', {
      inputRefValue: inputRef.current?.value,
      textInput,
      currentValue,
      hasValue: !!currentValue.trim()
    })
    if (currentValue.trim()) {
      console.log('发送文本:', currentValue.trim())
      onSendText(currentValue.trim())
      setTextInput('')
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      setShowTextInput(false)
    } else {
      console.log('没有可发送的文本')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 对话区域 - 可滚动 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
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
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  message.role === 'assistant' 
                    ? 'bg-[#EEF2FF] text-[#1F2937] rounded-bl-md' 
                    : 'bg-[#4F7CF0] text-white rounded-br-md'
                }`}>
                  <p className="leading-relaxed">{message.content}</p>
                  {message.audioUrl && message.role === 'assistant' && (
                    <button
                      className="mt-2 text-xs flex items-center text-[#4F7CF0] hover:text-[#7B5FE8] transition-colors bg-white/50 px-2 py-1 rounded-full"
                      onClick={() => onPlayAudio(message.audioUrl!, index)}
                    >
                      {playingMessageIndex === index ? (
                        <Pause className="h-3 w-3 mr-1" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      {playingMessageIndex === index ? '暂停' : '播放'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* AI 正在输入的加载动画 */}
        {isGeneratingResponse && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-[#EEF2FF] text-[#1F2937] rounded-bl-md">
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
          </motion.div>
        )}
      </div>

      {/* 底部固定区域 */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 pb-safe">
        {/* 轮次信息 */}
        <div className="text-center text-xs text-[#6B7280] mb-3">
          第 {currentRound} / {maxRounds} 轮
        </div>

        {/* 对话结束时显示提交评测按钮 */}
        {isRoundLimitReached ? (
          <div className="flex flex-col items-center gap-3">
            {/* 提示信息 */}
            <div className="text-center">
              <p className="text-sm font-medium text-[#1F2937] mb-1">
                对话已完成
              </p>
              <p className="text-xs text-[#6B7280]">
                点击按钮提交对话进行评测
              </p>
            </div>
            {/* 提交评测按钮 - 使用成功绿色 */}
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
          <>
            {/* 输入区域 */}
            {showTextInput ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="请输入英文回复..."
                  className="flex-1 h-11 px-4 rounded-full border border-gray-200 focus:outline-none focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/20 bg-gray-50 text-sm"
                  disabled={isGeneratingResponse}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      handleSendText()
                    }
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-11 w-11 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-full flex items-center justify-center disabled:bg-gray-300"
                  onClick={handleSendText}
                  disabled={isGeneratingResponse}
                >
                  <Send className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-11 w-11 bg-gray-100 text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100"
                  onClick={() => setShowTextInput(false)}
                  disabled={isGeneratingResponse}
                >
                  <Mic className="h-4 w-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 h-11 rounded-full font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                    isRecording
                      ? 'bg-[#EF4444] text-white animate-pulse'
                      : isGeneratingResponse
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white hover:shadow-lg'
                  }`}
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  disabled={isGeneratingResponse}
                >
                  {isRecording ? (
                    <>
                      <div className="w-3 h-3 bg-white rounded-sm" />
                      停止录音
                    </>
                  ) : isGeneratingResponse ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI 思考中...
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      开始录音
                    </>
                  )}
                </motion.button>

                {/* 文本输入备用 */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-11 w-11 bg-gray-100 text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100"
                  onClick={() => setShowTextInput(true)}
                  disabled={isGeneratingResponse}
                >
                  <Keyboard className="h-4 w-4" />
                </motion.button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="text-center text-[#EF4444] text-xs mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
