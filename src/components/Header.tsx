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
  ChevronDown,
  Loader2,
  TrendingUp,
  ArrowUpLeft
} from 'lucide-react';
import { Logo } from './Logo';
import { OpenInNewTabButton } from './OpenInNewTabButton';
import { useAuth } from '../firebase/context';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import {
  getRecentSearches,
  saveRecentSearch,
  deleteRecentSearch,
  clearRecentSearches
} from '../firebase/firestoreService';
import { fetchSearchSuggestions } from '../services/youtubeApi';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const TRENDING_SEARCH_SUGGESTIONS = [
  '4k nature relaxing',
  'wildlife documentary 4k',
  'deep ocean creatures',
  'veritasium science',
  'lofi hip hop radio',
  'aurora borealis 4k',
  'kurzgesagt science'
];

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, profile, loading: authLoading, isSigningIn, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { route, openSearch, navigate } = useNavigation();

  const [query, setQuery] = useState(route.searchQuery || '');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Debounced search autocomplete suggestions
  useEffect(() => {
    const trimmed = query.trim();
    setSelectedIndex(-1);

    if (!trimmed) {
      setLiveSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchSearchSuggestions(trimmed);
        setLiveSuggestions(results);
      } catch (e) {
        setLiveSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
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

  const handleDeleteSearchItem = async (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = await deleteRecentSearch(user?.uid || '', item);
    setRecentSearches(updated);
  };

  const handleClearAllSearches = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await clearRecentSearches(user?.uid || '');
    setRecentSearches([]);
  };

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    openSearch(text);
  };

  const handleInsertSuggestion = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    setQuery(text);
    searchInputRef.current?.focus();
  };

  // Keyboard navigation for search suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const activeList = query.trim()
      ? liveSuggestions
      : recentSearches.length > 0
      ? recentSearches
      : TRENDING_SEARCH_SUGGESTIONS;

    if (!activeList.length || !showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < activeList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeList.length - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < activeList.length) {
        e.preventDefault();
        handleSelectSuggestion(activeList[selectedIndex]);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Hamburger & Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>

          <div onClick={() => navigate('/')}>
            <Logo size="md" />
          </div>
        </div>

        {/* Center: Search Bar with Autocomplete Suggestions (Desktop) */}
        <div className="hidden sm:flex flex-1 max-w-xl mx-4 relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center relative">
            <div className="relative flex-1 flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search videos, topics, or channels..."
                aria-label="Search"
                className="w-full h-10 pl-4 pr-10 rounded-l-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700/80 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {loadingSuggestions && (
                <div className="absolute right-9 text-neutral-400">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Submit search"
              className="h-10 px-5 rounded-r-full bg-neutral-100 dark:bg-neutral-800 border border-l-0 border-neutral-300 dark:border-neutral-700/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute top-11 left-0 w-[calc(100%-54px)] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
              {/* Scenario 1: Typing Query -> Show Live YouTube Autocomplete Suggestions */}
              {query.trim().length > 0 ? (
                <div>
                  {liveSuggestions.length > 0 ? (
                    liveSuggestions.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`w-full px-3.5 py-2 text-left text-sm flex items-center justify-between gap-2.5 transition-colors group cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Search size={15} className="text-neutral-400 shrink-0" />
                            <span className="truncate">{item}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleInsertSuggestion(e, item)}
                            title="Insert into search"
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <ArrowUpLeft size={15} />
                          </button>
                        </div>
                      );
                    })
                  ) : !loadingSuggestions ? (
                    <div className="px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                      <Search size={14} />
                      <span>Press enter to search for "{query}"</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Scenario 2: Empty Query -> Show Recent Searches & Trending Suggestions */
                <div>
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-3.5 py-1 text-2xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                        <span>Recent Searches</span>
                        <button
                          type="button"
                          onClick={handleClearAllSearches}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline normal-case font-medium text-xs cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      {recentSearches.map((item, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectSuggestion(item)}
                            className={`w-full px-3.5 py-2 text-left text-sm flex items-center justify-between gap-2.5 transition-colors group cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Clock size={15} className="text-neutral-400 shrink-0" />
                              <span className="truncate">{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSearchItem(e, item)}
                              title="Remove from search history"
                              className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Trending Suggestions */}
                  <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="px-3.5 py-1 text-2xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1">
                      <TrendingUp size={12} className="text-indigo-500" />
                      <span>Trending Topics</span>
                    </div>
                    {TRENDING_SEARCH_SUGGESTIONS.map((topic, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(topic)}
                        className="w-full px-3.5 py-1.5 text-left text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <Search size={14} className="text-neutral-400 group-hover:text-indigo-500" />
                        <span className="truncate">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            className="sm:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <Search size={20} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
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
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2">
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
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User size={16} />
                      Your profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/library');
                      }}
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Bookmark size={16} />
                      Your library
                    </button>
                    <button
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      Appearance: {theme === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut();
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sign In Button with Google Logo */
            <button
              onClick={() => signInWithGoogle()}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 transition-colors shadow-2xs cursor-pointer"
            >
              {isSigningIn ? (
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              )}
              <span>{isSigningIn ? 'Signing in...' : 'Sign in'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Expanding Search Bar with Suggestions */}
      {mobileSearchOpen && (
        <div ref={mobileSearchContainerRef} className="sm:hidden px-3 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-top-1">
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
                  className="absolute right-2 top-2 text-neutral-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-1.5 text-neutral-500 dark:text-neutral-400 cursor-pointer"
            >
              Cancel
            </button>
          </form>

          {/* Mobile Suggestions List */}
          {(liveSuggestions.length > 0 || (query.trim() === '' && recentSearches.length > 0)) && (
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 max-h-60 overflow-y-auto">
              {query.trim().length > 0 ? (
                liveSuggestions.slice(0, 7).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="py-2 px-2 text-sm text-neutral-800 dark:text-neutral-200 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/50"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Search size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                    <ArrowUpLeft size={14} className="text-neutral-400 shrink-0" />
                  </div>
                ))
              ) : (
                recentSearches.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="py-2 px-2 text-sm text-neutral-700 dark:text-neutral-300 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/50"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Clock size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSearchItem(e, item)}
                      className="p-1 text-neutral-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
