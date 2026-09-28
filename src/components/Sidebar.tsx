import React from 'react';
import {
  Home,
  Flame,
  Tv,
  Bookmark,
  ThumbsUp,
  History,
  Compass,
  X
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { Logo } from './Logo';

interface SidebarProps {
  isExpanded: boolean;
  mobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isExpanded,
  mobileDrawerOpen,
  onCloseMobileDrawer
}) => {
  const { route, navigate } = useNavigation();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Shorts', icon: Flame, path: '/shorts' },
    { label: 'Subscriptions', icon: Tv, path: '/subscriptions' },
    { label: 'Trending', icon: Compass, path: '/trending' },
    { label: 'Library', icon: Bookmark, path: '/library' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Liked Videos', icon: ThumbsUp, path: '/liked' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    onCloseMobileDrawer();
  };

  const isActive = (path: string) => {
    if (path === '/') return route.path === '/';
    return route.path.startsWith(path);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileDrawerOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation overlay"
          onClick={onCloseMobileDrawer}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onCloseMobileDrawer();
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 transition-transform duration-300 md:hidden flex flex-col ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-2">
          <div onClick={() => { navigate('/'); onCloseMobileDrawer(); }}>
            <Logo size="sm" />
          </div>
          <button
            onClick={onCloseMobileDrawer}
            aria-label="Close sidebar"
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon size={20} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 text-2xs text-neutral-400 space-y-1">
          <p>© 2026 StreamHub</p>
          <p>Powered by YouTube Embedded Players</p>
        </div>
      </aside>

      {/* Desktop Sidebar (Expanded or Collapsed) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-200 overflow-y-auto overflow-x-hidden ${
          isExpanded ? 'w-60 px-3 py-3' : 'w-18 px-2 py-3'
        }`}
      >
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${
                  isExpanded
                    ? 'gap-4 px-3 py-2.5 text-sm font-medium'
                    : 'flex-col justify-center py-2.5 px-1 text-2xs font-medium gap-1'
                } ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon
                  size={20}
                  className={`shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                />
                <span className={isExpanded ? 'truncate' : 'text-center truncate w-full'}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {isExpanded && (
          <div className="mt-auto pt-6 px-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 dark:text-neutral-500 space-y-2">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="#about" onClick={(e) => { e.preventDefault(); alert('StreamHub is an independent video discovery platform streaming via YouTube official embedded players.'); }} className="hover:underline">About</a>
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="hover:underline">YouTube Terms</a>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="hover:underline">Privacy Policy</a>
            </div>
            <p className="text-2xs">© 2026 StreamHub</p>
          </div>
        )}
      </aside>
    </>
  );
};
