import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Volume2, Play, BookOpen, Lightbulb, Clock, ChevronRight } from 'lucide-react';
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

export default function SceneDetail() {
  const { id } = useParams();
  const scene = mockScenes.find((s) => s.id === id);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'vocabulary'>('dialogue');
  const [playingRound, setPlayingRound] = useState<number | null>(null);
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

  const playDialogue = (text: string, roundNumber?: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (roundNumber !== undefined) setPlayingRound(roundNumber);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onend = () => setPlayingRound(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playFullDialogue = () => {
    const allText = scene.dialogue.rounds
      .flatMap((r) => r.content.map((c) => c.text))
      .join('. ');
    playDialogue(allText);
  };

  const gradient = categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]';
  const emoji = categoryEmojis[scene.category] || '📚';

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-28">
      <div className="max-w-[430px] mx-auto">

        {/* Hero Header */}
        <div className={`bg-gradient-to-br ${gradient} pt-12 pb-8 px-4 relative`}>
          <Link to="/scenes" className="absolute top-5 left-4">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-white" />
            </div>
          </Link>

          <div className="flex items-center gap-4 mt-2">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-3xl">{emoji}</span>
            </div>
            <div>
              <h1 className="text-white">{scene.name}</h1>
              <p className="text-white/70 text-sm mt-0.5">{scene.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full">
              {categoryConfig[scene.category].label}
            </span>
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full">
              {difficultyConfig[scene.difficulty].label}
            </span>
            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" /> {scene.duration}分钟
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold text-[#4F7CF0]">{scene.dialogue.rounds.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">对话轮次</div>
            </div>
            <div className="border-x border-gray-100">
              <div className="text-lg font-semibold text-[#4F7CF0]">{scene.vocabulary.length}</div>
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
                  : 'text-gray-500'
              }`}
            >
              {tab === 'dialogue' ? '对话内容' : '高频单词'}
            </button>
          ))}
        </div>

        {/* Dialogue Tab */}
        {activeTab === 'dialogue' && (
          <div className="px-4 mt-4 space-y-3">
            <div className="flex justify-end">
              <button
                onClick={playFullDialogue}
                className="flex items-center gap-1.5 text-sm text-[#4F7CF0] bg-[#EEF2FF] px-4 py-2 rounded-2xl"
              >
                <Play className="h-4 w-4" />
                播放全部对话
              </button>
            </div>

            {scene.dialogue.rounds.map((round) => (
              <motion.div
                key={round.round_number}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: round.round_number * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Round {round.round_number}
                  </span>
                  <button
                    onClick={() =>
                      playDialogue(
                        round.content.map((c) => c.text).join('. '),
                        round.round_number
                      )
                    }
                    className="h-7 w-7 rounded-full bg-[#EEF2FF] flex items-center justify-center"
                  >
                    <Volume2
                      className={`h-3.5 w-3.5 ${
                        playingRound === round.round_number
                          ? 'text-[#4F7CF0] animate-pulse'
                          : 'text-[#4F7CF0]'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {round.content.map((dialogue, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1 ${
                        idx % 2 === 0 ? 'items-start' : 'items-end'
                      }`}
                    >
                      <span className="text-xs text-gray-400 px-1">{dialogue.speaker}</span>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          idx % 2 === 0
                            ? 'bg-gray-50 rounded-tl-none'
                            : 'bg-[#4F7CF0] text-white rounded-tr-none'
                        }`}
                      >
                        <div className="text-sm font-medium">{dialogue.text}</div>
                        <div
                          className={`text-xs mt-1 ${
                            idx % 2 === 0 ? 'text-gray-400' : 'text-white/70'
                          }`}
                        >
                          {dialogue.translation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Analysis */}
                {round.analysis && (
                  <div className="px-4 pb-4">
                    <button
                      className="w-full flex items-center justify-between bg-[#FFF8EE] rounded-xl px-3 py-2.5"
                      onClick={() =>
                        setExpandedAnalysis(
                          expandedAnalysis === round.round_number ? null : round.round_number
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                        <span className="text-sm font-medium text-[#92400E]">查看问答解析</span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-[#F59E0B] transition-transform ${
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
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex gap-2">
                              <span className="font-medium text-gray-700 shrink-0">问：</span>
                              <span className="text-gray-600">{round.analysis.question}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-gray-700 shrink-0">答：</span>
                              <span className="text-gray-600">{round.analysis.answer}</span>
                            </div>
                            {round.analysis.alternatives && (
                              <div>
                                <span className="font-medium text-gray-700">其他回答：</span>
                                <ul className="mt-1 space-y-1">
                                  {round.analysis.alternatives.map((alt, i) => (
                                    <li key={i} className="text-gray-500 flex items-start gap-1">
                                      <span className="text-[#4F7CF0] shrink-0">•</span>
                                      {alt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {round.analysis.explanation && (
                              <div className="bg-[#FFF8EE] rounded-xl p-3 text-xs text-[#92400E]">
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
          </div>
        )}

        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div className="px-4 mt-4 space-y-3">
            {scene.vocabulary.map((vocab, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start gap-3">
                  <button
                    className="h-9 w-9 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0"
                    onClick={() => playDialogue(vocab.word)}
                  >
                    <Volume2 className="h-4 w-4 text-[#4F7CF0]" />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-gray-800">{vocab.word}</span>
                      <span className="text-xs text-gray-400">{vocab.phonetic}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{vocab.meaning}</div>
                    <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">例句：</span>
                      {vocab.example}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-[430px] mx-auto">
          <Link to={`/test/${scene.id}`}>
            <button
              className={`w-full h-12 bg-gradient-to-r ${gradient} text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-sm`}
            >
              <BookOpen className="h-5 w-5" />
              开始场景测试
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
