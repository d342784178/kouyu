import { useState } from 'react';
import { Search, ChevronRight, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { mockUserProgress, mockScenes, difficultyConfig } from '../data/mock-data';
import { BottomNav } from '../components/BottomNav';
import { CircularProgress } from '../components/CircularProgress';
import { motion } from 'motion/react';

const difficultyLabels: Record<string, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

const categoryLabels: Record<string, string> = {
  daily_greeting: 'daily',
  shopping: 'shopping',
  dining: 'dining',
  travel: 'travel',
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const progress = mockUserProgress;
  const recommendedScenes = mockScenes.slice(0, 3);

  const progressPercentage = Math.round((progress.todayLearned / 20) * 100);

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto px-4 pt-6">

        {/* Search Bar + Avatar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <Search className="h-4 w-4 text-gray-400 shrink-0 mr-2" />
            <input
              placeholder="搜索短语..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-400"
            />
          </div>
          <Link to="/profile">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-sm font-semibold">我</span>
            </div>
          </Link>
        </div>

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
                <span className="text-sm text-gray-500">已学短语</span>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayLearned}/20
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">学习时长</span>
                <span className="text-sm font-medium text-gray-800">
                  {progress.todayMinutes}分钟
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">连续天数</span>
                <span className="text-sm font-semibold text-[#FF7043]">
                  {progress.consecutiveDays}天
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review Reminder */}
        {progress.reviewCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-[#FFF4F0] rounded-2xl p-4 mb-5 border border-[#FFE4D9]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#FF7043] flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">复习提醒</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    有{progress.reviewCount}个短语需要复习
                  </div>
                </div>
              </div>
              <Link to="/phrases">
                <button className="text-sm font-medium text-[#FF7043] bg-white rounded-xl px-3 py-1.5 shadow-sm border border-[#FFE4D9]">
                  去复习
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '🎯', label: '每日任务', color: 'bg-[#EEF2FF]', textColor: 'text-[#4F7CF0]' },
            { icon: '🔥', label: '热门场景', color: 'bg-[#FFF4F0]', textColor: 'text-[#FF7043]' },
            { icon: '📊', label: '学习报告', color: 'bg-[#F0FFF4]', textColor: 'text-[#34D399]' },
          ].map((item) => (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.95 }}
              className={`${item.color} rounded-2xl p-3 flex flex-col items-center gap-1.5`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
            </motion.button>
          ))}
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
              >
                <Link to={`/scenes/${scene.id}`}>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform">
                    <div className="font-semibold text-gray-800 mb-1">{scene.name}</div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{scene.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#EEF2FF] text-[#4F7CF0] px-2.5 py-1 rounded-full">
                        {categoryLabels[scene.category]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                        {difficultyLabels[scene.difficulty]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
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
              <div className="text-sm opacity-90 italic">
                "The best time to plant a tree was 20 years ago. The second best time is now."
              </div>
              <div className="text-xs opacity-70 mt-1">种树最好的时机是20年前，其次是现在。</div>
            </div>
          </div>
        </motion.div>

      </div>

      <BottomNav />
    </div>
  );
}
