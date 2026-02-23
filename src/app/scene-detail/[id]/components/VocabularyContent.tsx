/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildAudioUrl } from '@/lib/audioUrl';

interface VocabularyItem {
  vocab_id: string;
  scene_id: string;
  type: string;
  content: string;
  phonetic: string;
  translation: string;
  example_sentence: string;
  example_translation: string;
  audio_url?: string;
  word_audio_url?: string;
  example_audio_url?: string;
  round_number: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface VocabularyContentProps {
  vocabulary: VocabularyItem[];
}

// 难度配置
const difficultyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  'easy': { label: '简单', color: '#10B981', bgColor: '#D1FAE5' },
  'medium': { label: '中等', color: '#F59E0B', bgColor: '#FEF3C7' },
  'hard': { label: '困难', color: '#EF4444', bgColor: '#FEE2E2' },
};

// 音量图标
function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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

// 单词图标
function WordIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

// 短语图标
function PhraseIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// 筛选图标
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

const VocabularyContent: React.FC<VocabularyContentProps> = ({ vocabulary }) => {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const availableDifficulties = useMemo(() => {
    const difficulties = new Set<string>();
    vocabulary.forEach(v => {
      if (v.difficulty) {
        difficulties.add(v.difficulty);
      }
    });
    return Array.from(difficulties);
  }, [vocabulary]);

  const filteredVocabulary = useMemo(() => {
    if (selectedDifficulty === 'all') {
      return vocabulary;
    }
    return vocabulary.filter(v => v.difficulty === selectedDifficulty);
  }, [vocabulary, selectedDifficulty]);

  const playAudio = async (audioUrl: string | undefined) => {
    if (!audioUrl) {
      setAudioError('暂无音频');
      setTimeout(() => setAudioError(null), 3000);
      return;
    }

    try {
      const fullAudioUrl = buildAudioUrl(audioUrl);

      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        setCurrentAudioElement(null);
        setPlayingAudio(null);
        
        if (playingAudio === fullAudioUrl) {
          return;
        }
      }

      setPlayingAudio(fullAudioUrl);
      setAudioError(null);

      const audio = new Audio(fullAudioUrl);

      audio.onerror = () => {
        setAudioError('音频加载失败');
        setPlayingAudio(null);
        setCurrentAudioElement(null);
        setTimeout(() => setAudioError(null), 3000);
      };

      audio.onended = () => {
        setPlayingAudio(null);
        setCurrentAudioElement(null);
      };

      setCurrentAudioElement(audio);
      await audio.play();
    } catch {
      setAudioError('音频播放失败');
      setPlayingAudio(null);
      setCurrentAudioElement(null);
      setTimeout(() => setAudioError(null), 3000);
    }
  };

  const getWordAudioUrl = (vocab: VocabularyItem): string | undefined => {
    return vocab.word_audio_url || vocab.audio_url;
  };

  const isPlaying = (audioUrl: string | undefined): boolean => {
    if (!audioUrl || !playingAudio) return false;
    return playingAudio === buildAudioUrl(audioUrl);
  };

  return (
    <div className="space-y-4">
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

      {/* 难度筛选 */}
      {availableDifficulties.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm shrink-0">
            <FilterIcon className="w-4 h-4" />
            <span>难度:</span>
          </div>
          <button
            onClick={() => setSelectedDifficulty('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedDifficulty === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {availableDifficulties.map((diff) => {
            const config = difficultyConfig[diff] || { label: diff, color: '#6B7280', bgColor: '#F3F4F6' };
            const isSelected = selectedDifficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isSelected ? config.color : config.bgColor,
                  color: isSelected ? '#fff' : config.color,
                }}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 词汇数量 */}
      <div className="text-xs text-gray-400 mb-3">
        显示 {filteredVocabulary.length} 个词汇
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDifficulty}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {filteredVocabulary.map((vocab, index) => {
            const isWord = vocab.type === 'word';
            const difficulty = vocab.difficulty ? difficultyConfig[vocab.difficulty] : null;
            
            return (
              <motion.div 
                key={vocab.vocab_id || `vocab-${index}`}
                className="group bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-4 border border-gray-100 hover:border-[#4F7CF0]/20 hover:shadow-md transition-all duration-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isWord ? 'bg-blue-50' : 'bg-purple-50'}`}>
                          {isWord ? (
                            <WordIcon className="text-[#4F7CF0]" />
                          ) : (
                            <PhraseIcon className="text-purple-500" />
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {vocab.content}
                        </h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isWord ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {isWord ? '单词' : '短语'}
                        </span>
                        {/* 难度标签 */}
                        {difficulty && (
                          <span 
                            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{ 
                              color: difficulty.color, 
                              backgroundColor: difficulty.bgColor 
                            }}
                          >
                            {difficulty.label}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-3 mb-3 flex-wrap">
                        <span className="text-sm font-medium text-gray-500 font-mono whitespace-nowrap">{vocab.phonetic}</span>
                        <span className="text-sm text-gray-700">{vocab.translation}</span>
                      </div>
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-[#4F7CF0] hover:border-[#4F7CF0] transition-all shadow-sm hover:shadow-md shrink-0"
                      onClick={() => playAudio(getWordAudioUrl(vocab))}
                    >
                      {isPlaying(getWordAudioUrl(vocab)) ? (
                        <StopIcon className="text-[#4F7CF0] hover:text-white" />
                      ) : (
                        <VolumeIcon className="text-[#4F7CF0] hover:text-white" />
                      )}
                    </motion.button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 mt-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 italic flex-1">&quot;{vocab.example_sentence}&quot;</p>
                      {vocab.example_audio_url && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-[#4F7CF0] hover:border-[#4F7CF0] transition-all shadow-sm shrink-0"
                          onClick={() => playAudio(vocab.example_audio_url)}
                        >
                          {isPlaying(vocab.example_audio_url) ? (
                            <StopIcon className="text-[#4F7CF0] hover:text-white w-3 h-3" />
                          ) : (
                            <VolumeIcon className="text-[#4F7CF0] hover:text-white w-3 h-3" />
                          )}
                        </motion.button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{vocab.example_translation}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filteredVocabulary.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>该难度下暂无词汇</p>
        </div>
      )}
    </div>
  );
};

export default VocabularyContent;
