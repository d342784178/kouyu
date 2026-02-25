import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm p-10 text-center w-full max-w-[430px]">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-gray-800 mb-2">页面未找到</h2>
        <p className="text-sm text-gray-400 mb-6">您访问的页面不存在或已被移动</p>
        <Link to="/">
          <button className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl px-8 py-3 font-medium text-sm">
            返回首页
          </button>
        </Link>
      </div>
    </div>
  );
}
