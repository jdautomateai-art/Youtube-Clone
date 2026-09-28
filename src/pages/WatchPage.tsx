import React, { useEffect, useState, useMemo } from 'react';
import {
  ThumbsUp,
  Share2,
  Bookmark,
  Check,
  MessageSquare,
  CornerDownRight,
  Edit2,
  Trash2,
  AlertCircle,
  ExternalLink,
  Send
} from 'lucide-react';
import { VideoItem, CommentItem } from '../types';
import { fetchVideoById, fetchRelatedVideos, formatTimeAgo, formatViewCount } from '../services/youtubeApi';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../firebase/context';
import { useNavigation } from '../context/NavigationContext';
import {
  toggleLikeVideo,
  checkIsVideoLiked,
  toggleSaveVideo,
  checkIsVideoSaved,
  toggleSubscribeChannel,
  checkIsChannelSubscribed,
  addToWatchHistory,
  subscribeToVideoComments,
  addVideoComment,
  updateVideoComment,
  deleteVideoComment
} from '../firebase/firestoreService';

export const WatchPage: React.FC = () => {
  const { route, openVideo } = useNavigation();
  const videoId = route.videoId || 'M7lc1UVf-VE';

  const { user, profile, triggerSignInPrompt } = useAuth();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [related, setRelated] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User interactions states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Load video details and related videos
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [v, rel] = await Promise.all([
          fetchVideoById(videoId),
          fetchRelatedVideos(videoId)
        ]);
        if (isMounted) {
          setVideo(v);
          setRelated(rel);

          // Add to watch history if signed in
          if (user && v) {
            addToWatchHistory(user.uid, v);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [videoId, user]);

  // Check initial user states for like, save, subscription
  useEffect(() => {
    if (!user || !video) {
      setIsLiked(false);
      setIsSaved(false);
      setIsSubscribed(false);
      return;
    }

    checkIsVideoLiked(user.uid, video.id).then(setIsLiked);
    checkIsVideoSaved(user.uid, video.id).then(setIsSaved);
    checkIsChannelSubscribed(user.uid, video.channelId).then(setIsSubscribed);
  }, [user, video]);

  // Subscribe to real-time comments on this video
  useEffect(() => {
    const unsub = subscribeToVideoComments(videoId, (items) => {
      setComments(items);
    });
    return () => unsub();
  }, [videoId]);

  // Handle Like
  const handleLike = async () => {
    if (!user) {
      triggerSignInPrompt('Sign in to like this video and save it to your profile.');
      return;
    }
    if (!video) return;
    const nextState = !isLiked;
    setIsLiked(nextState); // Optimistic
    try {
      await toggleLikeVideo(user.uid, video, isLiked);
    } catch (e) {
      setIsLiked(isLiked); // Revert on failure
    }
  };

  // Handle Save
  const handleSave = async () => {
    if (!user) {
      triggerSignInPrompt('Sign in to save this video to your library.');
      return;
    }
    if (!video) return;
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      await toggleSaveVideo(user.uid, video, isSaved);
    } catch (e) {
      setIsSaved(isSaved);
    }
  };

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!user) {
      triggerSignInPrompt(`Sign in to subscribe to ${video?.channelTitle || 'this creator'}.`);
      return;
    }
    if (!video) return;
    const nextState = !isSubscribed;
    setIsSubscribed(nextState);
    try {
      await toggleSubscribeChannel(
        user.uid,
        {
          id: video.channelId,
          title: video.channelTitle,
          thumbnail: video.channelAvatarUrl
        },
        isSubscribed
      );
    } catch (e) {
      setIsSubscribed(isSubscribed);
    }
  };

  // Handle Share
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Handle Comment Submission
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      triggerSignInPrompt('Sign in to post comments.');
      return;
    }
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await addVideoComment(videoId, {
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || 'User',
        photoURL: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
      }, commentText.trim());
      setCommentText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Reply Submission
  const handlePostReply = async (parentId: string) => {
    if (!user) {
      triggerSignInPrompt('Sign in to reply to comments.');
      return;
    }
    if (!replyText.trim()) return;

    try {
      await addVideoComment(videoId, {
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || 'User',
        photoURL: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
      }, replyText.trim(), parentId);
      setReplyingToId(null);
      setReplyText('');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Edit Comment
  const handleSaveEdit = async (commentId: string) => {
    if (!user || !editText.trim()) return;
    try {
      await updateVideoComment(videoId, commentId, user.uid, editText.trim());
      setEditingCommentId(null);
      setEditText('');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    if (confirm('Delete this comment?')) {
      try {
        await deleteVideoComment(videoId, commentId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Organize top-level comments and replies
  const { topLevelComments, repliesMap } = useMemo(() => {
    const top: CommentItem[] = [];
    const rep: Record<string, CommentItem[]> = {};

    comments.forEach((c) => {
      if (c.parentId) {
        if (!rep[c.parentId]) rep[c.parentId] = [];
        rep[c.parentId].push(c);
      } else {
        top.push(c);
      }
    });

    top.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    Object.keys(rep).forEach((k) => {
      rep[k].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return { topLevelComments: top, repliesMap: rep };
  }, [comments, sortOrder]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 w-full animate-pulse">
        <div className="aspect-video w-full max-w-5xl mx-auto rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-md w-3/4 mt-4" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-1/3 mt-2" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-4">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Video Unavailable</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          This video could not be loaded or is not available for embedded playback.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Columns: Video Player & Meta Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* YouTube Official Embedded Player */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>

          {/* Title */}
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
            {video.title}
          </h1>

          {/* Channel Row & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            {/* Channel Info & Subscribe */}
            <div className="flex items-center gap-3">
              <img
                src={video.channelAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${video.channelId}`}
                alt={video.channelTitle}
                className="w-10 h-10 rounded-full object-cover bg-neutral-200 dark:bg-neutral-800"
              />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base leading-tight">
                  {video.channelTitle}
                </p>
                <p className="text-xs text-neutral-500">Official Channel</p>
              </div>

              <button
                onClick={handleSubscribe}
                className={`ml-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSubscribed
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                    : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm'
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Action Buttons: Like, Share, Save */}
            <div className="flex items-center gap-2">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                }`}
              >
                <ThumbsUp size={16} className={isLiked ? 'fill-current' : ''} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer"
              >
                {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>

              {/* Save / Library Button */}
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                }`}
              >
                <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-850 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>•</span>
              <span>{formatTimeAgo(video.publishedAt)}</span>
            </div>

            <p className={`whitespace-pre-line leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
              {video.description || 'No description provided for this video.'}
            </p>

            {video.description && video.description.length > 120 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-2 font-bold text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {descExpanded ? 'Show less' : '...more'}
              </button>
            )}
          </div>

          {/* Comments Section */}
          <section className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-500" />
                <span>{comments.length} Comments</span>
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500">Sort:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline"
                >
                  {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
                </button>
              </div>
            </div>

            {/* Comment Input */}
            {user ? (
              <form onSubmit={handlePostComment} className="flex gap-3 mb-8 items-start">
                <img
                  src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  alt={profile?.displayName || 'Your avatar'}
                  className="w-9 h-9 rounded-full object-cover shrink-0 mt-1"
                />
                <div className="flex-1 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    maxLength={1000}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-3xs text-neutral-400">
                      {commentText.length}/1000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={!commentText.trim() || submittingComment}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Send size={14} />
                      Comment
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  Sign in with your Google account to join the conversation and comment on this video.
                </p>
                <button
                  onClick={() => triggerSignInPrompt('Sign in to post comments.')}
                  className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                >
                  Sign in to comment
                </button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {topLevelComments.map((c) => {
                const isAuthor = user?.uid === c.authorUid;
                const replies = repliesMap[c.id] || [];

                return (
                  <div key={c.id} className="space-y-3">
                    <div className="flex gap-3 items-start group">
                      <img
                        src={c.authorPhoto}
                        alt={c.authorName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {c.authorName}
                          </span>
                          <span className="text-3xs text-neutral-400">
                            {formatTimeAgo(c.createdAt)}
                          </span>
                          {c.edited && (
                            <span className="text-3xs text-neutral-400 italic">(edited)</span>
                          )}
                        </div>

                        {editingCommentId === c.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              maxLength={1000}
                              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(c.id)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-line leading-relaxed">
                            {c.text}
                          </p>
                        )}

                        {/* Actions: Reply, Edit, Delete */}
                        <div className="flex items-center gap-3 mt-2 text-3xs text-neutral-500">
                          <button
                            onClick={() => {
                              if (!user) {
                                triggerSignInPrompt('Sign in to reply.');
                                return;
                              }
                              setReplyingToId(replyingToId === c.id ? null : c.id);
                            }}
                            className="font-bold hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          >
                            Reply
                          </button>

                          {isAuthor && editingCommentId !== c.id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditText(c.text);
                                }}
                                className="flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                              >
                                <Edit2 size={11} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 size={11} />
                                Delete
                              </button>
                            </>
                          )}
                        </div>

                        {/* Reply box */}
                        {replyingToId === c.id && (
                          <div className="mt-3 flex gap-2 items-start pl-2 border-l-2 border-indigo-500">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${c.authorName}...`}
                              className="flex-1 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                            />
                            <button
                              onClick={() => handlePostReply(c.id)}
                              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                            >
                              Post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Replies list (1-level nested) */}
                    {replies.length > 0 && (
                      <div className="pl-11 space-y-3 pt-1 border-l-2 border-neutral-100 dark:border-neutral-800 ml-4">
                        {replies.map((r) => {
                          const isReplyAuthor = user?.uid === r.authorUid;
                          return (
                            <div key={r.id} className="flex gap-2.5 items-start">
                              <CornerDownRight size={14} className="text-neutral-400 shrink-0 mt-1" />
                              <img
                                src={r.authorPhoto}
                                alt={r.authorName}
                                className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xs font-bold text-neutral-900 dark:text-neutral-100">
                                    {r.authorName}
                                  </span>
                                  <span className="text-3xs text-neutral-400">
                                    {formatTimeAgo(r.createdAt)}
                                  </span>
                                  {r.edited && <span className="text-3xs text-neutral-400 italic">(edited)</span>}
                                </div>
                                <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5">
                                  {r.text}
                                </p>
                                {isReplyAuthor && (
                                  <button
                                    onClick={() => handleDeleteComment(r.id)}
                                    className="text-3xs text-red-500 hover:underline mt-1"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {comments.length === 0 && (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right 1 Column: Up Next Videos */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Up Next
          </h2>
          <div className="space-y-4">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => openVideo(rel.id)}
                className="flex gap-3 group cursor-pointer"
              >
                <div className="relative w-36 sm:w-40 aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                  <img
                    src={rel.thumbnailUrl}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {rel.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-white font-mono text-3xs font-semibold">
                      {rel.duration}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {rel.title}
                  </h3>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                    {rel.channelTitle}
                  </p>
                  <p className="text-3xs text-neutral-400 mt-0.5">
                    {formatViewCount(rel.viewCount)} views
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
