'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAudio } from '@/hooks/useAudio'
import type { DialogueRound, ShadowingResult } from '@/types'

// ============================================================
// 类型定义
// ============================================================

/** 展平后的单句练习数据 */
interface SentenceItem {
  text: string         // 英文文本
  translation: string  // 中文翻译
  audio_url: string    // 原声音频 URL
}

/** 每句的练习记录（null 表示已跳过） */
type SentenceRecord = ShadowingResult | null

/** 跟读练习的阶段状态机 */
type Phase =
  | 'idle'        // 初始/准备
  | 'playing'     // 播放原声
  | 'recording'   // 录音中
  | 'evaluating'  // 评测中
  | 'result'      // 展示结果
  | 'summary'     // 汇总报告

// ============================================================
// Props
// ============================================================

interface ShadowingModuleProps {
  rounds: DialogueRound[]  // 对话轮次数组
  onExit: () => void       // 退出跟读的回调
}

// ============================================================
// 工具函数
// ============================================================

/** 将 DialogueRound[] 展平为句子列表 */
function flattenSentences(rounds: DialogueRound[]): SentenceItem[] {
  const sentences: SentenceItem[] = []
  for (const round of rounds) {
    for (const item of round.content) {
      sentences.push({
        text: item.text,
        translation: item.translation,
        audio_url: item.audio_url,
      })
    }
  }
  return sentences
}

/** 根据分数返回颜色样式 */
function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
}

/** 根据分数返回背景色 */
function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

// ============================================================
// 图标组件
// ============================================================

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

// ============================================================
// 主组件
// ============================================================

export default function ShadowingModule({ rounds, onExit }: ShadowingModuleProps) {
  // 展平所有句子
  const sentences = flattenSentences(rounds)
  const total = sentences.length

  // 当前句子索引
  const [currentIndex, setCurrentIndex] = useState(0)
  // 当前阶段
  const [phase, setPhase] = useState<Phase>('idle')
  // 当前句子的评测结果
  const [currentResult, setCurrentResult] = useState<ShadowingResult | null>(null)
  // 评测错误信息
  const [evalError, setEvalError] = useState<string | null>(null)
  // 麦克风权限被拒绝
  const [micDenied, setMicDenied] = useState(false)
  // 所有句子的练习记录
  const [records, setRecords] = useState<SentenceRecord[]>(Array(total).fill(undefined))

  // 音频 hook
  const { play, isPlaying, audioRef } = useAudio()

  // MediaRecorder 相关 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // 当前句子
  const currentSentence = sentences[currentIndex]

  // ============================================================
  // 阶段：playing — 自动播放原声
  // ============================================================

  useEffect(() => {
    if (phase === 'playing' && currentSentence) {
      play(currentSentence.audio_url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex])

  // 音频播放完毕后自动进入录音阶段
  const prevIsPlayingRef = useRef(false)
  useEffect(() => {
    if (phase === 'playing' && prevIsPlayingRef.current && !isPlaying) {
      // 播放结束，切换到录音
      setPhase('recording')
    }
    prevIsPlayingRef.current = isPlaying
  }, [isPlaying, phase])

  // ============================================================
  // 阶段：recording — 麦克风录音
  // ============================================================

  const startRecording = useCallback(async () => {
    setMicDenied(false)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 使用默认格式录音（webm/ogg 均可，后续会用 AudioContext 解码为 PCM）
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.start()
      console.log('[跟读练习] 开始录音，格式:', recorder.mimeType)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        console.warn('[跟读练习] 麦克风权限被拒绝')
        setMicDenied(true)
      } else {
        console.error('[跟读练习] 获取麦克风失败:', err)
        setEvalError('无法访问麦克风，请检查设备设置')
      }
    }
  }, [])

  useEffect(() => {
    if (phase === 'recording') {
      startRecording()
    }
    // 离开录音阶段时停止流
    return () => {
      if (phase === 'recording' && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ============================================================
  // 停止录音并触发评测
  // ============================================================

  const stopAndEvaluate = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    recorder.onstop = async () => {
      // 停止麦克风流
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const mimeType = recorder.mimeType || 'audio/webm'
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
      console.log('[跟读练习] 录音完成，大小:', audioBlob.size, 'bytes')

      setPhase('evaluating')
      setEvalError(null)

      try {
        // 用 AudioContext 将录音解码为原始 PCM（16kHz 单声道 Int16）
        // 这样后端无需 ffmpeg，直接用 Azure SDK push stream 接收
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioCtx = new AudioContext({ sampleRate: 16000 })
        const decoded = await audioCtx.decodeAudioData(arrayBuffer)
        audioCtx.close()

        // 取第一声道，转为 Int16 PCM
        const float32 = decoded.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        const pcmBlob = new Blob([int16.buffer], { type: 'application/octet-stream' })

        const formData = new FormData()
        formData.append('audio', pcmBlob, 'recording.pcm')
        formData.append('text', currentSentence.text)
        formData.append('sampleRate', String(decoded.sampleRate))
        formData.append('channels', '1')

        const res = await fetch('/api/shadowing/evaluate', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          throw new Error(data.error || '评测服务异常')
        }

        setCurrentResult(data as ShadowingResult)
        setPhase('result')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '评测失败'
        console.error('[跟读练习] 评测错误:', msg)
        setEvalError(msg)
        setPhase('result')
      }
    }

    recorder.stop()
  }, [currentSentence])

  // ============================================================
  // 跳过评测（直接进入下一句）
  // ============================================================

  const skipEvaluation = useCallback(() => {
    // 记录为 null（已跳过）
    setRecords((prev) => {
      const next = [...prev]
      next[currentIndex] = null
      return next
    })
    goNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  // ============================================================
  // 下一句 / 完成
  // ============================================================

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= total) {
      // 所有句子完成，进入汇总
      setPhase('summary')
    } else {
      setCurrentIndex(nextIndex)
      setCurrentResult(null)
      setEvalError(null)
      setMicDenied(false)
      setPhase('playing')
    }
  }, [currentIndex, total])

  // 确认结果并进入下一句（同时保存记录）
  const confirmResult = useCallback(() => {
    setRecords((prev) => {
      const next = [...prev]
      next[currentIndex] = currentResult
      return next
    })
    goNext()
  }, [currentIndex, currentResult, goNext])

  // ============================================================
  // 重新跟读当前句子
  // ============================================================

  const retryCurrentSentence = useCallback(() => {
    setCurrentResult(null)
    setEvalError(null)
    setMicDenied(false)
    setPhase('playing')
  }, [])

  // ============================================================
  // 开始跟读（从 idle 进入 playing）
  // ============================================================

  const startShadowing = useCallback(() => {
    setPhase('playing')
  }, [])

  // ============================================================
  // 汇总数据计算
  // ============================================================

  const validRecords = records.filter((r): r is ShadowingResult => r !== null && r !== undefined)
  const avgScore =
    validRecords.length > 0
      ? Math.round(validRecords.reduce((sum, r) => sum + r.score, 0) / validRecords.length)
      : 0

  // ============================================================
  // 渲染
  // ============================================================

  // 进度条百分比
  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#4F7CF0]/10 flex items-center justify-center">
            <MicIcon />
          </div>
          <span className="text-base font-bold text-gray-900">跟读练习</span>
        </div>
        <button
          onClick={onExit}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
        >
          退出
        </button>
      </div>

      {/* 汇总报告 */}
      {phase === 'summary' ? (
        <SummaryView
          sentences={sentences}
          records={records}
          avgScore={avgScore}
          onExit={onExit}
        />
      ) : (
        <div className="p-5">
          {/* 进度指示 */}
          {phase !== 'idle' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>第 {currentIndex + 1} / {total} 句</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4F7CF0] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* idle 阶段：开始引导 */}
          {phase === 'idle' && (
            <IdleView total={total} onStart={startShadowing} />
          )}

          {/* playing / recording / evaluating / result 阶段 */}
          {phase !== 'idle' && currentSentence && (
            <>
              {/* 当前句子展示 */}
              <SentenceCard sentence={currentSentence} />

              {/* playing 阶段：播放中提示 + 重播按钮 */}
              {phase === 'playing' && (
                <PlayingView
                  isPlaying={isPlaying}
                  onReplay={() => play(currentSentence.audio_url)}
                />
              )}

              {/* recording 阶段：录音中 */}
              {phase === 'recording' && (
                <RecordingView
                  micDenied={micDenied}
                  onStop={stopAndEvaluate}
                  onSkip={skipEvaluation}
                />
              )}

              {/* evaluating 阶段：评测中 */}
              {phase === 'evaluating' && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-10 h-10 border-4 border-[#4F7CF0] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">正在评测发音...</p>
                </div>
              )}

              {/* result 阶段：展示结果 */}
              {phase === 'result' && (
                <ResultView
                  result={currentResult}
                  error={evalError}
                  onRetry={retryCurrentSentence}
                  onNext={confirmResult}
                  onSkip={skipEvaluation}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* 隐藏的 audio 元素，供 useAudio hook 使用 */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

// ============================================================
// 子视图组件
// ============================================================

/** idle 阶段：开始引导 */
function IdleView({ total, onStart }: { total: number; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center py-8 gap-4">
      <div className="w-16 h-16 rounded-full bg-[#4F7CF0]/10 flex items-center justify-center">
        <MicIcon />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-800 mb-1">准备好了吗？</p>
        <p className="text-sm text-gray-500">共 {total} 句，跟着原声逐句练习发音</p>
      </div>
      <button
        onClick={onStart}
        className="mt-2 px-8 py-3 bg-[#4F7CF0] text-white rounded-2xl text-sm font-semibold shadow-sm hover:bg-[#3d6be0] transition-colors active:scale-[0.98]"
      >
        开始跟读
      </button>
    </div>
  )
}

/** 当前句子卡片 */
function SentenceCard({ sentence }: { sentence: SentenceItem }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
      <p className="text-base font-semibold text-gray-900 leading-relaxed mb-1.5">
        {sentence.text}
      </p>
      <p className="text-sm text-gray-500">{sentence.translation}</p>
    </div>
  )
}

/** playing 阶段视图 */
function PlayingView({
  isPlaying,
  onReplay,
}: {
  isPlaying: boolean
  onReplay: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {isPlaying ? (
        <div className="flex items-center gap-2 text-[#4F7CF0]">
          {/* 音波动画 */}
          <div className="flex items-end gap-0.5 h-5">
            {[1, 2, 3, 4, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-[#4F7CF0] rounded-full animate-pulse"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <span className="text-sm font-medium">正在播放原声...</span>
        </div>
      ) : (
        <p className="text-sm text-gray-400">音频加载中...</p>
      )}
      <button
        onClick={onReplay}
        className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <PlayIcon />
        重播原声
      </button>
    </div>
  )
}

/** recording 阶段视图 */
function RecordingView({
  micDenied,
  onStop,
  onSkip,
}: {
  micDenied: boolean
  onStop: () => void
  onSkip: () => void
}) {
  if (micDenied) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-amber-700 mb-1">麦克风权限被拒绝</p>
        <p className="text-xs text-amber-600 mb-3">
          请在浏览器设置中允许访问麦克风，然后刷新页面重试。
        </p>
        <button
          onClick={onSkip}
          className="px-5 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
        >
          跳过评测
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* 录音动画 */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 animate-pulse">
          <MicIcon />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-50" />
      </div>
      <p className="text-sm font-medium text-gray-700">正在录音，请跟读...</p>
      <div className="flex gap-3">
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-red-500 text-white rounded-2xl text-sm font-semibold shadow-sm hover:bg-red-600 transition-colors active:scale-[0.98]"
        >
          <StopIcon />
          停止录音
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
        >
          跳过
        </button>
      </div>
    </div>
  )
}

/** result 阶段视图 */
function ResultView({
  result,
  error,
  onRetry,
  onNext,
  onSkip,
}: {
  result: ShadowingResult | null
  error: string | null
  onRetry: () => void
  onNext: () => void
  onSkip: () => void
}) {
  // 评测失败时展示错误提示
  if (error || !result) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-red-700 mb-1">评测失败</p>
        <p className="text-xs text-red-500 mb-3">{error || '未知错误'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors"
          >
            <RefreshIcon />
            重新跟读
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200 transition-colors"
          >
            跳过评测
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 分数卡片 */}
      <div className={`rounded-2xl border p-4 ${scoreBg(result.score)}`}>
        {/* 总分 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">综合得分</span>
          <span className={`text-3xl font-bold ${scoreColor(result.score)}`}>
            {result.score}
          </span>
        </div>
        {/* 子项分数 */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreItem label="发音准确度" score={result.accuracyScore} />
          <ScoreItem label="语调评分" score={result.intonationScore} />
        </div>
      </div>

      {/* 逐词反馈 */}
      {result.wordFeedback.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">逐词反馈</p>
          <div className="flex flex-wrap gap-1.5">
            {result.wordFeedback.map((w, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-lg text-sm font-medium ${
                  w.isCorrect
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 border border-gray-200 text-gray-600 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshIcon />
          重新跟读
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 bg-[#4F7CF0] text-white rounded-2xl text-sm font-semibold shadow-sm hover:bg-[#3d6be0] transition-colors active:scale-[0.98]"
        >
          下一句
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}

/** 分数子项 */
function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-white/70 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${scoreColor(score)}`}>{score}</p>
    </div>
  )
}

/** 汇总报告视图 */
function SummaryView({
  sentences,
  records,
  avgScore,
  onExit,
}: {
  sentences: SentenceItem[]
  records: SentenceRecord[]
  avgScore: number
  onExit: () => void
}) {
  return (
    <div className="p-5 space-y-5">
      {/* 平均分 */}
      <div className="flex flex-col items-center py-6 gap-2">
        <p className="text-sm text-gray-500">本次跟读平均分</p>
        <span className={`text-5xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</span>
        <p className="text-xs text-gray-400">
          {avgScore >= 80 ? '发音很棒！继续保持 🎉' : avgScore >= 60 ? '不错，继续练习 💪' : '多加练习，加油！🔥'}
        </p>
      </div>

      {/* 各句得分列表 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">各句得分</p>
        {sentences.map((s, i) => {
          const record = records[i]
          const isSkipped = record === null
          const hasResult = record !== null && record !== undefined

          return (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm text-gray-700 truncate">{s.text}</p>
              </div>
              {isSkipped ? (
                <span className="text-xs text-gray-400 shrink-0">已跳过</span>
              ) : hasResult ? (
                <span className={`text-base font-bold shrink-0 ${scoreColor((record as ShadowingResult).score)}`}>
                  {(record as ShadowingResult).score}
                </span>
              ) : (
                <span className="text-xs text-gray-300 shrink-0">—</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 退出按钮 */}
      <button
        onClick={onExit}
        className="w-full py-3.5 bg-[#4F7CF0] text-white rounded-2xl text-sm font-semibold shadow-sm hover:bg-[#3d6be0] transition-colors active:scale-[0.98]"
      >
        退出跟读
      </button>
    </div>
  )
}
