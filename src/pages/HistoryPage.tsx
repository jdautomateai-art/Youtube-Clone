import React, { useEffect, useState } from 'react';
import { History, Search, Trash2, X, Clock } from 'lucide-react';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import {
  subscribeToWatchHistory,
  clearWatchHistory,
  deleteHistoryItem,
  getRecentSearches,
  deleteRecentSearch,
  clearRecentSearches
} from '../firebase/firestoreService';
import { WatchHistoryItem } from '../types';
import { formatTimeAgo } from '../services/youtubeApi';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { openVideo, openSearch } = useNavigation();

  const [activeTab, setActiveTab] = useState<'watch' | 'search'>('watch');
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Subscribe to watch history
  useEffect(() => {
    const unsub = subscribeToWatchHistory(user?.uid || '', setHistory);
    return () => unsub();
  }, [user]);

  // Load search history
  useEffect(() => {
    async function loadSearches() {
      const list = await getRecentSearches(user?.uid || '');
      setSearches(list);
    }
    loadSearches();
  }, [user, activeTab]);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      if (activeTab === 'watch') {
        await clearWatchHistory(user?.uid || '');
        setHistory([]);
      } else {
        await clearRecentSearches(user?.uid || '');
        setSearches([]);
      }
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteWatchItem = async (videoId: string) => {
    try {
      await deleteHistoryItem(user?.uid || '', videoId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSearchItem = async (queryText: string) => {
    try {
      const updated = await deleteRecentSearch(user?.uid || '', queryText);
      setSearches(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <History size={24} className="text-indigo-500" />
            <span>History</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {activeTab === 'watch'
              ? `${history.length} watched videos`
              : `${searches.length} search queries`}
          </p>
        </div>

        {/* Clear Action */}
        {((activeTab === 'watch' && history.length > 0) || (activeTab === 'search' && searches.length > 0)) && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Clear all?</span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {clearing ? 'Clearing...' : 'Yes, clear'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Clear {activeTab === 'watch' ? 'watch history' : 'search history'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => {
            setActiveTab('watch');
            setConfirmClear(false);
          }}
          className={`py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'watch'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <History size={16} />
          <span>Watch History ({history.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('search');
            setConfirmClear(false);
          }}
          className={`py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'search'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Search size={16} />
          <span>Search History ({searches.length})</span>
        </button>
      </div>

      {/* Tab 1: Watch History */}
      {activeTab === 'watch' && (
        <div>
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.videoId}
                  onClick={() => openVideo(item.videoId)}
                  className="group flex gap-4 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer relative"
                >
                  <div className="aspect-video w-36 sm:w-44 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 truncate">{item.channelTitle}</p>
                    <p className="text-3xs text-neutral-400 mt-1">Watched {formatTimeAgo(item.watchedAt)}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWatchItem(item.videoId);
                    }}
                    title="Remove from history"
                    className="absolute right-3 top-3 p-1 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 text-xs">
              Your watch history is clear.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Search History */}
      {activeTab === 'search' && (
        <div>
          {searches.length > 0 ? (
            <div className="space-y-2">
              {searches.map((queryText, idx) => (
                <div
                  key={idx}
                  onClick={() => openSearch(queryText)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <Clock size={16} />
                    </div>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {queryText}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSearchItem(queryText);
                    }}
                    title="Delete search"
                    className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 text-xs">
              Your search history is clear.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
