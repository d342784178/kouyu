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

interface UseAudioReturn extends AudioState {
  play: (blobPath: string, loop?: boolean) => Promise<void>
  pause: () => void
  toggle: (blobPath: string, loop?: boolean) => Promise<void>
  audioRef: React.RefObject<HTMLAudioElement>
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

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    loopRef.current = loop

    try {
      // 如果路径变了，需要重新获取 URL
      if (currentBlobPathRef.current !== blobPath || !audioRef.current.src) {
        // 使用 getAudioUrl 获取音频URL（支持代理模式）
        const audioUrl = getAudioUrl(blobPath)

        if (!audioUrl) {
          setState(prev => ({ ...prev, isLoading: false, error: '无法获取音频文件' }))
          return
        }

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

  // 监听音频事件
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      // 检查 audio.loop 属性来获取最新的循环状态
      if (!audio.loop) {
        setState(prev => ({ ...prev, isPlaying: false, progress: 0, currentTime: 0 }))
      } else {
        // 循环模式下，重置进度但保持播放状态
        setState(prev => ({ ...prev, progress: 0, currentTime: 0 }))
      }
    }

    const handleError = () => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false, 
        error: '音频加载失败' 
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
  }
}
