'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, Keyboard, Play, Pause, CheckCircle, ChevronLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/Loading'
import { ActiveChatViewProps } from './types'

// 录音波形动画组件
function RecordingWaveform({ isRecording }: { isRecording: boolean }) {
  if (!isRecording) return null
  
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-white rounded-full"
          animate={{
            height: [4, 16, 4],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

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
  messagesEndRef,
  onBack,
  interimTranscript
}: ActiveChatViewProps & { interimTranscript?: string }) {
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isGeneratingResponse, interimTranscript])

  const handleSendText = () => {
    const currentValue = inputRef.current?.value || textInput
    if (currentValue.trim()) {
      onSendText(currentValue.trim())
      setTextInput('')
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      setShowTextInput(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA] min-h-screen">
      {/* 顶部导航栏 - 仅显示居中标题 */}
      <div className="flex items-center justify-center px-6 py-4 border-b border-gray-100 bg-white shrink-0 shadow-sm">
        <div className="text-center">
          <span className="text-base font-semibold text-gray-800">对话练习</span>
        </div>
      </div>

      {/* 对话区域 - 可滚动 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
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
                  {/* 角色标签 */}
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
                  
                  {/* 播放按钮放在气泡下方 */}
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
            
            {/* 实时语音识别转写预览 */}
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

        {/* AI 正在输入的加载动画 */}
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

      {/* 底部固定控制栏 - 使用 sticky 定位固定在对话区域底部 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 pb-safe safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* 轮次显示 */}
        <div className="text-center text-xs text-gray-500 mb-3">
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
                  className="flex-1 h-13 px-5 rounded-full border border-gray-200 focus:outline-none focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/20 bg-white text-sm shadow-sm"
                  disabled={isGeneratingResponse}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      handleSendText()
                    }
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-13 w-13 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-full flex items-center justify-center disabled:bg-gray-300 shadow-md hover:shadow-lg"
                  onClick={handleSendText}
                  disabled={isGeneratingResponse}
                >
                  <Send className="h-5 w-5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-13 w-13 bg-white text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100 shadow-md border border-gray-200 hover:bg-gray-50"
                  onClick={() => setShowTextInput(false)}
                  disabled={isGeneratingResponse}
                >
                  <Mic className="h-5 w-5 text-gray-600" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 h-13 rounded-full font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isRecording
                      ? 'bg-[#EF4444] text-white shadow-red-200 hover:bg-red-600'
                      : isGeneratingResponse
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white hover:shadow-xl hover:scale-[1.02]'
                  }`}
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  disabled={isGeneratingResponse}
                >
                  {isRecording ? (
                    <>
                      <RecordingWaveform isRecording={true} />
                      <span>停止录音</span>
                    </>
                  ) : isGeneratingResponse ? (
                    <>
                      <LoadingSpinner size="sm" variant="primary" className="border-white/30 border-t-white" />
                      <span>AI 思考中...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      <span>开始录音</span>
                    </>
                  )}
                </motion.button>

                {/* 文本输入备用 */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-13 w-13 bg-white text-[#1F2937] rounded-full flex items-center justify-center disabled:bg-gray-100 hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
                  onClick={() => setShowTextInput(true)}
                  disabled={isGeneratingResponse}
                >
                  <Keyboard className="h-5 w-5 text-gray-600" />
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
