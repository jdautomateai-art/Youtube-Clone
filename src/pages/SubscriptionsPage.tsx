import React, { useEffect, useState } from 'react';
import { SubscriptionItem, VideoItem } from '../types';
import { useAuth } from '../firebase/context';
import { subscribeToUserSubscriptions, toggleSubscribeChannel } from '../firebase/firestoreService';
import { INITIAL_VIDEOS } from '../data/mockYouTubeData';
import { VideoCard } from '../components/VideoCard';
import { Tv, Check, Bell, LogIn } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const SubscriptionsPage: React.FC = () => {
  const { user, triggerSignInPrompt } = useAuth();
  const { openSearch } = useNavigation();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [feedVideos, setFeedVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToUserSubscriptions(user?.uid || '', (subs) => {
      setSubscriptions(subs);
      setLoading(false);

      // Filter videos from subscribed channels
      const channelIds = new Set(subs.map((s) => s.channelId));
      const channelTitles = new Set(subs.map((s) => s.channelTitle.toLowerCase()));

      const matched = INITIAL_VIDEOS.filter(
        (v) => channelIds.has(v.channelId) || channelTitles.has(v.channelTitle.toLowerCase())
      );

      setFeedVideos(matched.length > 0 ? matched : (subs.length > 0 ? INITIAL_VIDEOS.slice(0, 6) : []));
    });

    return () => unsub();
  }, [user]);

  const handleUnsubscribe = async (channel: SubscriptionItem) => {
    try {
      await toggleSubscribeChannel(
        user?.uid || '',
        { id: channel.channelId, title: channel.channelTitle, thumbnail: channel.channelThumbnail },
        true
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!user && subscriptions.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
          <Tv size={32} />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Never miss a new video
        </h2>
        <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
          Sign in to subscribe to nature channels, explore scenic content, and get updates from your favorite creators.
        </p>
        <button
          onClick={() => triggerSignInPrompt('Sign in to view your subscriptions.')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
      {!user && subscriptions.length > 0 && (
        <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-4">
          <p className="text-xs text-indigo-900 dark:text-indigo-200">
            Viewing local subscriptions. Sign in with Google to sync them across all your devices.
          </p>
          <button
            onClick={() => triggerSignInPrompt('Sign in to sync your subscriptions.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            <LogIn size={13} />
            <span>Sign in to sync</span>
          </button>
        </div>
      )}

      {/* Subscribed Channels Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Tv size={22} className="text-indigo-500" />
            <span>Subscriptions</span>
          </h1>
          <span className="text-xs font-semibold text-neutral-400">
            {subscriptions.length} {subscriptions.length === 1 ? 'channel' : 'channels'}
          </span>
        </div>

        {subscriptions.length > 0 ? (
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-3 pt-1">
            {subscriptions.map((sub) => (
              <div
                key={sub.channelId}
                onClick={() => openSearch(sub.channelTitle)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 border-2 border-transparent group-hover:border-indigo-500 transition-all shadow-xs">
                  <img
                    src={sub.channelThumbnail}
                    alt={sub.channelTitle}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-2xs font-semibold text-neutral-700 dark:text-neutral-300 max-w-[70px] truncate text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {sub.channelTitle}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnsubscribe(sub);
                  }}
                  className="text-3xs text-neutral-400 hover:text-red-500 cursor-pointer"
                >
                  Unsubscribe
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-4">No subscriptions yet.</p>
        )}
      </div>

      {/* Feed Videos from Subscribed Channels */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">
          Latest from your channels
        </h2>
        {feedVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {feedVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400">
            Subscribe to channels to see their latest videos appear here.
          </div>
        )}
      </div>
    </div>
  );
};
