export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  channelAvatarUrl?: string;
  publishedAt: string;
  duration?: string;
  durationSeconds?: number;
  viewCount?: string;
  likeCount?: string;
  category?: string;
  isShort?: boolean;
}

export interface CommentItem {
  id: string;
  videoId: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string; // For replies
  edited: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  createdAt: string;
  lastActive: string;
}

export interface LikedVideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  likedAt: string;
}

export interface SavedVideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  savedAt: string;
}

export interface SubscriptionItem {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  subscribedAt: string;
}

export interface WatchHistoryItem {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  watchedAt: string;
}

export interface ChannelItem {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl: string;
  bannerUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
  publishedAt?: string;
}

export interface YouTubeCommentItem {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number;
  publishedAt: string;
  replyCount?: number;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  searchedAt: string;
}
