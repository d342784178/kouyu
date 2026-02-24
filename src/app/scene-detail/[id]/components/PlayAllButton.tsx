'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getAudioUrl } from '@/lib/audioUrl';

interface PlayAllButtonProps {
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

// 播放图标
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// 停止图标
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

const PlayAllButton: React.FC<PlayAllButtonProps> = ({ rounds }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 收集所有音频URL（使用代理模式）
  const getAllAudioUrls = () => {
    const urls: string[] = [];
    rounds.forEach(round => {
      round.content.forEach(dialogue => {
        if (dialogue.audio_url) {
          urls.push(getAudioUrl(dialogue.audio_url));
        }
      });
    });
    return urls;
  };

  // 播放全部音频
  const playAll = async () => {
    const audioUrls = getAllAudioUrls();
    
    if (audioUrls.length === 0) {
      console.warn('[PlayAllButton] 没有可播放的音频');
      return;
    }

    console.log('[PlayAllButton] 开始播放全部音频，共', audioUrls.length, '个');
    
    setIsPlaying(true);
    setCurrentIndex(0);

    // 顺序播放所有音频
    for (let i = 0; i < audioUrls.length; i++) {
      setCurrentIndex(i);
      console.log(`[PlayAllButton] 播放第 ${i + 1}/${audioUrls.length} 个音频:`, audioUrls[i]);
      
      try {
        await playSingleAudio(audioUrls[i]);
      } catch (error) {
        console.error(`[PlayAllButton] 播放失败:`, audioUrls[i], error);
      }
    }

    console.log('[PlayAllButton] 全部播放完成');
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // 播放单个音频
  const playSingleAudio = (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      audio.oncanplay = () => {
        console.log('[PlayAllButton] 音频加载成功:', audioUrl);
      };

      audio.onended = () => {
        console.log('[PlayAllButton] 音频播放结束:', audioUrl);
        resolve();
      };

      audio.onerror = (e) => {
        console.error('[PlayAllButton] 音频加载失败:', audioUrl, e);
        reject(e);
      };

      audio.play().catch(error => {
        console.error('[PlayAllButton] 播放失败:', audioUrl, error);
        reject(error);
      });
    });
  };

  // 停止播放
  const stopPlaying = () => {
    console.log('[PlayAllButton] 停止播放');
    setIsPlaying(false);
    setCurrentIndex(0);
    // 停止所有音频
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  return (
    <motion.button
      type="button"
      aria-label={isPlaying ? '停止播放' : '播放全部'}
      aria-pressed={isPlaying}
      id="play-all-btn"
      onClick={isPlaying ? stopPlaying : playAll}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0 min-w-[100px] shadow-sm"
    >
      {isPlaying ? <StopIcon /> : <PlayIcon />}
      <span className="flex-shrink-0">
        {isPlaying
          ? `${currentIndex + 1}/${getAllAudioUrls().length}`
          : '播放全部'
        }
      </span>
    </motion.button>
  );
};

export default PlayAllButton;
