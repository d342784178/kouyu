'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { getAudioUrl } from '@/lib/audioUrl'

interface AudioState {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  progress: number
  currentTime: number
  duration: number
  playCount: number
}

interface UseAudioReturn {
  // 播放状态
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  progress: number
  currentTime: number
  duration: number
  playCount: number
  
  // 方法
  play: (blobPath: string, loop?: boolean) => Promise<void>
  pause: () => void
  toggle: (blobPath: string, loop?: boolean) => Promise<void>
  audioRef: React.RefObject<HTMLAudioElement>
  clearError: () => void
}

export function useAudio(): UseAudioReturn {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    progress: 0,
    currentTime: 0,
    duration: 0,
    playCount: 0,
  })

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentBlobPathRef = useRef<string | null>(null)
  const loopRef = useRef<boolean>(false)

  const play = useCallback(async (blobPath: string, loop: boolean = false) => {
    if (!audioRef.current) return

    // 清除之前的错误
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    loopRef.current = loop

    try {
      const audioUrl = getAudioUrl(blobPath)

      if (!audioUrl) {
        setState(prev => ({ ...prev, isLoading: false, error: '无法获取音频文件' }))
        return
      }

      // 如果路径变了，需要重新设置 src
      if (currentBlobPathRef.current !== blobPath || !audioRef.current.src) {
        audioRef.current.src = audioUrl
        audioRef.current.loop = loop
        currentBlobPathRef.current = blobPath
      }

      await audioRef.current.play()
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
        duration: audioRef.current?.duration || 0
      }))
    } catch (error) {
      console.error('Error playing audio:', error)
      // 播放失败时清除当前路径，避免影响其他音频
      currentBlobPathRef.current = null
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

  const toggle = useCallback(async (blobPath: string, loop: boolean = false) => {
    if (state.isPlaying) {
      pause()
    } else {
      await play(blobPath, loop)
    }
  }, [state.isPlaying, play, pause])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      if (!audio.loop) {
        setState(prev => ({ ...prev, isPlaying: false, progress: 0, currentTime: 0 }))
      } else {
        setState(prev => ({ ...prev, progress: 0, currentTime: 0 }))
      }
    }

    const handleError = (event: Event) => {
      const audioElement = event.target as HTMLAudioElement
      let errorMessage = '音频加载失败'
      
      // 尝试从网络错误中获取更详细的信息
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_NOT_FOUND:
            errorMessage = '音频不存在'
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = '音频解码失败'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = '网络错误'
            break
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = '音频加载被中断'
            break
        }
      }
      
      // 清除当前路径，避免影响其他音频
      currentBlobPathRef.current = null
      
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false, 
        error: errorMessage 
      }))
    }

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime,
          progress: (audio.currentTime / audio.duration) * 100
        }))
      }
    }

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }))
    }

    const handlePlay = () => {
      setState(prev => ({ ...prev, playCount: prev.playCount + 1 }))
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
    }
  }, [])

  return {
    ...state,
    play,
    pause,
    toggle,
    audioRef,
    clearError,
  }
}
