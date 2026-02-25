import { useState } from 'react';
import { Clock, BookOpen, ChevronRight, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { mockScenes, sceneCategories, difficultyConfig } from '../data/mock-data';
import { BottomNav } from '../components/BottomNav';
import { motion } from 'motion/react';

const categoryLabels: Record<string, string> = {
  daily_greeting: '日常问候',
  shopping: '购物消费',
  dining: '餐饮服务',
  travel: '旅行出行',
};

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

export default function Scenes() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredScenes = mockScenes.filter((scene) => {
    const matchesCategory = selectedCategory === 'all' || scene.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      scene.name.includes(searchQuery) ||
      scene.description.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-gray-800 mb-1">场景学习</h1>
          <p className="text-sm text-gray-400">在真实场景中练习英语口语</p>
        </div>

        {/* Search */}
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
          <Search className="h-4 w-4 text-gray-400 shrink-0 mr-2" />
          <input
            placeholder="搜索场景..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-400"
          />
        </div>

        {/* Category Filter */}
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

        {/* Scene Count */}
        <div className="mb-3">
          <span className="text-sm text-gray-400">{filteredScenes.length} 个场景</span>
        </div>

        {/* Scene List */}
        {filteredScenes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="text-3xl mb-3">🎭</div>
            <p className="text-gray-400 text-sm">暂无相关场景</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScenes.map((scene, i) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Link to={`/scenes/${scene.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform">
                    {/* Gradient header strip */}
                    <div
                      className={`bg-gradient-to-r ${categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]'} h-1.5`}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]'} flex items-center justify-center shrink-0`}
                          >
                            <span className="text-lg">{categoryEmojis[scene.category] || '📚'}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{scene.name}</div>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 max-w-[200px]">
                              {scene.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs bg-[#EEF2FF] text-[#4F7CF0] px-2.5 py-1 rounded-full">
                          {categoryLabels[scene.category]}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${difficultyConfig[scene.difficulty].color}`}
                        >
                          {difficultyConfig[scene.difficulty].label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scene.duration}分钟
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {scene.dialogue.rounds.length}轮对话
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Categories Overview */}
        {selectedCategory === 'all' && searchQuery === '' && (
          <div className="mt-6 mb-2">
            <div className="font-semibold text-gray-800 mb-3">场景分类</div>
            <div className="grid grid-cols-2 gap-3">
              {sceneCategories.filter(c => c.id !== 'all').map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`bg-gradient-to-br ${categoryGradients[category.id] || 'from-[#4F7CF0] to-[#7B5FE8]'} rounded-2xl p-4 text-white text-left shadow-sm`}
                >
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <div className="text-sm font-semibold">{category.name}</div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {mockScenes.filter(s => s.category === category.id).length} 个场景
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}