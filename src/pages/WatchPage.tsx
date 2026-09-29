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
  ExternalLink,
  Send,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { VideoItem, CommentItem, YouTubeCommentItem } from '../types';
import {
  fetchVideoById,
  fetchRelatedVideos,
  fetchYouTubeComments,
  formatTimeAgo,
  formatViewCount
} from '../services/youtubeApi';
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

function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = text.split('\n');

  return (
    <div className="space-y-1 break-words whitespace-pre-wrap leading-relaxed">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
        const parts = line.split(urlRegex);
        return (
          <p key={lIdx}>
            {parts.map((part, pIdx) => {
              if (part.match(urlRegex)) {
                return (
                  <a
                    key={pIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium break-all"
                  >
                    {part}
                  </a>
                );
              }
              const hashRegex = /(#[a-zA-Z0-9_]+)/g;
              const subparts = part.split(hashRegex);
              return subparts.map((sub, sIdx) => {
                if (sub.match(hashRegex)) {
                  return (
                    <span key={sIdx} className="text-indigo-500 font-semibold">
                      {sub}
                    </span>
                  );
                }
                return sub;
              });
            })}
          </p>
        );
      })}
    </div>
  );
}

export const WatchPage: React.FC = () => {
  const { route, openVideo } = useNavigation();
  const videoId = route.videoId || 'LXb3EKWsInQ';

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
  const [ytComments, setYtComments] = useState<YouTubeCommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [commentTab, setCommentTab] = useState<'all' | 'youtube' | 'community'>('all');

  // Load video details, related videos and original YouTube comments
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [v, rel, originalComments] = await Promise.all([
          fetchVideoById(videoId),
          fetchRelatedVideos(videoId),
          fetchYouTubeComments(videoId)
        ]);
        if (isMounted) {
          setVideo(v);
          setRelated(rel);
          setYtComments(originalComments);

          // Add to watch history
          if (v) {
            addToWatchHistory(user?.uid || '', v);
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
    if (!video) return;
    checkIsVideoLiked(user?.uid || '', video.id).then(setIsLiked);
    checkIsVideoSaved(user?.uid || '', video.id).then(setIsSaved);
    checkIsChannelSubscribed(user?.uid || '', video.channelId).then(setIsSubscribed);
  }, [user, video]);

  // Subscribe to real-time community comments on this video
  useEffect(() => {
    const unsub = subscribeToVideoComments(videoId, (items) => {
      setComments(items);
    });
    return () => unsub();
  }, [videoId]);

  // Handle Like
  const handleLike = async () => {
    if (!video) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      await toggleLikeVideo(user?.uid || '', video, isLiked);
    } catch {
      setIsLiked(isLiked);
    }
  };

  // Handle Save
  const handleSave = async () => {
    if (!video) return;
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      await toggleSaveVideo(user?.uid || '', video, isSaved);
    } catch {
      setIsSaved(isSaved);
    }
  };

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!video) return;
    const nextState = !isSubscribed;
    setIsSubscribed(nextState);
    try {
      await toggleSubscribeChannel(
        user?.uid || '',
        {
          id: video.channelId,
          title: video.channelTitle,
          thumbnail: video.channelAvatarUrl
        },
        isSubscribed
      );
    } catch {
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
    if (!commentText.trim()) return;

    if (!user) {
      triggerSignInPrompt('Sign in to leave a comment on this video.');
      return;
    }

    setSubmittingComment(true);
    try {
      const added = await addVideoComment(
        videoId,
        {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'User',
          photoURL: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`
        },
        commentText
      );
      setComments((prev) => [added, ...prev]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Reply Submission
  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return;
    try {
      const added = await addVideoComment(
        videoId,
        {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'User',
          photoURL: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`
        },
        replyText,
        parentId
      );
      setComments((prev) => [...prev, added]);
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Edit Comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || !user) return;
    try {
      await updateVideoComment(videoId, commentId, user.uid, editText);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: editText, edited: true } : c))
      );
      setEditingCommentId(null);
      setEditText('');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteVideoComment(videoId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  // Group top-level and replies for community comments
  const { topLevelComments, repliesMap } = useMemo(() => {
    const top: CommentItem[] = [];
    const map: Record<string, CommentItem[]> = {};

    for (const c of comments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      } else {
        top.push(c);
      }
    }
    return { topLevelComments: top, repliesMap: map };
  }, [comments]);

  const totalCommentsCount = comments.length + ytComments.length;

  if (loading && !video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 w-full animate-pulse">
        <div className="aspect-video w-full max-w-4xl bg-neutral-200 dark:bg-neutral-800 rounded-2xl mb-4" />
        <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
        <div className="h-10 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="py-24 text-center">
        <p className="text-neutral-500">Video not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Columns: Video Player, Title, Channel, Original Description & Comments */}
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
                src={video.channelAvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${video.channelId || video.channelTitle}`}
                alt={video.channelTitle}
                className="w-10 h-10 rounded-full object-cover bg-neutral-200 dark:bg-neutral-800 ring-2 ring-neutral-200 dark:ring-neutral-700"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base leading-tight">
                    {video.channelTitle}
                  </p>
                  <CheckCircle2 size={15} className="text-neutral-500 fill-neutral-300 dark:fill-neutral-700 dark:text-neutral-400" />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Official YouTube Creator</p>
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
                <span>{isLiked ? 'Liked' : (video.likeCount ? formatViewCount(video.likeCount) : 'Like')}</span>
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

          {/* Original YouTube Description Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100 mb-2.5">
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>•</span>
              <span>{formatTimeAgo(video.publishedAt)}</span>
            </div>

            <div className={`transition-all ${descExpanded ? '' : 'line-clamp-4 max-h-24 overflow-hidden'}`}>
              <FormattedText text={video.description} />
            </div>

            {video.description && video.description.length > 120 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-3 font-bold text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer block"
              >
                {descExpanded ? 'Show less' : '...Show more'}
              </button>
            )}
          </div>

          {/* Comments Section */}
          <section className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-500" />
                <span>{totalCommentsCount} Comments</span>
              </h2>

              {/* Tabs for comments: All / YouTube Original / Community */}
              <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setCommentTab('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    commentTab === 'all'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All ({totalCommentsCount})
                </button>
                <button
                  onClick={() => setCommentTab('youtube')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    commentTab === 'youtube'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  YouTube ({ytComments.length})
                </button>
                <button
                  onClick={() => setCommentTab('community')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    commentTab === 'community'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Community ({comments.length})
                </button>
              </div>
            </div>

            {/* Comment Input */}
            <form onSubmit={handlePostComment} className="flex gap-3 mb-8 items-start">
              <img
                src={
                  profile?.photoURL ||
                  user?.photoURL ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.uid || 'guest'}`
                }
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-1 ring-1 ring-neutral-300 dark:ring-neutral-700"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={user ? "Add a public comment..." : "Add a public comment (Sign in or post as guest)..."}
                  rows={2}
                  maxLength={1000}
                  className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-3xs text-neutral-400">
                    {commentText.length}/1000 characters
                  </span>
                  <div className="flex items-center gap-2">
                    {!user && (
                      <button
                        type="button"
                        onClick={() => triggerSignInPrompt('Sign in to link comments to your Google profile.')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!commentText.trim() || submittingComment}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      <Send size={14} />
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Community User Comments */}
            {(commentTab === 'all' || commentTab === 'community') && topLevelComments.length > 0 && (
              <div className="space-y-5 mb-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
                  <Sparkles size={14} />
                  <span>Community Discussion ({topLevelComments.length})</span>
                </div>
                {topLevelComments.map((c) => {
                  const isAuthor = user?.uid === c.authorUid;
                  const replies = repliesMap[c.id] || [];

                  return (
                    <div key={c.id} className="space-y-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/50">
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

                          {/* Reply input */}
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
                                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                              >
                                Post
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="pl-10 space-y-2.5 pt-1 border-l-2 border-neutral-200 dark:border-neutral-700 ml-3">
                          {replies.map((r) => (
                            <div key={r.id} className="flex gap-2.5 items-start">
                              <CornerDownRight size={13} className="text-neutral-400 shrink-0 mt-1" />
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
                                </div>
                                <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5">
                                  {r.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Original YouTube Comments */}
            {(commentTab === 'all' || commentTab === 'youtube') && ytComments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  <span>Original YouTube Comments ({ytComments.length})</span>
                  <span className="text-3xs font-normal lowercase text-neutral-400">synced from YouTube</span>
                </div>

                {ytComments.map((ytc) => (
                  <div
                    key={ytc.id}
                    className="flex gap-3.5 items-start p-3 sm:p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <img
                      src={ytc.authorProfileImageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${ytc.id}`}
                      alt={ytc.authorDisplayName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-neutral-300 dark:ring-neutral-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {ytc.authorDisplayName}
                        </span>
                        <span className="text-3xs text-neutral-400">
                          {formatTimeAgo(ytc.publishedAt)}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-wrap leading-relaxed break-words">
                        <span dangerouslySetInnerHTML={{ __html: ytc.textDisplay }} />
                      </div>

                      <div className="flex items-center gap-3 mt-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <ThumbsUp size={13} className="text-neutral-400" />
                          <span className="text-2xs font-medium">{ytc.likeCount > 0 ? formatViewCount(ytc.likeCount) : ''}</span>
                        </div>
                        {Boolean(ytc.replyCount && ytc.replyCount > 0) && (
                          <span className="text-2xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {ytc.replyCount} {ytc.replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalCommentsCount === 0 && (
              <div className="py-12 text-center text-xs text-neutral-400">
                No comments available for this video yet.
              </div>
            )}
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
