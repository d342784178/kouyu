'use client';

import React, { useState } from 'react';
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

const VocabularyContent: React.FC<VocabularyContentProps> = ({ vocabulary }) => {
  // 音频播放状态
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  // 音频加载错误状态
  const [audioError, setAudioError] = useState<string | null>(null);

  // 播放音频的函数
  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      console.warn('[VocabularyContent] 音频URL为空');
      setAudioError('暂不支持音频播放');
      setTimeout(() => setAudioError(null), 3000);
      return;
    }

    try {
      // 构建完整的音频URL
      const fullAudioUrl = buildAudioUrl(audioUrl);
      console.log('[VocabularyContent] 尝试播放音频:', {
        originalUrl: audioUrl,
        fullUrl: fullAudioUrl
      });

      // 停止当前正在播放的音频
      if (playingAudio) {
        console.log('[VocabularyContent] 停止当前播放的音频:', playingAudio);
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
          console.error('[VocabularyContent] 音频加载失败:', {
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
          console.log('[VocabularyContent] 音频加载成功，可以播放:', fullAudioUrl);
        };

        await audio.play();
        console.log('[VocabularyContent] 音频开始播放:', fullAudioUrl);

        // 音频播放结束后重置状态
        audio.onended = () => {
          console.log('[VocabularyContent] 音频播放结束:', fullAudioUrl);
          setPlayingAudio(null);
        };
      } catch (playError: any) {
        console.error('[VocabularyContent] 音频播放失败:', {
          url: fullAudioUrl,
          error: playError.message,
          name: playError.name
        });
        setAudioError('暂不支持音频播放');
        setPlayingAudio(null);
        setTimeout(() => setAudioError(null), 3000);
      }
    } catch (error: any) {
      console.error('[VocabularyContent] 播放音频时发生错误:', {
        error: error.message,
        stack: error.stack
      });
      setAudioError('暂不支持音频播放');
      setPlayingAudio(null);
      setTimeout(() => setAudioError(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* 音频错误提示 */}
      {audioError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-50">
          {audioError}
        </div>
      )}

      {vocabulary.map((vocab, index) => (
        <div key={vocab.vocab_id || `vocab-${index}`} id={`word-${index + 1}`} className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-1">{vocab.content} <span className="text-xs text-text-secondary">({vocab.type === 'word' ? '单词' : '短语'})</span></h3>
            <p className="text-sm text-text-secondary mb-1">{vocab.phonetic} {vocab.translation}</p>
            <p className="text-xs text-text-secondary">原句: {vocab.example_sentence}</p>
            <p className="text-xs text-text-secondary">翻译: {vocab.example_translation}</p>
          </div>
          <button
            id={`play-word-${index + 1}`}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            onClick={() => playAudio(vocab.audio_url)}
            title={vocab.audio_url || '暂无音频'}
          >
            <i className={`fas ${playingAudio && playingAudio.includes(vocab.audio_url) ? 'fa-stop' : 'fa-play'} text-gray-600 text-xs`}></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default VocabularyContent;
