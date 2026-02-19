import { Link } from 'react-router';
import { Trophy, BookOpen, Clock, Flame, Settings, Bell, ChevronRight, Star } from 'lucide-react';
import { mockUserProgress } from '../data/mock-data';
import { BottomNav } from '../components/BottomNav';
import { CircularProgress } from '../components/CircularProgress';
import { motion } from 'motion/react';

const achievements = [
  {
    icon: '🎯',
    label: '初学者',
    desc: '学习10个短语',
    unlocked: true,
    color: 'bg-[#FFF8EE]',
  },
  {
    icon: '🔥',
    label: '坚持者',
    desc: '连续学习7天',
    unlocked: true,
    color: 'bg-[#FFF0EB]',
  },
  {
    icon: '📚',
    label: '词汇达人',
    desc: '学习50个短语',
    unlocked: true,
    color: 'bg-[#EEF2FF]',
  },
  {
    icon: '🌟',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
  {
    icon: '🏆',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
  {
    icon: '💎',
    label: '???',
    desc: '未解锁',
    unlocked: false,
    color: 'bg-gray-50',
  },
];

const menuItems = [
  { icon: Bell, label: '学习提醒设置', color: 'text-[#4F7CF0]', bg: 'bg-[#EEF2FF]' },
  { icon: BookOpen, label: '学习记录', color: 'text-[#34D399]', bg: 'bg-[#F0FFF4]' },
  { icon: Star, label: '收藏的短语', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
  { icon: Settings, label: '应用设置', color: 'text-gray-500', bg: 'bg-gray-100' },
];

export default function Profile() {
  const progress = mockUserProgress;
  const todayPct = Math.round((progress.todayLearned / 20) * 100);
  const timePct = Math.round((progress.todayMinutes / 60) * 100);

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-20">
      <div className="max-w-[430px] mx-auto">

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] px-4 pt-12 pb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <span className="text-2xl">👤</span>
            </div>
            <div className="text-white">
              <h2 className="text-white">英语学习者</h2>
              <p className="text-white/70 text-sm mt-0.5">每天进步一点点 💪</p>
              <div className="flex items-center gap-1 mt-1">
                <Flame className="h-4 w-4 text-yellow-300" />
                <span className="text-xs text-white/90">
                  连续学习 {progress.consecutiveDays} 天
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-[#4F7CF0]">{progress.totalLearned}</div>
                <div className="text-xs text-gray-400 mt-0.5">累计短语</div>
              </div>
              <div className="border-x border-gray-100">
                <div className="text-2xl font-semibold text-[#FF7043]">{progress.consecutiveDays}</div>
                <div className="text-xs text-gray-400 mt-0.5">连续天数</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[#34D399]">{progress.todayMinutes}</div>
                <div className="text-xs text-gray-400 mt-0.5">今日分钟</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Progress */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="font-semibold text-gray-800 mb-4">今日进度</div>
            <div className="flex items-center gap-5">
              <CircularProgress
                value={todayPct}
                size={80}
                strokeWidth={8}
                label={`${todayPct}%`}
                sublabel="完成"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <BookOpen className="h-3.5 w-3.5 text-[#4F7CF0]" />
                      今日学习
                    </div>
                    <span className="text-sm font-medium">{progress.todayLearned}/20</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4F7CF0] rounded-full"
                      style={{ width: `${todayPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-[#34D399]" />
                      学习时长
                    </div>
                    <span className="text-sm font-medium">{progress.todayMinutes}分钟</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#34D399] rounded-full"
                      style={{ width: `${timePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Achievements */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">成就徽章</span>
              <span className="text-xs text-gray-400">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} 已解锁
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((ach, i) => (
                <div
                  key={i}
                  className={`${ach.color} rounded-2xl p-3 text-center ${
                    !ach.unlocked ? 'opacity-40' : ''
                  }`}
                >
                  <div className="text-2xl mb-1">{ach.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{ach.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{ach.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Menu Items */}
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {menuItems.map(({ icon: Icon, label, color, bg }, i) => (
              <button
                key={label}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  i < menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="flex-1 text-left text-sm text-gray-700">{label}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
          </motion.div>
        </div>

        {/* Weekly Streak */}
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-r from-[#FF7043] to-[#FF9A76] rounded-2xl p-4 flex items-center gap-3 text-white">
            <Flame className="h-8 w-8 text-yellow-200 shrink-0" />
            <div>
              <div className="font-semibold">连续学习 {progress.consecutiveDays} 天！</div>
              <div className="text-sm text-white/80 mt-0.5">保持下去，你已超越 85% 的学习者！</div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 mt-3">
          <button className="w-full h-12 text-sm text-gray-400 rounded-2xl border border-gray-100 bg-white">
            退出登录
          </button>
        </div>

        <div className="h-4" />
      </div>
      <BottomNav />
    </div>
  );
}
