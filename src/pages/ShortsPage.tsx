import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Check,
  X,
  Send,
  AlertCircle
} from 'lucide-react';
import { VideoItem, CommentItem } from '../types';
import { fetchShortsFeed, formatViewCount } from '../services/youtubeApi';
import { useAuth } from '../firebase/context';
import {
  toggleLikeVideo,
  checkIsVideoLiked,
  toggleSaveVideo,
  checkIsVideoSaved,
  toggleSubscribeChannel,
  checkIsChannelSubscribed,
  subscribeToVideoComments,
  addVideoComment
} from '../firebase/firestoreService';

export const ShortsPage: React.FC = () => {
  const { user, profile, triggerSignInPrompt } = useAuth();
  const [shorts, setShorts] = useState<VideoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);

  // Per-short interaction states for current video
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Comments slide-up drawer for shorts
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const currentVideo = shorts[currentIndex];

  useEffect(() => {
    async function loadShorts() {
      setLoading(true);
      try {
        const items = await fetchShortsFeed();
        setShorts(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadShorts();
  }, []);

  // Update interaction states whenever active short changes
  useEffect(() => {
    if (!currentVideo || !user) {
      setIsLiked(false);
      setIsSaved(false);
      setIsSubscribed(false);
      return;
    }

    checkIsVideoLiked(user.uid, currentVideo.id).then(setIsLiked);
    checkIsVideoSaved(user.uid, currentVideo.id).then(setIsSaved);
    checkIsChannelSubscribed(user.uid, currentVideo.channelId).then(setIsSubscribed);
  }, [currentIndex, currentVideo, user]);

  // Subscribe to comments for active short
  useEffect(() => {
    if (!currentVideo) return;
    const unsub = subscribeToVideoComments(currentVideo.id, (list) => {
      setComments(list);
    });
    return () => unsub();
  }, [currentVideo]);

  const goToNext = useCallback(() => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, shorts.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation: Up / Down arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Handle Likes
  const handleLike = async () => {
    if (!user) {
      triggerSignInPrompt('Sign in to like this Short.');
      return;
    }
    if (!currentVideo) return;
    const next = !isLiked;
    setIsLiked(next);
    try {
      await toggleLikeVideo(user.uid, currentVideo, isLiked);
    } catch (e) {
      setIsLiked(isLiked);
    }
  };

  // Handle Save
  const handleSave = async () => {
    if (!user) {
      triggerSignInPrompt('Sign in to save this Short.');
      return;
    }
    if (!currentVideo) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      await toggleSaveVideo(user.uid, currentVideo, isSaved);
    } catch (e) {
      setIsSaved(isSaved);
    }
  };

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!user) {
      triggerSignInPrompt('Sign in to subscribe.');
      return;
    }
    if (!currentVideo) return;
    const next = !isSubscribed;
    setIsSubscribed(next);
    try {
      await toggleSubscribeChannel(
        user.uid,
        {
          id: currentVideo.channelId,
          title: currentVideo.channelTitle,
          thumbnail: currentVideo.channelAvatarUrl
        },
        isSubscribed
      );
    } catch (e) {
      setIsSubscribed(isSubscribed);
    }
  };

  // Handle Share
  const handleShare = () => {
    if (!currentVideo) return;
    const url = `${window.location.origin}/watch/${currentVideo.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      triggerSignInPrompt('Sign in to comment.');
      return;
    }
    if (!currentVideo || !commentText.trim()) return;

    try {
      await addVideoComment(currentVideo.id, {
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || 'User',
        photoURL: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
      }, commentText.trim());
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={36} className="text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No Shorts Available</h2>
        <p className="text-xs text-neutral-500 mt-1">Please check back later or explore standard videos.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] p-2 sm:p-4 overflow-hidden bg-neutral-950"
    >
      {/* On-screen Up / Down navigation buttons (desktop) */}
      <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          aria-label="Previous Short"
          className="p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronUp size={22} />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === shorts.length - 1}
          aria-label="Next Short"
          className="p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Phone-shaped column container for Short */}
      <div className="relative w-full max-w-[400px] h-[85vh] max-h-[800px] rounded-3xl overflow-hidden bg-black shadow-2xl border border-neutral-800 flex items-center justify-center">
        {/* YouTube Official Embedded Player (Snap Snapped & Single Active) */}
        {currentVideo && (
          <iframe
            key={currentVideo.id}
            src={`https://www.youtube-nocookie.com/embed/${currentVideo.id}?autoplay=1&loop=1&playlist=${currentVideo.id}&mute=${isMuted ? '1' : '0'}&controls=0&modestbranding=1&rel=0`}
            title={currentVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full object-cover pointer-events-auto"
          />
        )}

        {/* Top bar over video: Sound toggle & Counter */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-auto">
          <span className="px-2.5 py-1 rounded-full bg-black/50 text-white text-3xs font-mono font-medium backdrop-blur-xs">
            {currentIndex + 1} / {shorts.length}
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs transition-colors"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Vertical Actions Column (Right side) */}
        <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-4 text-white pointer-events-auto">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition-all ${
              isLiked ? 'bg-indigo-600 text-white scale-110' : 'bg-black/50 group-hover:bg-black/70 text-white'
            }`}>
              <ThumbsUp size={22} className={isLiked ? 'fill-current' : ''} />
            </div>
            <span className="text-3xs font-semibold drop-shadow">
              {formatViewCount(currentVideo.likeCount || '142K')}
            </span>
          </button>

          {/* Comments */}
          <button
            onClick={() => setShowCommentsDrawer(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/50 group-hover:bg-black/70 backdrop-blur-md transition-all">
              <MessageSquare size={22} />
            </div>
            <span className="text-3xs font-semibold drop-shadow">
              {comments.length || '12'}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/50 group-hover:bg-black/70 backdrop-blur-md transition-all">
              {copiedLink ? <Check size={22} className="text-emerald-400" /> : <Share2 size={22} />}
            </div>
            <span className="text-3xs font-semibold drop-shadow">
              {copiedLink ? 'Copied' : 'Share'}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition-all ${
              isSaved ? 'bg-indigo-600 text-white scale-110' : 'bg-black/50 group-hover:bg-black/70 text-white'
            }`}>
              <Bookmark size={22} className={isSaved ? 'fill-current' : ''} />
            </div>
            <span className="text-3xs font-semibold drop-shadow">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        </div>

        {/* Bottom Details Overlay (Bottom-left gradient) */}
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-6 px-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10">
          <div className="pointer-events-auto pr-16 space-y-2">
            {/* Channel Info & Subscribe */}
            <div className="flex items-center gap-2.5">
              <img
                src={currentVideo.channelAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentVideo.channelId}`}
                alt={currentVideo.channelTitle}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
              />
              <span className="text-xs font-bold text-white drop-shadow truncate">
                {currentVideo.channelTitle}
              </span>
              <button
                onClick={handleSubscribe}
                className={`px-3 py-1 rounded-full text-3xs font-bold transition-all ${
                  isSubscribed
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Title */}
            <p className="text-xs font-medium text-white/90 line-clamp-2 leading-snug drop-shadow">
              {currentVideo.title}
            </p>
          </div>
        </div>

        {/* Slide-up Comments Drawer */}
        {showCommentsDrawer && (
          <div className="absolute inset-x-0 bottom-0 top-1/3 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl z-30 flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-sm font-bold text-white">
                Comments ({comments.length})
              </span>
              <button
                onClick={() => setShowCommentsDrawer(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start text-xs">
                  <img
                    src={c.authorPhoto}
                    alt={c.authorName}
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200">{c.authorName}</span>
                    <p className="text-neutral-300 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-neutral-500 text-xs py-8">
                  No comments yet on this Short.
                </p>
              )}
            </div>

            {/* Add comment */}
            {user ? (
              <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-neutral-800">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-1.5 rounded-full bg-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2 rounded-full bg-indigo-600 text-white disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => triggerSignInPrompt('Sign in to comment.')}
                className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Sign in to comment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
