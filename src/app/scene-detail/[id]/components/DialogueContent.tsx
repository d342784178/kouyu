/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAudioUrl } from '@/lib/audioUrl';

interface Answer {
  answer_id?: string;
  text: string;
  translation: string;
  audio_url?: string;
  scenario: string;
  formality: string;
}

interface QAAnalysis {
  analysis_detail: string;
  standard_answer: Answer;
  alternative_answers: Answer[];
  usage_notes: string;
}

interface DialogueItem {
  index: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  audio_url: string;
  is_key_qa: boolean;
}

interface DialogueRound {
  round_number: number;
  content: DialogueItem[];
  analysis?: QAAnalysis;
}

interface DialogueContentProps {
  rounds: DialogueRound[];
}

// 音量图标
function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// 停止图标
function StopIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// 灯泡图标
function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

// 向下箭头图标
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// 消息图标
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

// 分析图标
function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12h10" />
      <path d="M9 4v16" />
      <path d="m3 9 3 3-3 3" />
      <path d="M14 8V4h8v4" />
      <path d="M14 12h8" />
      <path d="M18 16v4" />
    </svg>
  );
}

// 笔记图标
function NotesIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
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

  // 当前音频元素引用
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // 播放音频的函数
  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      console.warn('[DialogueContent] 音频URL为空');
      setAudioError('暂不支持音频播放');
      setTimeout(() => setAudioError(null), 3000);
      return;
    }

    try {
      // 构建完整的音频URL（使用代理模式）
      const fullAudioUrl = getAudioUrl(audioUrl);
      
      // 如果点击的是当前正在播放的音频，则停止播放
      if (playingAudio === fullAudioUrl) {
        console.log('[DialogueContent] 停止当前播放的音频:', fullAudioUrl);
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        setPlayingAudio(null);
        return;
      }

      console.log('[DialogueContent] 尝试播放音频:', {
        originalUrl: audioUrl,
        fullUrl: fullAudioUrl
      });

      // 停止当前正在播放的音频
      if (currentAudioRef.current) {
        console.log('[DialogueContent] 停止之前播放的音频');
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // 设置当前播放的音频
      setPlayingAudio(fullAudioUrl);
      setAudioError(null);

      try {
        // 尝试创建并播放新音频
        const audio = new Audio(fullAudioUrl);
        currentAudioRef.current = audio;

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
          currentAudioRef.current = null;
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
          currentAudioRef.current = null;
        };
      } catch (playError: any) {
        console.error('[DialogueContent] 音频播放失败:', {
          url: fullAudioUrl,
          error: playError.message,
          name: playError.name
        });
        setAudioError('暂不支持音频播放');
        setPlayingAudio(null);
        currentAudioRef.current = null;
        setTimeout(() => setAudioError(null), 3000);
      }
    } catch (error: any) {
      console.error('[DialogueContent] 播放音频时发生错误:', {
        error: error.message,
        stack: error.stack
      });
      setAudioError('暂不支持音频播放');
      setPlayingAudio(null);
      currentAudioRef.current = null;
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

  // 确定角色类型
  const isSystemRole = (speaker: string) => {
    const systemRoles = ['waiter', 'A', 'agent', 'clerk', 'barman', 'salesperson', 'doctor', 'pharmacist', 'cashier', 'staff', 'receptionist', 'speaker2', 'Receptionist', 'Waiter', 'Agent', 'Clerk', 'Barman', 'Salesperson', 'Doctor', 'Pharmacist', 'Cashier', 'Staff'];
    return systemRoles.includes(speaker);
  };

  const isUserRole = (speaker: string) => {
    const userRoles = ['customer', 'B', 'passenger', 'patient', 'guest', 'visitor', 'buyer', 'speaker1', 'Tourist', 'Customer', 'Passenger', 'Patient', 'Guest', 'Visitor', 'Buyer', 'tourist'];
    return userRoles.includes(speaker);
  };

  return (
    <div className="space-y-8">
      {/* 音频错误提示 */}
      {audioError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl shadow-lg z-50 text-sm font-medium border border-amber-100"
        >
          {audioError}
        </motion.div>
      )}

      {/* 对话回合 */}
      {rounds.map((round) => {
        const isExpanded = expandedAnalysis.includes(round.round_number);
        const hasAnalysis = round.analysis && (round.analysis.standard_answer || round.analysis.alternative_answers?.length > 0);

        return (
          <div key={round.round_number} id={`dialogue-turn-${round.round_number}`} className="space-y-4">
            {/* 轮次标题 */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center text-white text-sm font-bold">
                {round.round_number}
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
            </div>
            
            {/* 对话内容 */}
            <div className="space-y-4">
              {round.content.map((dialogue) => {
                const systemRole = isSystemRole(dialogue.speaker);
                const userRole = isUserRole(dialogue.speaker);

                return (
                  <div key={dialogue.index} className={`flex flex-col ${systemRole ? 'items-start' : userRole ? 'items-end' : 'items-start'}`}>
                    {/* 头像和名字 */}
                    <div className={`flex items-center gap-2 mb-2 ${systemRole ? 'flex-row' : userRole ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          systemRole 
                            ? 'bg-gray-100 text-gray-600' 
                            : userRole 
                              ? 'bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] text-white shadow-md' 
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getAvatarLetter(dialogue.speaker_name)}
                      </div>
                      <span className="text-xs font-medium text-gray-500">{dialogue.speaker_name}</span>
                    </div>

                    {/* 消息气泡和播放按钮 */}
                    <div className="flex items-end gap-2">
                      {/* 用户角色的播放按钮在左侧 */}
                      {userRole && (
                        <motion.button
                          id={`play-turn-${round.round_number}-${dialogue.index}`}
                          whileTap={{ scale: 0.9 }}
                          className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-[#4F7CF0]/30 transition-all flex-shrink-0 shadow-sm"
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

                      {/* 消息气泡 */}
                      <div
                        className="px-4 py-3 max-w-[280px] shadow-sm"
                        style={{
                          backgroundColor: systemRole ? '#F8FAFC' : userRole ? '#4F7CF0' : '#F8FAFC',
                          borderRadius: systemRole ? '4px 16px 16px 16px' : userRole ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          color: systemRole ? '#1F2937' : userRole ? 'white' : '#1F2937',
                          border: systemRole ? '1px solid #E2E8F0' : userRole ? 'none' : '1px solid #E2E8F0'
                        }}
                      >
                        <p className="text-[15px] leading-relaxed font-medium">{dialogue.text}</p>
                        <p className={`text-xs mt-1.5 ${systemRole ? 'text-gray-500' : userRole ? 'text-blue-100' : 'text-gray-500'}`}>
                          {dialogue.translation}
                        </p>
                      </div>

                      {/* 系统角色的播放按钮在右侧 */}
                      {(systemRole || !userRole) && (
                        <motion.button
                          id={`play-turn-${round.round_number}-${dialogue.index}`}
                          whileTap={{ scale: 0.9 }}
                          className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all flex-shrink-0 shadow-sm"
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

            {/* 问答解析卡片 - 优化设计 */}
            {hasAnalysis && (
              <div className="mt-5 bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl border border-amber-200/60 overflow-hidden shadow-sm">
                {/* 解析头部 */}
                <button
                  onClick={() => toggleAnalysis(round.round_number)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <LightbulbIcon className="text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-amber-800">问答解析</span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-7 h-7 rounded-full bg-amber-100/80 flex items-center justify-center"
                  >
                    <ChevronDownIcon className="text-amber-600 w-4 h-4" />
                  </motion.div>
                </button>

                {/* 解析内容 */}
                <AnimatePresence>
                  {isExpanded && round.analysis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {/* 分析详情 */}
                        {round.analysis.analysis_detail && (
                          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <AnalysisIcon className="text-[#4F7CF0]" />
                              <span className="text-sm font-semibold text-gray-800">分析详情</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{round.analysis.analysis_detail}</p>
                          </div>
                        )}

                        {/* 标准回答 */}
                        <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-gray-800">标准回答</span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[15px] text-gray-900 font-medium">{round.analysis.standard_answer.text}</p>
                            <p className="text-sm text-gray-500">{round.analysis.standard_answer.translation}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                              {round.analysis.standard_answer.scenario}
                            </span>
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-lg">
                              {round.analysis.standard_answer.formality}
                            </span>
                          </div>
                          {round.analysis.standard_answer.audio_url && (
                            <div className="mt-3">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#4F7CF0] text-white text-sm font-medium rounded-xl hover:bg-[#3D6AE0] transition-colors shadow-sm"
                                onClick={() => playAudio(round.analysis!.standard_answer.audio_url!)}
                              >
                                {isPlayingCurrent(round.analysis.standard_answer.audio_url) ? (
                                  <StopIcon className="w-4 h-4" />
                                ) : (
                                  <VolumeIcon className="w-4 h-4" />
                                )}
                                播放发音
                              </motion.button>
                            </div>
                          )}
                        </div>

                        {/* 其他表达方式 */}
                        {round.analysis.alternative_answers.length > 0 && (
                          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageIcon className="text-gray-500" />
                              <span className="text-sm font-semibold text-gray-800">其他表达方式</span>
                            </div>
                            <div className="space-y-3">
                              {round.analysis.alternative_answers.map((altAnswer, index) => (
                                <div key={altAnswer.answer_id || index} className="pb-3 last:pb-0 border-b border-gray-100 last:border-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1.5">
                                      <p className="text-sm text-gray-800 font-medium">{altAnswer.text}</p>
                                      <p className="text-xs text-gray-500">{altAnswer.translation}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                                          {altAnswer.scenario}
                                        </span>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                                          {altAnswer.formality}
                                        </span>
                                      </div>
                                    </div>
                                    {altAnswer.audio_url && (
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                                        onClick={() => playAudio(altAnswer.audio_url!)}
                                      >
                                        {isPlayingCurrent(altAnswer.audio_url) ? (
                                          <StopIcon className="text-gray-600 w-3.5 h-3.5" />
                                        ) : (
                                          <VolumeIcon className="text-gray-600 w-3.5 h-3.5" />
                                        )}
                                      </motion.button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 使用说明 */}
                        {round.analysis.usage_notes && (
                          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <NotesIcon className="text-amber-600" />
                              <span className="text-sm font-semibold text-gray-800">使用说明</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{round.analysis.usage_notes}</p>
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
