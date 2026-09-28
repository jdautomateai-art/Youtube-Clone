import React, { useEffect, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import { subscribeToUserLikes } from '../firebase/firestoreService';
import { LikedVideoItem } from '../types';
import { formatTimeAgo } from '../services/youtubeApi';

export const LikedVideosPage: React.FC = () => {
  const { user, triggerSignInPrompt } = useAuth();
  const { openVideo } = useNavigation();
  const [likes, setLikes] = useState<LikedVideoItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserLikes(user.uid, setLikes);
    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[70vh]">
        <ThumbsUp size={36} className="text-indigo-500 mb-3" />
        <h2 className="text-lg font-bold mb-2">Sign in to view your liked videos</h2>
        <button
          onClick={() => triggerSignInPrompt('Sign in to view liked videos.')}
          className="px-5 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full">
      <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ThumbsUp size={22} className="text-indigo-500" />
          <span>Liked Videos</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">{likes.length} videos liked</p>
      </div>

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
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {item.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 truncate">{item.channelTitle}</p>
              <p className="text-3xs text-neutral-400 mt-0.5">Liked {formatTimeAgo(item.likedAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 text-xs">
          No liked videos yet. Tap the Like button on any video to save it here!
        </div>
      )}
    </div>
  );
};
