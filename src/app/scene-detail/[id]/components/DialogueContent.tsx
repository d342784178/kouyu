/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buildAudioUrl } from '@/lib/audioUrl';

interface DialogueContentProps {
  rounds: Array<{
    round_number: number;
    content: Array<{
      index: number;
      speaker: string;
      speaker_name: string;
      text: string;
      translation: string;
      audio_url: string;
      is_key_qa: boolean;
    }>;
  }>;
}

// 音量图标
function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// 停止图标
function StopIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

const DialogueContent: React.FC<DialogueContentProps> = ({ rounds }) => {
  // 音频播放状态
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  // 音频加载错误状态
  const [audioError, setAudioError] = useState<string | null>(null);

  // 播放音频的函数
  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      console.warn('[DialogueContent] 音频URL为空');
      setAudioError('暂不支持音频播放');
      setTimeout(() => setAudioError(null), 3000);
      return;
    }

    try {
      // 构建完整的音频URL
      const fullAudioUrl = buildAudioUrl(audioUrl);
      console.log('[DialogueContent] 尝试播放音频:', {
        originalUrl: audioUrl,
        fullUrl: fullAudioUrl
      });

      // 停止当前正在播放的音频
      if (playingAudio) {
        console.log('[DialogueContent] 停止当前播放的音频:', playingAudio);
        const currentAudio = new Audio(playingAudio);
        currentAudio.pause();
      }

      // 设置当前播放的音频
      setPlayingAudio(fullAudioUrl);
      setAudioError(null);

      try {
        // 尝试创建并播放新音频
        const audio = new Audio(fullAudioUrl);

        // 监听音频加载错误
        audio.onerror = (e) => {
          console.error('[DialogueContent] 音频加载失败:', {
            url: fullAudioUrl,
            error: e,
            networkState: audio.networkState,
            readyState: audio.readyState
          });
          setAudioError('暂不支持音频播放');
          setPlayingAudio(null);
          setTimeout(() => setAudioError(null), 3000);
        };

        // 监听音频可以播放事件
        audio.oncanplay = () => {
          console.log('[DialogueContent] 音频加载成功，可以播放:', fullAudioUrl);
        };

        await audio.play();
        console.log('[DialogueContent] 音频开始播放:', fullAudioUrl);

        // 音频播放结束后重置状态
        audio.onended = () => {
          console.log('[DialogueContent] 音频播放结束:', fullAudioUrl);
          setPlayingAudio(null);
        };
      } catch (playError: any) {
        console.error('[DialogueContent] 音频播放失败:', {
          url: fullAudioUrl,
          error: playError.message,
          name: playError.name
        });
        setAudioError('暂不支持音频播放');
        setPlayingAudio(null);
        setTimeout(() => setAudioError(null), 3000);
      }
    } catch (error: any) {
      console.error('[DialogueContent] 播放音频时发生错误:', {
        error: error.message,
        stack: error.stack
      });
      setAudioError('暂不支持音频播放');
      setPlayingAudio(null);
      setTimeout(() => setAudioError(null), 3000);
    }
  };

  // 获取头像字母
  const getAvatarLetter = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // 检查是否正在播放当前音频
  const isPlayingCurrent = (audioUrl: string) => {
    return playingAudio && playingAudio.includes(audioUrl);
  };

  return (
    <div className="space-y-6">
      {/* 音频错误提示 */}
      {audioError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-50"
        >
          {audioError}
        </motion.div>
      )}

      {/* 对话回合 */}
      {rounds.map((round) => (
        <div key={round.round_number} id={`dialogue-turn-${round.round_number}`} className="space-y-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">回合 {round.round_number}</h3>
          {round.content.map((dialogue) => {
            // 确定角色类型：true 为系统角色（如服务员、值机员等），false 为用户角色（如顾客、乘客等）
            const isSystemRole = ['waiter', 'A', 'agent', 'clerk', 'barman', 'salesperson', 'doctor', 'pharmacist', 'cashier', 'staff', 'receptionist', 'speaker2'].includes(dialogue.speaker);
            const isUserRole = ['customer', 'B', 'passenger', 'patient', 'guest', 'visitor', 'buyer', 'speaker1'].includes(dialogue.speaker);

            return (
              <div key={dialogue.index} className={`flex flex-col ${isSystemRole ? 'items-start' : isUserRole ? 'items-end' : 'items-start'}`}>
                {/* 第一行：头像和名字 */}
                <div className={`flex items-center gap-2 mb-2 ${isSystemRole ? 'flex-row' : isUserRole ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* 头像 */}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      isSystemRole 
                        ? 'bg-gray-200 text-gray-600' 
                        : isUserRole 
                          ? 'bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] text-white' 
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {getAvatarLetter(dialogue.speaker_name)}
                  </div>
                  {/* 名字 */}
                  <span className="text-sm text-gray-500">{dialogue.speaker_name}</span>
                </div>

                {/* 第二行：消息气泡和播放按钮 */}
                <div className="flex items-end gap-2">
                  {/* 左侧对话（系统角色）：播放按钮放在右侧（外侧） */}
                  {/* 右侧对话（用户角色）：播放按钮放在左侧（外侧） */}
                  {isUserRole && (
                    <motion.button
                      id={`play-turn-${round.round_number}-${dialogue.index}`}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                      onClick={() => playAudio(dialogue.audio_url)}
                      title={dialogue.audio_url || '暂无音频'}
                    >
                      {isPlayingCurrent(dialogue.audio_url) ? (
                        <StopIcon className="text-[#4F7CF0]" />
                      ) : (
                        <VolumeIcon className="text-[#4F7CF0]" />
                      )}
                    </motion.button>
                  )}

                  <div
                    className="px-4 py-3 max-w-[280px]"
                    style={{
                      backgroundColor: isSystemRole ? '#f3f4f6' : isUserRole ? '#4F7CF0' : '#f3f4f6',
                      borderRadius: isSystemRole ? '4px 18px 18px 18px' : isUserRole ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                      color: isSystemRole ? '#1f2937' : isUserRole ? 'white' : '#1f2937'
                    }}
                  >
                    <p className="text-base leading-relaxed">{dialogue.text}</p>
                    <p className={`text-sm mt-1 ${isSystemRole ? 'text-gray-500' : isUserRole ? 'text-blue-100' : 'text-gray-500'}`}>
                      {dialogue.translation}
                    </p>
                  </div>

                  {/* 系统角色的播放按钮在右侧（外侧） */}
                  {(isSystemRole || !isUserRole) && (
                    <motion.button
                      id={`play-turn-${round.round_number}-${dialogue.index}`}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                      onClick={() => playAudio(dialogue.audio_url)}
                      title={dialogue.audio_url || '暂无音频'}
                    >
                      {isPlayingCurrent(dialogue.audio_url) ? (
                        <StopIcon className="text-gray-500" />
                      ) : (
                        <VolumeIcon className="text-gray-500" />
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default DialogueContent;
