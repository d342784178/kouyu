/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildAudioUrl } from '@/lib/audioUrl';

interface Answer {
  answer_id: string;
  text: string;
  translation: string;
  audio_url: string;
  scenario: string;
  formality: string;
}

interface QAAnalysis {
  analysis_detail: string;
  standard_answer: Answer;
  alternative_answers: Answer[];
  usage_notes: string;
}

interface DialogueRound {
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
  analysis?: QAAnalysis;
}

interface DialogueContentProps {
  rounds: DialogueRound[];
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

// 灯泡图标
function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

// 向下箭头图标
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// 消息图标
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

const DialogueContent: React.FC<DialogueContentProps> = ({ rounds }) => {
  // 音频播放状态
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  // 音频加载错误状态
  const [audioError, setAudioError] = useState<string | null>(null);
  // 展开的解析卡片状态
  const [expandedAnalysis, setExpandedAnalysis] = useState<number[]>([]);

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

  // 切换解析卡片的展开/折叠状态
  const toggleAnalysis = (roundNumber: number) => {
    setExpandedAnalysis(prev => {
      if (prev.includes(roundNumber)) {
        return prev.filter(n => n !== roundNumber);
      } else {
        return [...prev, roundNumber];
      }
    });
  };

  // 获取回合中的问题（第一个 is_key_qa 为 true 的内容，或者是第一个系统角色的内容）
  const getQuestion = (round: DialogueRound) => {
    const keyQa = round.content.find(d => d.is_key_qa);
    if (keyQa) return keyQa;
    // 如果没有标记的 key_qa，返回第一个系统角色的内容
    return round.content.find(d => 
      ['waiter', 'A', 'agent', 'clerk', 'barman', 'salesperson', 'doctor', 'pharmacist', 'cashier', 'staff', 'receptionist', 'speaker2'].includes(d.speaker)
    ) || round.content[0];
  };

  // 获取回合中的回答（用户角色的内容）
  const getAnswer = (round: DialogueRound) => {
    return round.content.find(d => 
      ['customer', 'B', 'passenger', 'patient', 'guest', 'visitor', 'buyer', 'speaker1'].includes(d.speaker)
    );
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
      {rounds.map((round) => {
        const isExpanded = expandedAnalysis.includes(round.round_number);
        const question = getQuestion(round);
        const answer = getAnswer(round);
        const hasAnalysis = round.analysis && (round.analysis.standard_answer || round.analysis.alternative_answers?.length > 0);

        return (
          <div key={round.round_number} id={`dialogue-turn-${round.round_number}`} className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">第 {round.round_number} 轮</h3>
            
            {/* 对话内容 */}
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

            {/* 问答解析卡片 */}
            {hasAnalysis && (
              <div className="mt-4 bg-[#FFFBF0] rounded-xl border border-[#F5E6C8] overflow-hidden">
                {/* 解析头部 - 可点击展开/折叠 */}
                <button
                  onClick={() => toggleAnalysis(round.round_number)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FFF5E0] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LightbulbIcon className="text-[#D97706]" />
                    <span className="text-sm font-medium text-[#92400E]">查看问答解析</span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDownIcon className="text-[#D97706]" />
                  </motion.div>
                </button>

                {/* 解析内容 */}
                <AnimatePresence>
                  {isExpanded && round.analysis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {/* 分析详情 */}
                        {round.analysis.analysis_detail && (
                          <div className="bg-white rounded-lg p-3 border border-[#F0E4D1]">
                            <div className="flex items-start gap-2">
                              <span className="text-[#4F7CF0] font-semibold text-sm shrink-0">分析详情</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{round.analysis.analysis_detail}</p>
                          </div>
                        )}

                        {/* 标准回答 */}
                        <div className="bg-white rounded-lg p-3 border border-[#F0E4D1]">
                          <div className="flex items-start gap-2">
                            <span className="text-[#22C55E] font-semibold text-sm shrink-0">标准回答</span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-800">{round.analysis.standard_answer.text}</p>
                            <p className="text-xs text-gray-500">{round.analysis.standard_answer.translation}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                              场景: {round.analysis.standard_answer.scenario}
                            </span>
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                              正式度: {round.analysis.standard_answer.formality}
                            </span>
                          </div>
                          {round.analysis.standard_answer.audio_url && (
                            <div className="mt-2">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
                                onClick={() => playAudio(round.analysis!.standard_answer.audio_url)}
                              >
                                {isPlayingCurrent(round.analysis.standard_answer.audio_url) ? (
                                  <StopIcon className="text-blue-500 w-4 h-4" />
                                ) : (
                                  <VolumeIcon className="text-blue-500 w-4 h-4" />
                                )}
                              </motion.button>
                            </div>
                          )}
                        </div>

                        {/* 其他表达方式 */}
                        {round.analysis.alternative_answers.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-[#F0E4D1]">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageIcon className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">其他表达方式</span>
                            </div>
                            <ul className="space-y-3">
                              {round.analysis.alternative_answers.map((altAnswer, index) => (
                                <li key={altAnswer.answer_id || index} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm text-gray-800">{altAnswer.text}</p>
                                      <p className="text-xs text-gray-500">{altAnswer.translation}</p>
                                      <div className="flex flex-wrap gap-1">
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                          {altAnswer.scenario}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                          {altAnswer.formality}
                                        </span>
                                      </div>
                                    </div>
                                    {altAnswer.audio_url && (
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                                        onClick={() => playAudio(altAnswer.audio_url)}
                                      >
                                        {isPlayingCurrent(altAnswer.audio_url) ? (
                                          <StopIcon className="text-gray-500 w-3 h-3" />
                                        ) : (
                                          <VolumeIcon className="text-gray-500 w-3 h-3" />
                                        )}
                                      </motion.button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 使用说明 */}
                        {round.analysis.usage_notes && (
                          <div className="bg-white rounded-lg p-3 border border-[#F0E4D1]">
                            <div className="flex items-start gap-2">
                              <span className="text-[#D97706] font-semibold text-sm shrink-0">使用说明</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{round.analysis.usage_notes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DialogueContent;
