import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../firebase/context';
import { ChannelItem, VideoItem } from '../types';
import { fetchChannelDetails } from '../services/youtubeApi';
import { VideoCard } from '../components/VideoCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { checkIsChannelSubscribed, toggleSubscribeChannel } from '../firebase/firestoreService';
import {
  CheckCircle2,
  Bell,
  Check,
  Share2,
  Film,
  Info,
  Calendar,
  Eye,
  Tv,
  ExternalLink
} from 'lucide-react';

export const ChannelPage: React.FC = () => {
  const { route, navigate } = useNavigation();
  const { user, triggerSignInPrompt } = useAuth();
  const channelId = route.channelId || '';

  const [channel, setChannel] = useState<ChannelItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'about'>('videos');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadChannel() {
      if (!channelId) return;
      setLoading(true);
      try {
        const data = await fetchChannelDetails(channelId);
        if (isMounted) {
          setChannel(data.channel);
          setVideos(data.videos);
        }
      } catch (err) {
        console.error('Failed to load channel:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadChannel();
    return () => { isMounted = false; };
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    checkIsChannelSubscribed(user?.uid || '', channelId).then(setSubscribed);
  }, [user, channelId]);

  const handleToggleSubscribe = async () => {
    if (!user) {
      triggerSignInPrompt(`Sign in to subscribe to ${channel?.title || 'this channel'}.`);
      return;
    }
    if (!channel) return;

    setSubscribing(true);
    const nextState = !subscribed;
    setSubscribed(nextState);

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
      setSubscribing(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (loading && !channel) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="w-full h-40 sm:h-56 md:h-64 rounded-2xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-7 w-60 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonGrid count={8} />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-xl font-bold mb-2">Channel Not Found</h2>
        <p className="text-sm text-neutral-500 mb-4">The channel you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const shortsVideos = videos.filter((v) => v.isShort || (v.durationSeconds && v.durationSeconds <= 60));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full">
      {/* Channel Banner */}
      <div className="w-full h-36 sm:h-52 md:h-64 rounded-2xl overflow-hidden relative shadow-md mb-6 bg-gradient-to-r from-neutral-800 via-indigo-950 to-neutral-900 flex items-center justify-center">
        {channel.bannerUrl ? (
          <img
            src={channel.bannerUrl}
            alt={channel.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/80 flex items-center justify-center p-6 text-center">
            <div className="backdrop-blur-xs bg-black/30 p-4 sm:p-6 rounded-2xl border border-white/10 max-w-lg">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-wide">{channel.title}</h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1">Official Channel on StreamHub</p>
            </div>
          </div>
        )}
      </div>

      {/* Channel Header Information */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 border-4 border-white dark:border-neutral-900 shadow-xl bg-neutral-200 dark:bg-neutral-800">
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {channel.title}
            </h1>
            <CheckCircle2 size={20} className="text-neutral-500 fill-neutral-300 dark:fill-neutral-700 dark:text-neutral-400" />
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex-wrap">
            {channel.customUrl && <span className="font-medium text-neutral-700 dark:text-neutral-300">{channel.customUrl}</span>}
            {channel.customUrl && <span>•</span>}
            {channel.subscriberCount && <span>{channel.subscriberCount} subscribers</span>}
            {channel.subscriberCount && <span>•</span>}
            <span>{channel.videoCount || videos.length} videos</span>
          </div>

          {channel.description && (
            <div className="mt-2.5 max-w-3xl">
              <p className={`text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed ${!showFullDesc ? 'line-clamp-2' : ''}`}>
                {channel.description}
              </p>
              {channel.description.length > 120 && (
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 dark:hover:text-indigo-400 mt-1 cursor-pointer"
                >
                  {showFullDesc ? 'Show less' : '...more'}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-4 flex-wrap">
            <button
              onClick={handleToggleSubscribe}
              disabled={subscribing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm ${
                subscribed
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                  : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 hover:scale-102'
              }`}
            >
              {subscribed ? (
                <>
                  <Check size={16} className="text-emerald-500" />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <Bell size={16} />
                  <span>Subscribe</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Share2 size={16} />
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 sm:gap-8 border-b border-neutral-200 dark:border-neutral-800 mt-2 mb-6">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'videos'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Film size={16} />
          <span>Videos ({videos.length})</span>
        </button>

        {shortsVideos.length > 0 && (
          <button
            onClick={() => setActiveTab('shorts')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'shorts'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Tv size={16} />
            <span>Shorts ({shortsVideos.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'about'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Info size={16} />
          <span>About</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <div>
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {videos.map((vid) => (
                <VideoCard key={vid.id} video={vid} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 text-sm">
              No videos available for this channel yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'shorts' && (
        <div>
          {shortsVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {shortsVideos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => navigate(`/watch/${vid.id}`)}
                  className="group flex flex-col cursor-pointer relative"
                >
                  <div className="aspect-[9/16] rounded-xl overflow-hidden bg-neutral-800 relative shadow-sm">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 sm:p-3">
                      <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                        {vid.title}
                      </p>
                      <p className="text-white/70 text-3xs mt-1">
                        {vid.viewCount ? `${vid.viewCount} views` : 'Short'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-500 text-sm">
              No shorts found for this channel.
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">Description</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {channel.description || 'No description provided by the channel.'}
              </p>
            </div>

            {channel.customUrl && (
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">Details</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="font-medium">Custom URL:</span>
                  <a
                    href={`https://youtube.com/${channel.customUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>{channel.customUrl}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Stats</h3>

            <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <Calendar size={18} className="text-neutral-400 shrink-0" />
              <span>
                Joined {channel.publishedAt ? new Date(channel.publishedAt).toLocaleDateString() : 'YouTube'}
              </span>
            </div>

            {channel.subscriberCount && (
              <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <Bell size={18} className="text-neutral-400 shrink-0" />
                <span>{channel.subscriberCount} Subscribers</span>
              </div>
            )}

            {channel.viewCount && (
              <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <Eye size={18} className="text-neutral-400 shrink-0" />
                <span>{channel.viewCount} Total Views</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <Film size={18} className="text-neutral-400 shrink-0" />
              <span>{channel.videoCount || videos.length} Uploaded Videos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
