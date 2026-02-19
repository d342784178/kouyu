import { useState } from 'react';
import { Search, Volume2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { mockPhrases, sceneCategories, difficultyConfig, categoryConfig } from '../data/mock-data';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'motion/react';

export default function Phrases() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredPhrases = mockPhrases.filter((phrase) => {
    const matchesCategory = selectedCategory === 'all' || phrase.scene === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      phrase.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phrase.chinese.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const playAudio = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-gray-800 mb-1">短语库</h1>
          <p className="text-sm text-gray-400">共 {filteredPhrases.length} 个短语</p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
          <Search className="h-4 w-4 text-gray-400 shrink-0 mr-2" />
          <input
            placeholder="搜索短语..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-400"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {sceneCategories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm transition-all ${
                  isActive
                    ? 'bg-[#4F7CF0] text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Phrase List */}
        <div className="space-y-3">
          {filteredPhrases.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-gray-400 text-sm">未找到相关短语</p>
            </div>
          ) : (
            filteredPhrases.map((phrase, i) => {
              const isExpanded = expandedId === phrase.id;
              return (
                <motion.div
                  key={phrase.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <div
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : phrase.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <button
                          className="h-9 w-9 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0 hover:bg-[#D8E4FF] transition-colors mt-0.5"
                          onClick={(e) => playAudio(phrase.english, e)}
                        >
                          <Volume2 className="h-4 w-4 text-[#4F7CF0]" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 mb-0.5">
                            {phrase.english}
                          </div>
                          {phrase.phonetic && (
                            <div className="text-xs text-gray-400 mb-1">{phrase.phonetic}</div>
                          )}
                          <div className="text-sm text-gray-600">{phrase.chinese}</div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 shrink-0 mt-1 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-3 ml-12">
                        <span className="text-xs bg-[#EEF2FF] text-[#4F7CF0] px-2.5 py-1 rounded-full">
                          {categoryConfig[phrase.scene].label}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${difficultyConfig[phrase.difficulty].color}`}
                        >
                          {difficultyConfig[phrase.difficulty].label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                          {phrase.partOfSpeech}
                        </span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && phrase.pronunciationTips && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 mx-4 mb-4 pt-3">
                            <div className="flex items-start gap-2 bg-[#FFF8EE] rounded-xl p-3">
                              <span className="text-sm shrink-0">💡</span>
                              <p className="text-xs text-[#C97706]">{phrase.pronunciationTips}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bottom Link to Scenes */}
        <div className="mt-6 mb-2">
          <Link to="/scenes">
            <div className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-2xl p-4 flex items-center justify-between text-white shadow-sm">
              <div>
                <div className="text-sm font-semibold">想要实战练习？</div>
                <div className="text-xs opacity-80 mt-0.5">前往场景学习模块</div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
