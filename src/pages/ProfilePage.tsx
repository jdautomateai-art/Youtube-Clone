import React, { useState, useEffect } from 'react';
import {
  User,
  ThumbsUp,
  Bookmark,
  Tv,
  History,
  MessageSquare,
  Edit3,
  Calendar,
  Save,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import {
  subscribeToUserLikes,
  subscribeToUserSaved,
  subscribeToUserSubscriptions,
  subscribeToWatchHistory,
  clearWatchHistory,
  deleteHistoryItem,
  toggleSubscribeChannel
} from '../firebase/firestoreService';
import { LikedVideoItem, SavedVideoItem, SubscriptionItem, WatchHistoryItem } from '../types';
import { formatTimeAgo } from '../services/youtubeApi';

type ProfileTab = 'liked' | 'saved' | 'subs' | 'history';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateUserProfile, triggerSignInPrompt } = useAuth();
  const { openVideo } = useNavigation();

  const [activeTab, setActiveTab] = useState<ProfileTab>('liked');

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscribed data
  const [likes, setLikes] = useState<LikedVideoItem[]>([]);
  const [saved, setSaved] = useState<SavedVideoItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const unsubLikes = subscribeToUserLikes(user.uid, setLikes);
    const unsubSaved = subscribeToUserSaved(user.uid, setSaved);
    const unsubSubs = subscribeToUserSubscriptions(user.uid, setSubscriptions);
    const unsubHist = subscribeToWatchHistory(user.uid, setHistory);

    return () => {
      unsubLikes();
      unsubSaved();
      unsubSubs();
      unsubHist();
    };
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(displayName, bio);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (confirm('Clear entire watch history?')) {
      await clearWatchHistory(user.uid);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Your Profile & Cloud Data
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Sign in with Google to view and manage your profile, customize your bio, and sync your watch activity across all devices.
        </p>
        <button
          onClick={() => triggerSignInPrompt('Sign in to view your profile.')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-neutral-50 dark:from-indigo-950/20 dark:via-neutral-900 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
              alt={profile?.displayName || 'User'}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-neutral-800 shadow-md"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">
                {profile?.displayName || user.displayName || 'StreamHub Explorer'}
              </h1>
              <p className="text-xs text-neutral-500">{user.email}</p>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-2">
                <Calendar size={14} />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors"
          >
            <Edit3 size={15} />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Bio or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 max-w-lg space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-neutral-700 dark:text-neutral-300">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-neutral-700 dark:text-neutral-300">
                Short Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell us what kind of videos you enjoy..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>
        ) : (
          profile?.bio && (
            <p className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
              {profile.bio}
            </p>
          )
        )}
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'liked'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <ThumbsUp size={15} />
          <span>Liked Videos ({likes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Bookmark size={15} />
          <span>Saved Videos ({saved.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'subs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Tv size={15} />
          <span>Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <History size={15} />
          <span>History ({history.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'liked' && (
          <div>
            {likes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {likes.map((item) => (
                  <div
                    key={item.videoId}
                    onClick={() => openVideo(item.videoId)}
                    className="group cursor-pointer flex flex-col"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {item.title}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.channelTitle}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-neutral-400">No liked videos yet.</p>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            {saved.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {saved.map((item) => (
                  <div
                    key={item.videoId}
                    onClick={() => openVideo(item.videoId)}
                    className="group cursor-pointer flex flex-col"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {item.title}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.channelTitle}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-neutral-400">No saved videos yet.</p>
            )}
          </div>
        )}

        {activeTab === 'subs' && (
          <div>
            {subscriptions.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.channelId}
                    className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-800 flex flex-col items-center text-center"
                  >
                    <img
                      src={sub.channelThumbnail}
                      alt={sub.channelTitle}
                      className="w-16 h-16 rounded-full object-cover mb-3"
                    />
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate w-full">
                      {sub.channelTitle}
                    </p>
                    <p className="text-3xs text-neutral-400 mt-1">
                      Subscribed {formatTimeAgo(sub.subscribedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-neutral-400">No channel subscriptions yet.</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {history.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Clear All History</span>
                </button>
              </div>
            )}
            {history.length > 0 ? (
              <div className="space-y-3 max-w-3xl">
                {history.map((item) => (
                  <div
                    key={item.videoId}
                    onClick={() => openVideo(item.videoId)}
                    className="flex gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <div className="aspect-video w-32 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-2xs text-neutral-400 mt-1">{item.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-neutral-400">No history found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
