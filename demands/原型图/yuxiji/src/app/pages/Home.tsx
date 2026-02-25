import { useState } from 'react';
import { Search, ChevronRight, Clock, Zap, BookOpen, Target, BarChart2 } from 'lucide-react';
import { Link } from 'react-router';
import { mockUserProgress, mockScenes, difficultyConfig, categoryConfig, sceneCategories } from '../data/mock-data';
import { BottomNav } from '../components/BottomNav';
import { CircularProgress } from '../components/CircularProgress';
import { motion } from 'motion/react';

const categoryGradients: Record<string, string> = {
  daily_greeting: 'from-[#4F7CF0] to-[#7B5FE8]',
  shopping: 'from-[#FF7043] to-[#FF9A76]',
  dining: 'from-[#F59E0B] to-[#FBBF24]',
  travel: 'from-[#34D399] to-[#6EE7B7]',
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const progress = mockUserProgress;
  const recommendedScenes = mockScenes.slice(0, 3);
  const progressPercentage = Math.round((progress.todayLearned / 20) * 100);

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        {/* Top Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-0.5">欢迎回来 👋</p>
            <h2 className="text-gray-800">语习集</h2>
          </div>
          <Link to="/profile">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-sm font-semibold">我</span>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <Link to="/phrases">
          <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 mb-5">
            <Search className="h-4 w-4 text-gray-400 shrink-0 mr-2" />
            <span className="text-sm text-gray-400">搜索短语或场景...</span>
          </div>
        </Link>

        {/* Today's Learning Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-800">今日学习</span>
            <Link to="/profile" className="text-sm text-[#4F7CF0] flex items-center gap-0.5">
              查看全部
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <CircularProgress
              value={progressPercentage}
              size={88}
              strokeWidth={9}
              label={`${progressPercentage}%`}
              sublabel="完成度"
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <BookOpen className="h-3.5 w-3.5 text-[#4F7CF0]" />
                  已学短语
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayLearned}/20
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="h-3.5 w-3.5 text-[#34D399]" />
                  学习时长
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayMinutes}分钟
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">🔥 连续天数</span>
                <span className="text-sm font-semibold text-[#FF7043]">
                  {progress.consecutiveDays}天
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>今日进度</span>
              <span>{progress.todayLearned}/20 短语</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Review Reminder */}
        {progress.reviewCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-[#FFF4F0] rounded-2xl p-4 mb-4 border border-[#FFE4D9]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF7043] flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">复习提醒</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    有 {progress.reviewCount} 个短语待复习
                  </div>
                </div>
              </div>
              <Link to="/phrases">
                <button className="text-xs font-semibold text-[#FF7043] bg-white rounded-xl px-3 py-1.5 shadow-sm border border-[#FFE4D9]">
                  去复习
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              icon: Target,
              emoji: null,
              label: '每日任务',
              color: 'bg-[#EEF2FF]',
              textColor: 'text-[#4F7CF0]',
              to: '/scenes',
            },
            {
              icon: null,
              emoji: '🔥',
              label: '热门场景',
              color: 'bg-[#FFF4F0]',
              textColor: 'text-[#FF7043]',
              to: '/scenes',
            },
            {
              icon: BarChart2,
              emoji: null,
              label: '学习报告',
              color: 'bg-[#F0FFF4]',
              textColor: 'text-[#34D399]',
              to: '/profile',
            },
          ].map((item) => (
            <Link key={item.label} to={item.to}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`${item.color} rounded-2xl p-3.5 flex flex-col items-center gap-2`}
              >
                {item.emoji ? (
                  <span className="text-2xl">{item.emoji}</span>
                ) : item.icon ? (
                  <item.icon className={`h-6 w-6 ${item.textColor}`} />
                ) : null}
                <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Scene Categories */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800">场景分类</span>
            <Link to="/scenes" className="text-sm text-[#4F7CF0] flex items-center gap-0.5">
              全部
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {sceneCategories
              .filter((c) => c.id !== 'all')
              .slice(0, 4)
              .map((cat, i) => (
                <Link key={cat.id} to={`/scenes?category=${cat.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileTap={{ scale: 0.97 }}
                    className={`bg-gradient-to-br ${categoryGradients[cat.id] || 'from-[#4F7CF0] to-[#7B5FE8]'} rounded-2xl p-4 text-white`}
                  >
                    <div className="text-2xl mb-1.5">{cat.icon}</div>
                    <div className="text-sm font-semibold">{cat.name}</div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {mockScenes.filter((s) => s.category === cat.id).length} 个场景
                    </div>
                  </motion.div>
                </Link>
              ))}
          </div>
        </div>

        {/* Recommended Scenes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800">推荐场景</span>
            <Link to="/scenes" className="text-sm text-[#4F7CF0] flex items-center gap-0.5">
              更多
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recommendedScenes.map((scene, i) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i }}
              >
                <Link to={`/scenes/${scene.id}`}>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${categoryGradients[scene.category] || 'from-[#4F7CF0] to-[#7B5FE8]'} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-lg">
                          {scene.category === 'daily_greeting'
                            ? '👋'
                            : scene.category === 'shopping'
                            ? '🛒'
                            : scene.category === 'dining'
                            ? '🍽️'
                            : '✈️'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 mb-0.5">{scene.name}</div>
                        <p className="text-xs text-gray-500 line-clamp-1">{scene.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-[#EEF2FF] text-[#4F7CF0] px-2.5 py-1 rounded-full">
                        {categoryConfig[scene.category]?.label || scene.category}
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
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Daily Tip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-2xl p-4 mb-4 text-white"
        >
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-yellow-300" />
            <div>
              <div className="text-sm font-semibold mb-1">每日一句</div>
              <div className="text-sm opacity-90 italic leading-relaxed">
                "The best time to plant a tree was 20 years ago. The second best time is now."
              </div>
              <div className="text-xs opacity-70 mt-1">
                种树最好的时机是20年前，其次是现在。
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      <BottomNav />
    </div>
  );
}
