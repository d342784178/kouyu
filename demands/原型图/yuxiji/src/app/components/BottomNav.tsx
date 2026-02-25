import { Link, useLocation } from 'react-router';
import { Home, BookOpen, User } from 'lucide-react';

const navItems = [
  {
    path: '/',
    label: '首页',
    icon: Home,
  },
  {
    path: '/phrases',
    label: '短语库',
    icon: BookOpen,
  },
  {
    path: '/scenes',
    label: '场景学习',
    // Custom film/scene icon
    icon: null,
  },
  {
    path: '/profile',
    label: '我的',
    icon: User,
  },
];

function SceneIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'text-[#4F7CF0]' : 'text-gray-400'}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                active ? 'text-[#4F7CF0]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`h-6 w-6 ${active ? 'text-[#4F7CF0]' : 'text-gray-400'}`}
                />
              ) : (
                <SceneIcon active={active} />
              )}
              <span
                className={`text-xs ${active ? 'font-medium text-[#4F7CF0]' : ''}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
