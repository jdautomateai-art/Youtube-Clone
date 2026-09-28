import React, { useEffect, useState } from 'react';
import { SubscriptionItem, VideoItem } from '../types';
import { useAuth } from '../firebase/context';
import { subscribeToUserSubscriptions, toggleSubscribeChannel } from '../firebase/firestoreService';
import { INITIAL_VIDEOS } from '../data/mockYouTubeData';
import { VideoCard } from '../components/VideoCard';
import { Tv, Check, Bell } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const SubscriptionsPage: React.FC = () => {
  const { user, triggerSignInPrompt } = useAuth();
  const { navigate } = useNavigation();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [feedVideos, setFeedVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserSubscriptions(user.uid, (subs) => {
      setSubscriptions(subs);
      setLoading(false);

      // Filter videos from subscribed channels
      const channelIds = new Set(subs.map((s) => s.channelId));
      const channelTitles = new Set(subs.map((s) => s.channelTitle.toLowerCase()));

      const matched = INITIAL_VIDEOS.filter(
        (v) => channelIds.has(v.channelId) || channelTitles.has(v.channelTitle.toLowerCase())
      );

      // If no direct matches in the sample list, provide a curated stream for them
      setFeedVideos(matched.length > 0 ? matched : (subs.length > 0 ? INITIAL_VIDEOS.slice(0, 6) : []));
    });

    return () => unsub();
  }, [user]);

  const handleUnsubscribe = async (channel: SubscriptionItem) => {
    if (!user) return;
    try {
      await toggleSubscribeChannel(
        user.uid,
        { id: channel.channelId, title: channel.channelTitle, thumbnail: channel.channelThumbnail },
        true
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Tv size={32} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Never miss what’s new
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Sign in to see updates from your favorite YouTube channels and stream your personalized creator feed.
        </p>
        <button
          onClick={() => triggerSignInPrompt('Sign in to view your subscriptions.')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-md w-48 mb-6" />
        <div className="flex gap-4 mb-8 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="w-14 h-3 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full">
      <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
        <Tv size={24} className="text-indigo-500" />
        <span>Subscriptions</span>
      </h1>

      {/* Subscribed Channels Avatar Ribbon */}
      {subscriptions.length > 0 ? (
        <div className="mb-10">
          <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
            {subscriptions.map((sub) => (
              <div
                key={sub.channelId}
                className="group flex flex-col items-center shrink-0 w-24 text-center cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={sub.channelThumbnail}
                    alt={sub.channelTitle}
                    className="w-16 h-16 rounded-full object-cover border-2 border-transparent group-hover:border-indigo-500 transition-all p-0.5"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-white">
                    <Check size={10} className="stroke-[3]" />
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-2 truncate w-full">
                  {sub.channelTitle}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnsubscribe(sub);
                  }}
                  className="text-3xs text-neutral-400 hover:text-red-500 mt-0.5"
                >
                  Unsubscribe
                </button>
              </div>
            ))}
          </div>

          {/* Recent videos from subscriptions */}
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
            <Bell size={18} className="text-indigo-500" />
            <span>Latest from your channels</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {feedVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 dark:text-neutral-400">
          <p className="text-base font-semibold mb-1">You haven’t subscribed to any channels yet</p>
          <p className="text-xs mb-6">Discover creators on the Home or Watch pages and click Subscribe!</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
          >
            Explore Videos
          </button>
        </div>
      )}
    </div>
  );
};
