'use client'

import Link from 'next/link'
import { useAudio } from '@/hooks/useAudio'
import { LoadingSpinner } from '@/components/Loading'

interface Phrase {
  id: string
  english: string
  chinese: string
  partOfSpeech: string
  scene: string
  difficulty: string
  pronunciationTips: string
  audioUrl: string | null
  createdAt: string
  updatedAt: string
}

interface PhraseCardProps {
  phrase: Phrase
  index: number
}

export default function PhraseCard({ phrase, index }: PhraseCardProps) {
  const { isPlaying, isLoading, play, pause, audioRef } = useAudio()

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!phrase.audioUrl) {
      alert('当前短语暂无音频')
      return
    }

    if (isPlaying) {
      pause()
    } else {
      await play(phrase.audioUrl)
    }
  }

  return (
    <>
      <audio ref={audioRef} />
      <Link
        href={`/phrase-detail?phraseId=${phrase.id}`}
        id={`phrase-card-${index + 1}`}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover block"
      >
        <div id={`phrase-content-${index + 1}`} className="flex items-center justify-between">
          <div id={`phrase-info-${index + 1}`} className="flex-1">
            <h3 id={`phrase-text-${index + 1}`} className="text-base font-semibold text-gray-800 mb-1">
              {phrase.english}
            </h3>
            <p id={`phrase-meaning-${index + 1}`} className="text-sm text-gray-500 mb-2">
              {phrase.chinese}
            </p>
            <div id={`phrase-tags-${index + 1}`} className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full">
                {phrase.scene === 'daily' ? '日常用语' :
                  phrase.scene === 'business' ? '商务' :
                    phrase.scene === 'travel' ? '旅行' :
                      phrase.scene === 'shopping' ? '购物' :
                        phrase.scene === 'social' ? '社交' :
                          phrase.scene === 'restaurant' ? '餐饮' : phrase.scene}
              </span>
              <span className="px-2 py-1 bg-success-light text-success text-xs rounded-full">
                {phrase.difficulty === 'beginner' ? '入门' :
                  phrase.difficulty === 'intermediate' ? '中级' :
                    phrase.difficulty === 'advanced' ? '高级' : phrase.difficulty}
              </span>
            </div>
          </div>
          <button
            id={`phrase-audio-${index + 1}`}
            className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 transition-colors ${
              isLoading ? 'bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={handlePlayClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-gray-600 text-sm`}></i>
            )}
          </button>
        </div>
      </Link>
    </>
  )
}
