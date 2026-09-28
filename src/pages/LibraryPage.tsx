import React, { useEffect, useState } from 'react';
import { Bookmark, History, ThumbsUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import {
  subscribeToWatchHistory,
  subscribeToUserLikes,
  subscribeToUserSaved
} from '../firebase/firestoreService';
import { LikedVideoItem, SavedVideoItem, WatchHistoryItem } from '../types';

export const LibraryPage: React.FC = () => {
  const { user, triggerSignInPrompt } = useAuth();
  const { navigate, openVideo } = useNavigation();

  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [likes, setLikes] = useState<LikedVideoItem[]>([]);
  const [saved, setSaved] = useState<SavedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubHistory = subscribeToWatchHistory(user.uid, (list) => setHistory(list));
    const unsubLikes = subscribeToUserLikes(user.uid, (list) => setLikes(list));
    const unsubSaved = subscribeToUserSaved(user.uid, (list) => {
      setSaved(list);
      setLoading(false);
    });

    return () => {
      unsubHistory();
      unsubLikes();
      unsubSaved();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Bookmark size={32} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Enjoy your favorite videos
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Sign in to access videos that you’ve liked, saved for later, or watched across all devices.
        </p>
        <button
          onClick={() => triggerSignInPrompt('Sign in to access your library.')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Bookmark size={24} className="text-indigo-500" />
          <span>Your Library</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Synchronized in real-time with Google Cloud Firestore
        </p>
      </div>

      {/* History Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-500" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              History
            </h2>
            <span className="text-xs text-neutral-400">({history.length})</span>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.videoId}
                onClick={() => openVideo(item.videoId)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-500 transition-colors">
                  {item.title}
                </p>
                <p className="text-3xs text-neutral-400 truncate mt-0.5">{item.channelTitle}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-4">No watch history yet.</p>
        )}
      </section>

      {/* Saved Videos (Watch Later) Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-indigo-500" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Saved Videos (Watch Later)
            </h2>
            <span className="text-xs text-neutral-400">({saved.length})</span>
          </div>
        </div>

        {saved.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {saved.slice(0, 6).map((item) => (
              <div
                key={item.videoId}
                onClick={() => openVideo(item.videoId)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-500 transition-colors">
                  {item.title}
                </p>
                <p className="text-3xs text-neutral-400 truncate mt-0.5">{item.channelTitle}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-4">No saved videos yet.</p>
        )}
      </section>

      {/* Liked Videos Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ThumbsUp size={18} className="text-indigo-500" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Liked Videos
            </h2>
            <span className="text-xs text-neutral-400">({likes.length})</span>
          </div>
          <button
            onClick={() => navigate('/liked')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {likes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {likes.slice(0, 6).map((item) => (
              <div
                key={item.videoId}
                onClick={() => openVideo(item.videoId)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-500 transition-colors">
                  {item.title}
                </p>
                <p className="text-3xs text-neutral-400 truncate mt-0.5">{item.channelTitle}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-4">No liked videos yet.</p>
        )}
      </section>
    </div>
  );
};
