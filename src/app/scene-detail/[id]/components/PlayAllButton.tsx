'use client';

import React, { useState } from 'react';
import { buildAudioUrl } from '@/lib/audioUrl';

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

const PlayAllButton: React.FC<PlayAllButtonProps> = ({ rounds }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 收集所有音频URL
  const getAllAudioUrls = () => {
    const urls: string[] = [];
    rounds.forEach(round => {
      round.content.forEach(dialogue => {
        if (dialogue.audio_url) {
          urls.push(buildAudioUrl(dialogue.audio_url));
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
    <button
      id="play-all-btn"
      onClick={isPlaying ? stopPlaying : playAll}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-dark transition-colors whitespace-nowrap flex-shrink-0 min-w-[100px]"
    >
      <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'} flex-shrink-0`}></i>
      <span className="flex-shrink-0">
        {isPlaying 
          ? `${currentIndex + 1}/${getAllAudioUrls().length}` 
          : '播放全部'
        }
      </span>
    </button>
  );
};

export default PlayAllButton;
