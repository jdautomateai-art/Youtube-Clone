import React from 'react';
import { Home, Flame, Tv, Bookmark } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const MobileBottomNav: React.FC = () => {
  const { route, navigate } = useNavigation();

  // If currently in watch page fullscreen or shorts, keep it sleek
  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Shorts', icon: Flame, path: '/shorts' },
    { label: 'Subscriptions', icon: Tv, path: '/subscriptions' },
    { label: 'Library', icon: Bookmark, path: '/library' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return route.path === '/';
    return route.path.startsWith(path);
  };

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[44px] transition-colors ${
              active
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
            <span className="text-3xs mt-1 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
