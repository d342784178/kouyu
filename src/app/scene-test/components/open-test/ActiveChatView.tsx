'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ActiveChatViewProps } from './types'

export default function ActiveChatView({
  messages,
  currentRound,
  maxRounds,
  isRecording,
  isGeneratingResponse,
  playingMessageIndex,
  error,
  onStartRecording,
  onStopRecording,
  onPlayAudio,
  onSendText,
  messagesEndRef
}: ActiveChatViewProps) {
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSendText = () => {
    if (textInput.trim()) {
      onSendText(textInput.trim())
      setTextInput('')
      setShowTextInput(false)
    }
  }

  return (
    <div className="space-y-3 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 bg-[#F5F6FA] rounded-2xl min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#6B7280] text-sm">
            等待对话开始...
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} mb-3`}
              >
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${message.role === 'assistant' ? 'bg-[#EEF2FF] text-[#1F2937]' : 'bg-[#F0FFF4] text-[#1F2937]'}`}>
                  <p className="leading-relaxed">{message.content}</p>
                  {message.audioUrl && (
                    <button
                      className="mt-1.5 text-xs flex items-center text-[#4F7CF0] hover:text-[#7B5FE8] transition-colors"
                      onClick={() => onPlayAudio(message.audioUrl!, index)}
                    >
                      <i className={`fas ${playingMessageIndex === index ? 'fa-pause' : 'fa-play'} mr-1.5 text-xs`}></i>
                      {playingMessageIndex === index ? '暂停' : '播放'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* AI 正在输入的加载动画 */}
        {isGeneratingResponse && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-[#EEF2FF] text-[#1F2937]">
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
        )}
      </div>

      {/* 状态信息 */}
      <div className="text-center text-sm text-[#6B7280]">
        第 {currentRound} / {maxRounds} 轮
      </div>

      {/* 输入区域 */}
      {showTextInput ? (
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="请输入英文回复..."
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#4F7CF0] focus:ring-2 focus:ring-[#4F7CF0]/20 bg-gray-50 text-sm"
            disabled={isGeneratingResponse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                handleSendText()
              }
            }}
          />
          <button
            className="px-4 py-3 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl hover:shadow-lg transition-all disabled:bg-gray-300 disabled:shadow-none text-sm"
            onClick={handleSendText}
            disabled={isGeneratingResponse || !textInput.trim()}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
          <button
            className="px-4 py-3 bg-gray-100 text-[#1F2937] rounded-2xl hover:bg-gray-200 transition-all disabled:bg-gray-100 text-sm"
            onClick={() => setShowTextInput(false)}
            disabled={isGeneratingResponse}
          >
            <i className="fas fa-microphone"></i>
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all shadow-md ${isRecording
              ? 'bg-[#EF4444] text-white animate-pulse'
              : isGeneratingResponse
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white hover:shadow-lg'
            }`}
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isGeneratingResponse}
          >
            <div className="flex items-center justify-center">
              <i className={`fas ${isRecording ? 'fa-stop' : isGeneratingResponse ? 'fa-spinner fa-spin' : 'fa-microphone'} mr-2`}></i>
              {isRecording ? '停止录音' : isGeneratingResponse ? 'AI 思考中...' : '开始录音'}
            </div>
          </button>

          {/* 文本输入备用 */}
          <button
            className="px-4 py-3 bg-gray-100 text-[#1F2937] rounded-2xl hover:bg-gray-200 transition-all disabled:bg-gray-100 text-sm"
            onClick={() => setShowTextInput(true)}
            disabled={isGeneratingResponse}
          >
            <i className="fas fa-keyboard"></i>
          </button>
        </div>
      )}

      {error && (
        <div className="text-center text-[#EF4444] text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
