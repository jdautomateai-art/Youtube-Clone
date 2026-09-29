import React, { useState, useEffect } from 'react';
import { ChannelItem } from '../types';
import { useAuth } from '../firebase/context';
import { toggleSubscribeChannel, checkIsChannelSubscribed } from '../firebase/firestoreService';
import { Check, Bell, CheckCircle2 } from 'lucide-react';

interface ChannelCardProps {
  channel: ChannelItem;
  onSelectChannel?: (channel: ChannelItem) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onSelectChannel }) => {
  const { user, triggerSignInPrompt } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIsChannelSubscribed(user?.uid || '', channel.id).then(setSubscribed);
  }, [user, channel.id]);

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerSignInPrompt(`Sign in to subscribe to ${channel.title}.`);
      return;
    }
    setLoading(true);
    const next = !subscribed;
    setSubscribed(next);
    try {
      await toggleSubscribeChannel(
        user.uid,
        {
          id: channel.id,
          title: channel.title,
          thumbnail: channel.thumbnailUrl
        },
        subscribed
      );
    } catch {
      setSubscribed(subscribed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => onSelectChannel?.(channel)}
      className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer mb-6"
    >
      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 shadow-md">
        <img
          src={channel.thumbnailUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${channel.id}`}
          alt={channel.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 text-center sm:text-left min-w-0">
        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {channel.title}
          </h2>
          <CheckCircle2 size={16} className="text-neutral-500 fill-neutral-300 dark:fill-neutral-700 dark:text-neutral-400" />
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex-wrap">
          {channel.customUrl && <span className="font-medium text-neutral-700 dark:text-neutral-300">{channel.customUrl}</span>}
          {channel.customUrl && <span>•</span>}
          {channel.subscriberCount && <span>{channel.subscriberCount} subscribers</span>}
          {channel.videoCount && <span>•</span>}
          {channel.videoCount && <span>{channel.videoCount} videos</span>}
        </div>

        {channel.description && (
          <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mt-2 max-w-2xl leading-relaxed">
            {channel.description}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 mt-2 sm:mt-1">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            subscribed
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-sm'
          }`}
        >
          {subscribed ? (
            <>
              <Check size={14} className="text-emerald-500" />
              <span>Subscribed</span>
            </>
          ) : (
            <>
              <Bell size={14} />
              <span>Subscribe</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
