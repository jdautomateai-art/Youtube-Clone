import React, { useEffect, useState } from 'react';
import { History, Trash2, X } from 'lucide-react';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import { subscribeToWatchHistory, clearWatchHistory, deleteHistoryItem } from '../firebase/firestoreService';
import { WatchHistoryItem } from '../types';
import { formatTimeAgo } from '../services/youtubeApi';

export const HistoryPage: React.FC = () => {
  const { user, triggerSignInPrompt } = useAuth();
  const { openVideo } = useNavigation();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToWatchHistory(user.uid, setHistory);
    return () => unsub();
  }, [user]);

  const handleClearAll = async () => {
    if (!user) return;
    if (confirm('Clear your entire watch history?')) {
      setClearing(true);
      try {
        await clearWatchHistory(user.uid);
      } finally {
        setClearing(false);
      }
    }
  };

  const handleDeleteOne = async (videoId: string) => {
    if (!user) return;
    try {
      await deleteHistoryItem(user.uid, videoId);
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <History size={36} className="text-indigo-500 mb-3" />
        <h2 className="text-lg font-bold mb-2">Sign in to view watch history</h2>
        <button
          onClick={() => triggerSignInPrompt('Sign in to view watch history.')}
          className="px-5 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <History size={22} className="text-indigo-500" />
            <span>Watch History</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">{history.length} watched videos</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span>Clear history</span>
          </button>
        )}
      </div>

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
                  handleDeleteOne(item.videoId);
                }}
                title="Remove from history"
                className="absolute right-3 top-3 p-1 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
  );
};
