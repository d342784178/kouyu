'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface AudioState {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
}

interface UseAudioReturn extends AudioState {
  play: (blobPath: string) => Promise<void>
  pause: () => void
  toggle: (blobPath: string) => Promise<void>
  audioRef: React.RefObject<HTMLAudioElement>
}

export function useAudio(): UseAudioReturn {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    error: null,
  })
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentBlobPathRef = useRef<string | null>(null)

  const fetchAudioUrl = async (blobPath: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/audio?path=${encodeURIComponent(blobPath)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audio URL')
      }
      
      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error fetching audio URL:', error)
      return null
    }
  }

  const play = useCallback(async (blobPath: string) => {
    if (!audioRef.current) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 如果路径变了，需要重新获取 URL
      if (currentBlobPathRef.current !== blobPath || !audioRef.current.src) {
        const audioUrl = await fetchAudioUrl(blobPath)
        
        if (!audioUrl) {
          setState(prev => ({ ...prev, isLoading: false, error: '无法获取音频文件' }))
          return
        }
        
        audioRef.current.src = audioUrl
        currentBlobPathRef.current = blobPath
      }

      await audioRef.current.play()
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }))
    } catch (error) {
      console.error('Error playing audio:', error)
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false, 
        error: '音频播放失败' 
      }))
    }
  }, [])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const toggle = useCallback(async (blobPath: string) => {
    if (state.isPlaying) {
      pause()
    } else {
      await play(blobPath)
    }
  }, [state.isPlaying, play, pause])

  // 监听音频结束事件
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
    }

    const handleError = () => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false, 
        error: '音频加载失败' 
      }))
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  return {
    ...state,
    play,
    pause,
    toggle,
    audioRef,
  }
}
