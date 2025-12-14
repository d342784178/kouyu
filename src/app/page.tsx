import Link from 'next/link'

export default function Home() {
  return (
    <div id="main-content" className="pb-20">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm">
        <div id="header-content" className="flex items-center justify-between">
          {/* 搜索框 */}
          <div id="search-container" className="flex-1 mr-4">
            <div className="relative">
              <input 
                type="text" 
                id="search-input"
                placeholder="搜索短语..." 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>
          
          {/* 个人中心入口 */}
          <button id="profile-btn" className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <img 
              src="https://s.coze.cn/image/7mUzSxkYdY0/" 
              alt="用户头像" 
              className="w-full h-full rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* 学习进度概览 */}
      <section id="learning-overview" className="mx-6 mt-6">
        <div id="progress-card" className="bg-white rounded-card shadow-card p-6">
          <div id="progress-header" className="flex items-center justify-between mb-6">
            <h2 id="progress-title" className="text-lg font-semibold text-text-primary">今日学习</h2>
            <button id="view-all-btn" className="text-primary text-sm font-medium">查看全部</button>
          </div>
          
          <div id="progress-content" className="flex items-center justify-between">
            {/* 进度环 */}
            <div id="progress-ring-container" className="relative">
              <svg className="w-20 h-20 progress-ring" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="42"
                  cy="42"
                  r="40"
                  stroke="#2563eb"
                  strokeWidth="4"
                  fill="transparent"
                  className="progress-ring-circle"
                  strokeLinecap="round"
                />
              </svg>
              <div id="progress-text" className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-text-primary">60%</span>
                <span className="text-xs text-text-secondary">完成度</span>
              </div>
            </div>
            
            {/* 学习数据 */}
            <div id="learning-stats" className="flex-1 ml-6 space-y-3">
              <div id="stat-learned" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">已学短语</span>
                <span className="text-sm font-semibold text-text-primary">12/20</span>
              </div>
              <div id="stat-time" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">学习时长</span>
                <span className="text-sm font-semibold text-text-primary">25分钟</span>
              </div>
              <div id="stat-streak" className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">连续天数</span>
                <span className="text-sm font-semibold text-tertiary">7天</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 复习提醒 */}
      <section id="review-reminder" className="mx-6 mt-4">
        <div id="reminder-card" className="bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-100 rounded-card p-5">
          <div id="reminder-content" className="flex items-center justify-between">
            <div id="reminder-info" className="flex items-center">
              <div id="reminder-icon" className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-clock text-white text-sm"></i>
              </div>
              <div>
                <h3 id="reminder-title" className="text-sm font-semibold text-text-primary">复习提醒</h3>
                <p id="reminder-text" className="text-xs text-text-secondary">有5个短语需要复习</p>
              </div>
            </div>
            <button id="review-btn" className="text-orange-500 text-sm font-medium">去复习</button>
          </div>
        </div>
      </section>

      {/* 推荐短语 */}
      <section id="recommended-phrases" className="mx-6 mt-6">
        <div id="recommended-header" className="flex items-center justify-between mb-4">
          <h2 id="recommended-title" className="text-lg font-semibold text-text-primary">推荐学习</h2>
          <Link href="/phrase-library" id="more-phrases-btn" className="text-primary text-sm font-medium">更多</Link>
        </div>
        
        <div id="phrases-list" className="space-y-3">
          {/* 推荐短语卡片1 */}
          <Link href="/phrase-detail?phraseId=phrase1" id="phrase-card-1" className="bg-white rounded-card shadow-card p-4 card-hover block">
            <div id="phrase-content-1" className="flex items-center justify-between">
              <div id="phrase-info-1" className="flex-1">
                <h3 id="phrase-text-1" className="text-base font-semibold text-text-primary mb-1">Could you please...</h3>
                <p id="phrase-meaning-1" className="text-sm text-text-secondary mb-2">请问你可以...吗？</p>
                <div id="phrase-tags-1" className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">日常用语</span>
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">入门</span>
                </div>
              </div>
              <button id="phrase-audio-1" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center ml-4">
                <i className="fas fa-play text-gray-600 text-sm"></i>
              </button>
            </div>
          </Link>

          {/* 推荐短语卡片2 */}
          <Link href="/phrase-detail?phraseId=phrase2" id="phrase-card-2" className="bg-white rounded-card shadow-card p-4 card-hover block">
            <div id="phrase-content-2" className="flex items-center justify-between">
              <div id="phrase-info-2" className="flex-1">
                <h3 id="phrase-text-2" className="text-base font-semibold text-text-primary mb-1">I'm looking for...</h3>
                <p id="phrase-meaning-2" className="text-sm text-text-secondary mb-2">我在找...</p>
                <div id="phrase-tags-2" className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full">购物</span>
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">入门</span>
                </div>
              </div>
              <button id="phrase-audio-2" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center ml-4">
                <i className="fas fa-play text-gray-600 text-sm"></i>
              </button>
            </div>
          </Link>
        </div>
      </section>

      {/* 场景分类 */}
      <section id="scene-categories" className="mx-6 mt-6 mb-6">
        <h2 id="categories-title" className="text-lg font-semibold text-text-primary mb-4">学习场景</h2>
        
        <div id="categories-grid" className="grid grid-cols-2 gap-4">
          {/* 日常问候 */}
          <Link href="/phrase-library?sceneId=scene_daily" id="scene-daily" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-daily-content" className="text-center">
              <div id="scene-daily-icon" className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-hand-paper text-white"></i>
              </div>
              <h3 id="scene-daily-title" className="text-sm font-semibold text-text-primary mb-1">日常问候</h3>
              <p id="scene-daily-count" className="text-xs text-text-secondary">156个短语</p>
            </div>
          </Link>

          {/* 购物消费 */}
          <Link href="/phrase-library?sceneId=scene_shopping" id="scene-shopping" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-shopping-content" className="text-center">
              <div id="scene-shopping-icon" className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-shopping-bag text-white"></i>
              </div>
              <h3 id="scene-shopping-title" className="text-sm font-semibold text-text-primary mb-1">购物消费</h3>
              <p id="scene-shopping-count" className="text-xs text-text-secondary">98个短语</p>
            </div>
          </Link>

          {/* 餐饮服务 */}
          <Link href="/phrase-library?sceneId=scene_restaurant" id="scene-restaurant" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-restaurant-content" className="text-center">
              <div id="scene-restaurant-icon" className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-utensils text-white"></i>
              </div>
              <h3 id="scene-restaurant-title" className="text-sm font-semibold text-text-primary mb-1">餐饮服务</h3>
              <p id="scene-restaurant-count" className="text-xs text-text-secondary">74个短语</p>
            </div>
          </Link>

          {/* 旅行出行 */}
          <Link href="/phrase-library?sceneId=scene_travel" id="scene-travel" className="scene-card rounded-card p-4 card-hover block">
            <div id="scene-travel-content" className="text-center">
              <div id="scene-travel-icon" className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-plane text-white"></i>
              </div>
              <h3 id="scene-travel-title" className="text-sm font-semibold text-text-primary mb-1">旅行出行</h3>
              <p id="scene-travel-count" className="text-xs text-text-secondary">122个短语</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}