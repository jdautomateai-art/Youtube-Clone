import { VideoItem } from '../types';
import { INITIAL_VIDEOS, INITIAL_SHORTS } from '../data/mockYouTubeData';

export interface ApiResponse<T> {
  data: T;
  nextPageToken?: string;
  isCached?: boolean;
  apiKeyMissing?: boolean;
}

// In-memory frontend cache for snappy navigation
const clientCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function formatViewCount(views?: string | number): string {
  if (!views) return '1.2M';
  const num = typeof views === 'string' ? parseInt(views.replace(/[^0-9]/g, ''), 10) : views;
  if (isNaN(num)) return String(views);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

export function formatTimeAgo(dateString: string): string {
  try {
    const past = new Date(dateString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y ago`;
  } catch (e) {
    return 'Recently';
  }
}

export function parseYouTubeDuration(isoDuration?: string): string {
  if (!isoDuration) return '10:00';
  if (isoDuration.includes(':')) return isoDuration;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '03:45';
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${mStr}:${sStr}`;
  }
  return `${minutes}:${sStr}`;
}

export async function fetchVideosFeed(category: string = 'All', pageToken?: string): Promise<ApiResponse<VideoItem[]>> {
  const cacheKey = `feed_${category}_${pageToken || 'first'}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/youtube/feed?category=${encodeURIComponent(category)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        clientCache.set(cacheKey, { data: json, timestamp: Date.now() });
        return json;
      }
    }
  } catch (err) {
    console.warn('API route call fallback:', err);
  }

  // Graceful fallback to rich curated video set
  let filtered = [...INITIAL_VIDEOS];
  if (category && category !== 'All') {
    const catLower = category.toLowerCase();
    const matches = INITIAL_VIDEOS.filter(
      (v) => (v.category && v.category.toLowerCase() === catLower) ||
             v.title.toLowerCase().includes(catLower)
    );
    if (matches.length > 0) {
      filtered = matches;
    }
  }
  const result: ApiResponse<VideoItem[]> = {
    data: filtered,
    apiKeyMissing: true,
    isCached: true
  };
  clientCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function searchYouTubeVideos(query: string, pageToken?: string): Promise<ApiResponse<VideoItem[]>> {
  if (!query.trim()) return { data: [] };
  const cacheKey = `search_${query}_${pageToken || 'first'}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        clientCache.set(cacheKey, { data: json, timestamp: Date.now() });
        return json;
      }
    }
  } catch (err) {
    console.warn('API search fallback:', err);
  }

  // Fallback keyword filter
  const qLower = query.toLowerCase();
  const matched = INITIAL_VIDEOS.filter(
    (v) => v.title.toLowerCase().includes(qLower) ||
           v.description.toLowerCase().includes(qLower) ||
           v.channelTitle.toLowerCase().includes(qLower)
  );

  const fallbackData = matched.length > 0 ? matched : INITIAL_VIDEOS;
  const result: ApiResponse<VideoItem[]> = {
    data: fallbackData,
    apiKeyMissing: true,
    isCached: true
  };
  clientCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function fetchVideoById(videoId: string): Promise<VideoItem | null> {
  const cacheKey = `video_${videoId}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/youtube/video/${videoId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        clientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
        return json.data;
      }
    }
  } catch (err) {
    console.warn('API video fetch fallback:', err);
  }

  const found = INITIAL_VIDEOS.find((v) => v.id === videoId) || INITIAL_SHORTS.find((v) => v.id === videoId);
  if (found) {
    clientCache.set(cacheKey, { data: found, timestamp: Date.now() });
    return found;
  }

  // If not found in static list, return an embeddable model for this video ID
  const fallbackItem: VideoItem = {
    id: videoId,
    title: 'Watch Video on StreamHub',
    description: 'Embedded video player stream from YouTube.',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channelId: 'channel_' + videoId,
    channelTitle: 'YouTube Creator',
    channelAvatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${videoId}`,
    publishedAt: new Date().toISOString(),
    duration: '10:00',
    viewCount: '1.2M',
    likeCount: '45K'
  };
  clientCache.set(cacheKey, { data: fallbackItem, timestamp: Date.now() });
  return fallbackItem;
}

export async function fetchRelatedVideos(videoId: string): Promise<VideoItem[]> {
  try {
    const res = await fetch(`/api/youtube/related/${videoId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {
    // fallback below
  }
  return INITIAL_VIDEOS.filter((v) => v.id !== videoId);
}

export async function fetchShortsFeed(): Promise<VideoItem[]> {
  try {
    const res = await fetch('/api/youtube/shorts');
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {
    // fallback below
  }
  return INITIAL_SHORTS;
}
