/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buildAudioUrl } from '@/lib/audioUrl';

interface VocabularyContentProps {
  vocabulary: Array<{
    vocab_id: string;
    scene_id: string;
    type: string;
    content: string;
    phonetic: string;
    translation: string;
    example_sentence: string;
    example_translation: string;
    audio_url: string;
    round_number: number;
  }>;
}

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

const VocabularyContent: React.FC<VocabularyContentProps> = ({ vocabulary }) => {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      setAudioError('暂不支持音频播放');
      setTimeout(() => setAudioError(null), 3000);
      return;
    }

    try {
      const fullAudioUrl = buildAudioUrl(audioUrl);

      if (playingAudio) {
        const currentAudio = new Audio(playingAudio);
        currentAudio.pause();
      }

      setPlayingAudio(fullAudioUrl);
      setAudioError(null);

      const audio = new Audio(fullAudioUrl);

      audio.onerror = () => {
        setAudioError('暂不支持音频播放');
        setPlayingAudio(null);
        setTimeout(() => setAudioError(null), 3000);
      };

      await audio.play();

      audio.onended = () => {
        setPlayingAudio(null);
      };
    } catch {
      setAudioError('暂不支持音频播放');
      setPlayingAudio(null);
      setTimeout(() => setAudioError(null), 3000);
    }
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

      {vocabulary.map((vocab, index) => {
        const isWord = vocab.type === 'word';
        
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
                  </div>
                  
                  <div className="flex items-start gap-3 mb-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-500 font-mono whitespace-nowrap">{vocab.phonetic}</span>
                    <span className="text-sm text-gray-700">{vocab.translation}</span>
                  </div>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-[#4F7CF0] hover:border-[#4F7CF0] hover:text-white transition-all shadow-sm group-hover:shadow-md shrink-0"
                  onClick={() => playAudio(vocab.audio_url)}
                >
                  {playingAudio && playingAudio.includes(vocab.audio_url) ? (
                    <StopIcon className="text-[#4F7CF0] group-hover:text-white" />
                  ) : (
                    <VolumeIcon className="text-[#4F7CF0] group-hover:text-white" />
                  )}
                </motion.button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 mt-2">
                <p className="text-sm text-gray-800 italic">&quot;{vocab.example_sentence}&quot;</p>
                <p className="text-xs text-gray-500">{vocab.example_translation}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default VocabularyContent;
