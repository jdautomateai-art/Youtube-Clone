import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  X,
  Sun,
  Moon,
  Clock,
  User,
  Bookmark,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { Logo } from './Logo';
import { OpenInNewTabButton } from './OpenInNewTabButton';
import { useAuth } from '../firebase/context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { getRecentSearches, saveRecentSearch } from '../firebase/firestoreService';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, profile, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { route, openSearch, navigate } = useNavigation();

  const [query, setQuery] = useState(route.searchQuery || '');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync search input with route query
  useEffect(() => {
    if (route.path.startsWith('/search')) {
      setQuery(route.searchQuery || '');
    }
  }, [route.searchQuery, route.path]);

  // Load recent searches
  useEffect(() => {
    async function loadSearches() {
      if (user) {
        const list = await getRecentSearches(user.uid);
        setRecentSearches(list);
      } else {
        try {
          const local = JSON.parse(localStorage.getItem('streamhub_recent_searches') || '[]');
          setRecentSearches(local);
        } catch (e) {
          setRecentSearches([]);
        }
      }
    }
    loadSearches();
  }, [user]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    setShowSuggestions(false);
    setMobileSearchOpen(false);

    // Save recent search
    if (user) {
      saveRecentSearch(user.uid, clean);
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('streamhub_recent_searches') || '[]');
        const updated = [clean, ...existing.filter((s: string) => s !== clean)].slice(0, 10);
        localStorage.setItem('streamhub_recent_searches', JSON.stringify(updated));
        setRecentSearches(updated);
      } catch (err) {}
    }

    openSearch(clean);
  };

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    openSearch(text);
  };

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Hamburger & Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <Menu size={20} />
          </button>

          <div onClick={() => navigate('/')}>
            <Logo size="md" />
          </div>
        </div>

        {/* Center: Search Bar (Desktop / Tablet) */}
        <div
          ref={searchContainerRef}
          className="relative hidden sm:flex items-center justify-center flex-1 max-w-xl mx-4"
        >
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full flex items-center"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search videos, creators, topics..."
                aria-label="Search"
                className="w-full h-10 pl-4 pr-10 rounded-l-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700/80 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Submit search"
              className="h-10 px-5 rounded-r-full bg-neutral-100 dark:bg-neutral-800 border border-l-0 border-neutral-300 dark:border-neutral-700/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && recentSearches.length > 0 && (
            <div className="absolute top-11 left-0 w-[calc(100%-54px)] bg-white dark:bg-neutral-850 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-750 py-2 z-50 overflow-hidden">
              <div className="px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                Recent Searches
              </div>
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition-colors"
                >
                  <Clock size={14} className="text-neutral-400 shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: OpenInNewTab, Mobile Search Toggle, Theme, Profile / Sign In */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Open In New Tab Button (appears ONLY if inside iframe) */}
          <OpenInNewTabButton />

          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            aria-label="Open search input"
            className="sm:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Search size={20} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={20} className="text-neutral-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Auth State */}
          {authLoading ? (
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          ) : user ? (
            /* User Avatar & Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="User account menu"
                aria-expanded={showDropdown}
                className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition-all cursor-pointer"
              >
                <img
                  src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  alt={profile?.displayName || 'User profile'}
                  className="w-8 h-8 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                />
                <ChevronDown size={14} className="text-neutral-400 hidden sm:block" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-neutral-850 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {profile?.displayName || user.displayName || 'StreamHub User'}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/profile');
                      }}
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5"
                    >
                      <User size={16} />
                      Your profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/library');
                      }}
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5"
                    >
                      <Bookmark size={16} />
                      Your library
                    </button>
                    <button
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      Theme: {theme === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut();
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 font-medium"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sign in with Google Button */
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="hidden xs:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Expanding Search Bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-3 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-top-1">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search StreamHub..."
                className="w-full h-9 pl-3 pr-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-2 text-neutral-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-1.5 text-neutral-500 dark:text-neutral-400"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
