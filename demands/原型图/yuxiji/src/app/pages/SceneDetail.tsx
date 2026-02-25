import { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  BookOpen,
  Lightbulb,
  Clock,
  ChevronRight,
  Mic,
} from 'lucide-react';
import { mockScenes, difficultyConfig, categoryConfig } from '../data/mock-data';
import { motion, AnimatePresence } from 'motion/react';

const categoryGradients: Record<string, string> = {
  daily_greeting: 'from-[#4F7CF0] to-[#7B5FE8]',
  shopping: 'from-[#FF7043] to-[#FF9A76]',
  dining: 'from-[#F59E0B] to-[#FBBF24]',
  travel: 'from-[#34D399] to-[#6EE7B7]',
};

const categoryEmojis: Record<string, string> = {
  daily_greeting: '👋',
  shopping: '🛒',
  dining: '🍽️',
  travel: '✈️',
};

const speakerColors: Record<string, { bubble: string; text: string; name: string }> = {
  default_left: {
    bubble: 'bg-gray-50',
    text: 'text-gray-700',
    name: 'text-gray-400',
  },
  default_right: {
    bubble: 'bg-[#4F7CF0]',
    text: 'text-white',
    name: 'text-[#4F7CF0]',
  },
};

export default function SceneDetail() {
  const { id } = useParams();
  const scene = mockScenes.find((s) => s.id === id);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'vocabulary'>('dialogue');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null);

  if (!scene) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm w-full max-w-[430px]">
          <div className="text-4xl mb-4">🎭</div>
          <p className="text-gray-500 mb-4">场景未找到</p>
          <Link to="/scenes">
            <button className="bg-[#4F7CF0] text-white rounded-2xl px-6 py-3 text-sm font-medium">
              返回场景列表
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const speak = (text: string, key: string, rate = 0.85) => {
    if ('speechSynthesis' in window) {
      if (playingKey === key) {
        window.speechSynthesis.cancel();
        setPlayingKey(null);
        return;
      }
      window.speechSynthesis.cancel();
      setPlayingKey(key);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.onend = () => setPlayingKey(null);
      utterance.onerror = () => setPlayingKey(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playFullDialogue = () => {
    const allText = scene.dialogue.rounds
      .flatMap((r) => r.content.map((c) => c.text))
      .join('. ');
    speak(allText, 'full');
  };

  const gradient = categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]';
  const emoji = categoryEmojis[scene.category] || '📚';

  // Track unique speakers to assign left/right
  const speakersInScene = Array.from(
    new Set(scene.dialogue.rounds.flatMap((r) => r.content.map((c) => c.speaker)))
  );

  const getSpeakerSide = (speaker: string) => {
    const idx = speakersInScene.indexOf(speaker);
    return idx % 2 === 0 ? 'left' : 'right';
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-28">
      <div className="max-w-[430px] mx-auto">

        {/* Hero Header */}
        <div className={`bg-gradient-to-br ${gradient} pt-12 pb-8 px-4 relative`}>
          <Link to="/scenes" className="absolute top-5 left-4">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4 text-white" />
            </div>
          </Link>

          <div className="flex items-center gap-4 mt-2">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-3xl">{emoji}</span>
            </div>
            <div>
              <h1 className="text-white">{scene.name}</h1>
              <p className="text-white/70 text-sm mt-0.5 leading-relaxed">{scene.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">
              {categoryConfig[scene.category]?.label || scene.category}
            </span>
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">
              {difficultyConfig[scene.difficulty].label}
            </span>
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
              <Clock className="h-3 w-3" /> {scene.duration}分钟
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold text-[#4F7CF0]">
                {scene.dialogue.rounds.length}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">对话轮次</div>
            </div>
            <div className="border-x border-gray-100">
              <div className="text-lg font-semibold text-[#4F7CF0]">
                {scene.vocabulary.length}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">高频单词</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-[#4F7CF0]">{scene.duration}</div>
              <div className="text-xs text-gray-400 mt-0.5">学习分钟</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-4 mt-4 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
          {(['dialogue', 'vocabulary'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#4F7CF0] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'dialogue' ? '📝 对话内容' : '📚 高频单词'}
            </button>
          ))}
        </div>

        {/* ——— Dialogue Tab ——— */}
        {activeTab === 'dialogue' && (
          <div className="px-4 mt-4 space-y-4">
            {/* Play All Button */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {scene.dialogue.rounds.length} 轮对话
              </span>
              <button
                onClick={playFullDialogue}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-2xl transition-all ${
                  playingKey === 'full'
                    ? 'bg-[#4F7CF0] text-white'
                    : 'text-[#4F7CF0] bg-[#EEF2FF]'
                }`}
              >
                {playingKey === 'full' ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {playingKey === 'full' ? '停止播放' : '播放全部'}
              </button>
            </div>

            {scene.dialogue.rounds.map((round) => (
              <motion.div
                key={round.round_number}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: round.round_number * 0.08 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Round Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[10px] font-semibold text-[#4F7CF0]">
                      {round.round_number}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      第 {round.round_number} 轮
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      speak(
                        round.content.map((c) => c.text).join('. '),
                        `round-${round.round_number}`
                      )
                    }
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                      playingKey === `round-${round.round_number}`
                        ? 'bg-[#4F7CF0]'
                        : 'bg-[#EEF2FF]'
                    }`}
                  >
                    {playingKey === `round-${round.round_number}` ? (
                      <Pause className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 text-[#4F7CF0]" />
                    )}
                  </button>
                </div>

                {/* Dialogue Bubbles */}
                <div className="p-4 space-y-4">
                  {round.content.map((dialogue, idx) => {
                    const side = getSpeakerSide(dialogue.speaker);
                    const isRight = side === 'right';
                    const lineKey = `line-${round.round_number}-${idx}`;
                    const isPlayingLine = playingKey === lineKey;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-1 ${isRight ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`flex items-center gap-1.5 ${
                            isRight ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                              isRight
                                ? 'bg-[#4F7CF0] text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {dialogue.speaker.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-400">{dialogue.speaker}</span>
                        </div>

                        <div
                          className={`flex items-end gap-2 max-w-[85%] ${
                            isRight ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-3 flex-1 ${
                              isRight
                                ? 'bg-[#4F7CF0] rounded-tr-none'
                                : 'bg-gray-50 rounded-tl-none'
                            }`}
                          >
                            <div
                              className={`text-sm font-medium leading-relaxed ${
                                isRight ? 'text-white' : 'text-gray-800'
                              }`}
                            >
                              {dialogue.text}
                            </div>
                            <div
                              className={`text-xs mt-1.5 ${
                                isRight ? 'text-white/70' : 'text-gray-400'
                              }`}
                            >
                              {dialogue.translation}
                            </div>
                          </div>

                          {/* Per-line play button */}
                          <button
                            onClick={() => speak(dialogue.text, lineKey)}
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isPlayingLine
                                ? 'bg-[#4F7CF0] shadow-md'
                                : 'bg-white border border-gray-200 shadow-sm'
                            }`}
                          >
                            {isPlayingLine ? (
                              <Pause className="h-3.5 w-3.5 text-white" />
                            ) : (
                              <Volume2
                                className={`h-3.5 w-3.5 ${
                                  isRight ? 'text-[#4F7CF0]' : 'text-gray-500'
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Analysis */}
                {round.analysis && (
                  <div className="px-4 pb-4">
                    <button
                      className="w-full flex items-center justify-between bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2.5 transition-all"
                      onClick={() =>
                        setExpandedAnalysis(
                          expandedAnalysis === round.round_number ? null : round.round_number
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-[#D97706]" />
                        <span className="text-sm font-medium text-[#92400E]">
                          查看问答解析
                        </span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-[#D97706] transition-transform duration-200 ${
                          expandedAnalysis === round.round_number ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedAnalysis === round.round_number && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-2.5 text-sm">
                            <div className="flex gap-2 bg-white rounded-xl p-3 border border-gray-100">
                              <span className="font-semibold text-[#4F7CF0] shrink-0">Q:</span>
                              <span className="text-gray-700">{round.analysis.question}</span>
                            </div>
                            <div className="flex gap-2 bg-white rounded-xl p-3 border border-gray-100">
                              <span className="font-semibold text-[#22C55E] shrink-0">A:</span>
                              <span className="text-gray-700">{round.analysis.answer}</span>
                            </div>

                            {round.analysis.alternatives && round.analysis.alternatives.length > 0 && (
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="font-medium text-gray-600 mb-2 text-xs">
                                  💬 其他表达方式
                                </p>
                                <ul className="space-y-1.5">
                                  {round.analysis.alternatives.map((alt, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-[#4F7CF0] shrink-0 text-xs mt-0.5">•</span>
                                      <span className="text-gray-600 text-xs">{alt}</span>
                                      <button
                                        onClick={() => speak(alt, `alt-${round.round_number}-${i}`)}
                                        className="ml-auto shrink-0"
                                      >
                                        <Volume2 className="h-3.5 w-3.5 text-gray-400" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {round.analysis.explanation && (
                              <div className="bg-[#FFFBEB] rounded-xl px-3 py-2.5 text-xs text-[#92400E] leading-relaxed">
                                💡 {round.analysis.explanation}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Practice Tip */}
            <div className="bg-gradient-to-r from-[#4F7CF0]/10 to-[#7B5FE8]/10 rounded-2xl p-4 flex items-start gap-3">
              <Mic className="h-5 w-5 text-[#4F7CF0] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-0.5">跟读练习建议</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  点击每句话旁边的 🔊 按钮听发音，然后跟读练习。反复听说能有效提升口语流利度。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ——— Vocabulary Tab ——— */}
        {activeTab === 'vocabulary' && (
          <div className="px-4 mt-4 space-y-3">
            <p className="text-xs text-gray-400">
              本场景共 {scene.vocabulary.length} 个高频词汇
            </p>
            {scene.vocabulary.map((vocab, idx) => {
              const vocabKey = `vocab-${idx}`;
              const isPlaying = playingKey === vocabKey;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-start gap-3">
                    <button
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isPlaying ? 'bg-[#4F7CF0] shadow-md shadow-blue-200' : 'bg-[#EEF2FF]'
                      }`}
                      onClick={() => speak(vocab.word, vocabKey, 0.75)}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-[#4F7CF0]" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-gray-800">{vocab.word}</span>
                        <span className="text-xs text-gray-400">{vocab.phonetic}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{vocab.meaning}</div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500">例句：</span>
                          <span className="text-xs text-gray-600 italic ml-1">
                            {vocab.example}
                          </span>
                        </div>
                        <button
                          onClick={() => speak(vocab.example, `ex-${idx}`, 0.8)}
                          className="shrink-0"
                        >
                          <Volume2
                            className={`h-3.5 w-3.5 ${
                              playingKey === `ex-${idx}` ? 'text-[#4F7CF0]' : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-[430px] mx-auto">
          <Link to={`/test/${scene.id}`}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className={`w-full h-12 bg-gradient-to-r ${gradient} text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-sm`}
            >
              <BookOpen className="h-5 w-5" />
              开始场景测试
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}
