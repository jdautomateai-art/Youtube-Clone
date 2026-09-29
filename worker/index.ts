import { INITIAL_VIDEOS, INITIAL_SHORTS } from '../src/data/mockYouTubeData';
import { VideoItem, ChannelItem, YouTubeCommentItem } from '../src/types';

export interface Env {
  YOUTUBE_API_KEY?: string;
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException?(): void;
}

// In-memory fallback cache for environments without Cloudflare caches.default
const memoryCache = new Map<string, { data: string; expiry: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getMemoryCached(key: string): string | null {
  const item = memoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}

function setMemoryCached(key: string, data: string): void {
  memoryCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

function formatCount(val?: string | number): string {
  if (!val) return '0';
  const num = typeof val === 'string' ? parseInt(val.replace(/[^0-9]/g, ''), 10) : val;
  if (isNaN(num)) return String(val);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

// Content filter to remove music and prohibited content
function isAllowedContent(item: { title?: string; description?: string; categoryId?: string }): boolean {
  if (item.categoryId === '10') return false; // Category 10 is Music in YouTube
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  const bannedKeywords = [
    '\\bmusic\\b', '\\bsong\\b', '\\bsongs\\b', '\\bofficial audio\\b', '\\bmusic video\\b',
    '\\bsinger\\b', '\\balbum\\b', '\\bremix\\b', '\\bfeat\\b', '\\bft\\b', '\\bgirl\\b',
    '\\bgirls\\b', '\\bwoman\\b', '\\bwomen\\b', '\\bfemale\\b', '\\bkatseye\\b'
  ];
  for (const pattern of bannedKeywords) {
    if (new RegExp(pattern, 'i').test(text)) return false;
  }
  return true;
}

// Category search queries tuned for Nature 4K & Wildlife
const CATEGORY_TERMS: Record<string, string> = {
  'Nature 4K': 'nature 4k hdr relaxation documentary scenic',
  'Wildlife': 'wildlife animals documentary 4k safari predators',
  'Scenic Landscapes': 'scenic landscapes 4k drone nature peaceful',
  'Deep Ocean': 'deep ocean marine life coral reef 4k underwater',
  'Rainforest': 'tropical rainforest jungle amazon wildlife 4k',
  'African Safari': 'african safari wildlife serengeti savannah 4k',
  'Mountains & Alps': 'mountains alps aerial 4k peaks dolomites hiking',
  'Birds of Paradise': 'birds of paradise colorful exotic birds 4k',
  'Relaxation 4K': 'nature relaxation 4k peaceful scenic water sounds',
  'Documentary': 'nature documentary planet earth national geographic 4k',
  'Travel': 'travel nature exploration 4k scenic world',
  'Tech': 'technology science innovation 4k'
};

function createJsonResponse(data: any, status = 200, ttlSeconds = 300, isCached = false): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': `public, max-age=${ttlSeconds}, stale-while-revalidate=60`,
      'X-Worker-Cache': isCached ? 'HIT' : 'MISS'
    }
  });
}

function handleCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function handleApiRequest(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleCorsPreflight();
  }

  const url = new URL(request.url);
  // Normalize both /api/youtube/* and /api/*
  const pathname = url.pathname.replace(/^\/api\/youtube/, '/api');
  const DEFAULT_KEY = 'AIzaSyCKR9lnAuoju3d4-237GgoClhzNn8sFda0';
  const rawKey = env.YOUTUBE_API_KEY && env.YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && env.YOUTUBE_API_KEY.length > 10
    ? env.YOUTUBE_API_KEY
    : DEFAULT_KEY;
  const apiKey = rawKey && rawKey.length > 10 ? rawKey : undefined;

  // Cloudflare Cache API lookup
  const cacheKeyUrl = new URL(request.url);
  const cacheKey = new Request(cacheKeyUrl.toString(), request);
  try {
    // @ts-ignore Cloudflare runtime caches
    const cfCache = typeof caches !== 'undefined' ? caches.default : null;
    if (cfCache && request.method === 'GET') {
      const match = await cfCache.match(cacheKey);
      if (match) {
        const respHeaders = new Headers(match.headers);
        respHeaders.set('X-Worker-Cache', 'HIT');
        return new Response(match.body, {
          status: match.status,
          statusText: match.statusText,
          headers: respHeaders
        });
      }
    }
  } catch (e) {
    // Ignore cache error and proceed
  }

  // Fallback in-memory cache lookup
  const memCached = getMemoryCached(url.pathname + url.search);
  if (memCached) {
    try {
      const parsed = JSON.parse(memCached);
      return createJsonResponse(parsed, 200, 300, true);
    } catch (e) {}
  }

  let finalResponse: Response;

  // 1. Status route
  if (pathname === '/api/status') {
    finalResponse = createJsonResponse({
      status: 'ok',
      hasApiKey: Boolean(apiKey),
      cachedVideosCount: INITIAL_VIDEOS.length,
      platform: 'cloudflare-worker'
    }, 200, 60);
  }
  // 2. Home Feed route
  else if (pathname === '/api/feed') {
    const category = url.searchParams.get('category') || 'All';
    const pageToken = url.searchParams.get('pageToken') || undefined;

    if (apiKey) {
      try {
        let ytUrl = '';
        if (category === 'All') {
          const queryTerm = 'nature 4k hdr wildlife scenic landscape relaxation';
          ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=24&q=${encodeURIComponent(queryTerm)}&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        } else {
          const queryTerm = CATEGORY_TERMS[category] || category;
          ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=24&q=${encodeURIComponent(queryTerm)}&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        }

        const ytRes = await fetch(ytUrl);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          let items: VideoItem[] = [];

          const videoIds = (json.items || []).map((i: any) => i.id?.videoId || i.id).filter(Boolean);
          if (videoIds.length > 0) {
            const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
            if (detailsRes.ok) {
              const detailsJson = await detailsRes.json() as any;
              items = (detailsJson.items || []).map((item: any) => ({
                id: item.id,
                title: item.snippet?.title || 'Nature Video',
                description: item.snippet?.description || '',
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
                channelId: item.snippet?.channelId,
                channelTitle: item.snippet?.channelTitle,
                publishedAt: item.snippet?.publishedAt,
                duration: item.contentDetails?.duration,
                viewCount: item.statistics?.viewCount,
                likeCount: item.statistics?.likeCount,
                category: category === 'All' ? 'Nature 4K' : category
              }));
            }
          }

          const allowedItems = items.filter(isAllowedContent);
          const payload = {
            data: allowedItems.length > 0 ? allowedItems : items,
            nextPageToken: json.nextPageToken,
            isCached: false
          };
          finalResponse = createJsonResponse(payload, 200, 300);
        } else {
          // Check for quota or API error
          const errBody = await ytRes.json().catch(() => ({})) as any;
          const reason = errBody?.error?.errors?.[0]?.reason || errBody?.error?.message || '';
          const isQuota = ytRes.status === 403 && (reason.includes('quota') || reason.includes('rateLimit'));
          let filtered = [...INITIAL_VIDEOS];
          if (category !== 'All') {
            const term = category.toLowerCase();
            const matched = INITIAL_VIDEOS.filter((v) => v.category?.toLowerCase() === term);
            if (matched.length > 0) filtered = matched;
          }
          finalResponse = createJsonResponse({
            data: filtered,
            quotaExceeded: isQuota,
            error: isQuota ? 'QUOTA_EXCEEDED' : 'API_ERROR',
            message: isQuota ? 'YouTube API daily quota limit exceeded. Serving curated fallback videos.' : 'YouTube API request failed. Serving fallback.',
            isCached: true
          }, 200, 300);
        }
      } catch (err) {
        let filtered = [...INITIAL_VIDEOS];
        if (category !== 'All') {
          const term = category.toLowerCase();
          const matched = INITIAL_VIDEOS.filter((v) => v.category?.toLowerCase() === term);
          if (matched.length > 0) filtered = matched;
        }
        finalResponse = createJsonResponse({
          data: filtered,
          isCached: true,
          error: 'FETCH_FAILED',
          message: 'Unable to connect to YouTube service. Serving curated videos.'
        }, 200, 180);
      }
    } else {
      // Fallback without API key
      let filtered = [...INITIAL_VIDEOS];
      if (category !== 'All') {
        const term = category.toLowerCase();
        const matched = INITIAL_VIDEOS.filter((v) => v.category?.toLowerCase() === term);
        if (matched.length > 0) filtered = matched;
      }
      finalResponse = createJsonResponse({
        data: filtered,
        apiKeyMissing: true,
        error: 'MISSING_API_KEY',
        message: 'YouTube API key is not configured in Cloudflare environment secrets. Serving curated videos.',
        isCached: true
      }, 200, 300);
    }
  }
  // 3. Trending route
  else if (pathname === '/api/trending') {
    const category = url.searchParams.get('category') || 'All';
    const pageToken = url.searchParams.get('pageToken') || undefined;

    if (apiKey) {
      try {
        let ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=24&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        if (category !== 'All') {
          const queryTerm = CATEGORY_TERMS[category] || category;
          ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=24&q=${encodeURIComponent(queryTerm)}&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        }

        const ytRes = await fetch(ytUrl);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          let items: VideoItem[] = [];

          if (category === 'All') {
            items = (json.items || []).map((item: any) => ({
              id: item.id,
              title: item.snippet?.title || 'Trending Video',
              description: item.snippet?.description || '',
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
              channelId: item.snippet?.channelId,
              channelTitle: item.snippet?.channelTitle,
              publishedAt: item.snippet?.publishedAt,
              duration: item.contentDetails?.duration,
              viewCount: item.statistics?.viewCount,
              likeCount: item.statistics?.likeCount,
              category
            }));
          } else {
            const videoIds = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
            if (videoIds.length > 0) {
              const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
              if (detailsRes.ok) {
                const detailsJson = await detailsRes.json() as any;
                items = (detailsJson.items || []).map((item: any) => ({
                  id: item.id,
                  title: item.snippet?.title || 'Trending Video',
                  description: item.snippet?.description || '',
                  thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
                  channelId: item.snippet?.channelId,
                  channelTitle: item.snippet?.channelTitle,
                  publishedAt: item.snippet?.publishedAt,
                  duration: item.contentDetails?.duration,
                  viewCount: item.statistics?.viewCount,
                  likeCount: item.statistics?.likeCount,
                  category
                }));
              }
            }
          }

          const allowed = items.filter(isAllowedContent);
          finalResponse = createJsonResponse({
            data: allowed.length > 0 ? allowed : items,
            nextPageToken: json.nextPageToken,
            isCached: false
          }, 200, 300);
        } else {
          finalResponse = createJsonResponse({
            data: INITIAL_VIDEOS,
            isCached: true
          }, 200, 300);
        }
      } catch (err) {
        finalResponse = createJsonResponse({
          data: INITIAL_VIDEOS,
          isCached: true
        }, 200, 180);
      }
    } else {
      finalResponse = createJsonResponse({
        data: INITIAL_VIDEOS,
        apiKeyMissing: true,
        isCached: true
      }, 200, 300);
    }
  }
  // 4. Search route (Channels and Videos)
  else if (pathname === '/api/search') {
    const query = url.searchParams.get('q') || '';
    const pageToken = url.searchParams.get('pageToken') || undefined;

    if (!query.trim()) {
      finalResponse = createJsonResponse({ channels: [], data: [], message: 'No search query provided' }, 200, 60);
    } else if (apiKey) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video,channel&maxResults=25&q=${encodeURIComponent(query)}&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const ytRes = await fetch(searchUrl);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          const channelIds: string[] = [];
          const videoIds: string[] = [];

          for (const item of (json.items || [])) {
            if (item.id?.kind === 'youtube#channel' && item.id?.channelId) {
              channelIds.push(item.id.channelId);
            } else if (item.id?.kind === 'youtube#video' && item.id?.videoId) {
              videoIds.push(item.id.videoId);
            }
          }

          // Fetch rich channel details if any channels matched
          let channels: ChannelItem[] = [];
          if (channelIds.length > 0) {
            try {
              const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${apiKey}`);
              if (chRes.ok) {
                const chJson = await chRes.json() as any;
                channels = (chJson.items || []).map((ch: any) => ({
                  id: ch.id,
                  title: ch.snippet?.title || 'YouTube Channel',
                  description: ch.snippet?.description || '',
                  customUrl: ch.snippet?.customUrl || '',
                  thumbnailUrl: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url,
                  subscriberCount: formatCount(ch.statistics?.subscriberCount),
                  videoCount: formatCount(ch.statistics?.videoCount),
                  publishedAt: ch.snippet?.publishedAt
                }));
              }
            } catch (e) {
              console.warn('Channel fetch failed:', e);
            }
          }

          // Fetch video details
          let items: VideoItem[] = [];
          if (videoIds.length > 0) {
            const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
            if (detailsRes.ok) {
              const detailsJson = await detailsRes.json() as any;
              items = (detailsJson.items || []).map((item: any) => ({
                id: item.id,
                title: item.snippet?.title || 'Video',
                description: item.snippet?.description || '',
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
                channelId: item.snippet?.channelId,
                channelTitle: item.snippet?.channelTitle,
                publishedAt: item.snippet?.publishedAt,
                duration: item.contentDetails?.duration,
                viewCount: item.statistics?.viewCount,
                likeCount: item.statistics?.likeCount
              }));
            }
          }

          const allowed = items.filter(isAllowedContent);
          finalResponse = createJsonResponse({
            channels,
            data: allowed.length > 0 ? allowed : items,
            nextPageToken: json.nextPageToken,
            isCached: false
          }, 200, 300);
        } else {
          const qLower = query.toLowerCase();
          const matched = INITIAL_VIDEOS.filter(
            (v) => v.title.toLowerCase().includes(qLower) ||
                   v.description.toLowerCase().includes(qLower) ||
                   v.channelTitle.toLowerCase().includes(qLower)
          );
          finalResponse = createJsonResponse({
            channels: [],
            data: matched.length > 0 ? matched : INITIAL_VIDEOS,
            isCached: true
          }, 200, 180);
        }
      } catch (err) {
        const qLower = query.toLowerCase();
        const matched = INITIAL_VIDEOS.filter(
          (v) => v.title.toLowerCase().includes(qLower) ||
                 v.description.toLowerCase().includes(qLower)
        );
        finalResponse = createJsonResponse({
          channels: [],
          data: matched.length > 0 ? matched : INITIAL_VIDEOS,
          isCached: true
        }, 200, 180);
      }
    } else {
      const qLower = query.toLowerCase();
      const matched = INITIAL_VIDEOS.filter(
        (v) => v.title.toLowerCase().includes(qLower) ||
               v.description.toLowerCase().includes(qLower) ||
               v.channelTitle.toLowerCase().includes(qLower)
      );
      finalResponse = createJsonResponse({
        channels: [],
        data: matched.length > 0 ? matched : INITIAL_VIDEOS,
        apiKeyMissing: true,
        isCached: true
      }, 200, 300);
    }
  }
  // 5. Original YouTube Comments route
  else if (pathname.startsWith('/api/comments/')) {
    const videoId = pathname.replace('/api/comments/', '').trim();
    const pageToken = url.searchParams.get('pageToken') || undefined;
    const order = url.searchParams.get('order') || 'relevance'; // 'relevance' | 'time'

    if (!videoId) {
      finalResponse = createJsonResponse({ error: 'BAD_REQUEST', message: 'Missing video ID' }, 400);
    } else if (apiKey) {
      try {
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=100&order=${order === 'time' ? 'time' : 'relevance'}&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const ytRes = await fetch(commentsUrl);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          const comments: YouTubeCommentItem[] = (json.items || []).map((item: any) => {
            const top = item.snippet?.topLevelComment?.snippet;
            return {
              id: item.id,
              authorDisplayName: top?.authorDisplayName || 'YouTube User',
              authorProfileImageUrl: top?.authorProfileImageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.id}`,
              textDisplay: top?.textDisplay || top?.textOriginal || '',
              likeCount: Number(top?.likeCount || 0),
              publishedAt: top?.publishedAt || new Date().toISOString(),
              replyCount: Number(item.snippet?.totalReplyCount || 0)
            };
          });
          finalResponse = createJsonResponse({
            data: comments,
            nextPageToken: json.nextPageToken,
            totalResults: json.pageInfo?.totalResults,
            isCached: false
          }, 200, 300);
        } else {
          finalResponse = createJsonResponse({ data: [], commentsDisabled: true }, 200, 300);
        }
      } catch (err) {
        finalResponse = createJsonResponse({ data: [] }, 200, 180);
      }
    } else {
      finalResponse = createJsonResponse({ data: [] }, 200, 300);
    }
  }
  // 5. Shorts route
  else if (pathname === '/api/shorts') {
    if (apiKey) {
      try {
        const urlShorts = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&videoEmbeddable=true&maxResults=15&q=%23shorts+robotics+nature+science&key=${apiKey}`;
        const ytRes = await fetch(urlShorts);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          const videoIds = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
          if (videoIds.length > 0) {
            const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
            if (detailsRes.ok) {
              const detailsJson = await detailsRes.json() as any;
              const items = (detailsJson.items || []).map((item: any) => ({
                id: item.id,
                title: item.snippet?.title || 'Short',
                description: item.snippet?.description || '',
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
                channelId: item.snippet?.channelId,
                channelTitle: item.snippet?.channelTitle,
                channelAvatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${item.snippet?.channelId || item.id}`,
                publishedAt: item.snippet?.publishedAt,
                duration: item.contentDetails?.duration,
                viewCount: item.statistics?.viewCount,
                likeCount: item.statistics?.likeCount,
                isShort: true
              }));
              const allowed = items.filter(isAllowedContent);
              finalResponse = createJsonResponse({
                data: allowed.length > 0 ? allowed : items,
                isCached: false
              }, 200, 300);
            } else {
              finalResponse = createJsonResponse({ data: INITIAL_SHORTS, isCached: true }, 200, 300);
            }
          } else {
            finalResponse = createJsonResponse({ data: INITIAL_SHORTS, isCached: true }, 200, 300);
          }
        } else {
          finalResponse = createJsonResponse({ data: INITIAL_SHORTS, isCached: true }, 200, 300);
        }
      } catch (err) {
        finalResponse = createJsonResponse({ data: INITIAL_SHORTS, isCached: true }, 200, 180);
      }
    } else {
      finalResponse = createJsonResponse({
        data: INITIAL_SHORTS,
        apiKeyMissing: true,
        isCached: true
      }, 200, 300);
    }
  }
  // 6. Single Video details route
  else if (pathname.startsWith('/api/video/')) {
    const videoId = pathname.replace('/api/video/', '').trim();
    if (!videoId) {
      finalResponse = createJsonResponse({ error: 'BAD_REQUEST', message: 'Missing video ID' }, 400);
    } else if (apiKey) {
      try {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${encodeURIComponent(videoId)}&key=${apiKey}`;
        const ytRes = await fetch(detailsUrl);
        if (ytRes.ok) {
          const json = await ytRes.json() as any;
          const item = json.items?.[0];
          if (item) {
            let avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${item.snippet?.channelId || item.id}`;
            if (item.snippet?.channelId) {
              try {
                const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${item.snippet.channelId}&key=${apiKey}`);
                if (chRes.ok) {
                  const chJson = await chRes.json() as any;
                  const thumb = chJson.items?.[0]?.snippet?.thumbnails;
                  avatarUrl = thumb?.default?.url || thumb?.medium?.url || avatarUrl;
                }
              } catch (e) {}
            }

            const video: VideoItem = {
              id: item.id,
              title: item.snippet?.title || 'Video',
              description: item.snippet?.description || '',
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
              channelId: item.snippet?.channelId,
              channelTitle: item.snippet?.channelTitle,
              channelAvatarUrl: avatarUrl,
              publishedAt: item.snippet?.publishedAt,
              duration: item.contentDetails?.duration,
              viewCount: item.statistics?.viewCount,
              likeCount: item.statistics?.likeCount
            };
            finalResponse = createJsonResponse({ data: video, isCached: false }, 200, 600);
          } else {
            const found = INITIAL_VIDEOS.find((v) => v.id === videoId) || INITIAL_SHORTS.find((v) => v.id === videoId);
            finalResponse = createJsonResponse({
              data: found || {
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
              },
              isCached: true
            }, 200, 600);
          }
        } else {
          const found = INITIAL_VIDEOS.find((v) => v.id === videoId) || INITIAL_SHORTS.find((v) => v.id === videoId);
          finalResponse = createJsonResponse({ data: found, isCached: true }, 200, 300);
        }
      } catch (err) {
        const found = INITIAL_VIDEOS.find((v) => v.id === videoId);
        finalResponse = createJsonResponse({ data: found, isCached: true }, 200, 300);
      }
    } else {
      const found = INITIAL_VIDEOS.find((v) => v.id === videoId) || INITIAL_SHORTS.find((v) => v.id === videoId);
      finalResponse = createJsonResponse({
        data: found || {
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
        },
        apiKeyMissing: true,
        isCached: true
      }, 200, 300);
    }
  }
  // 7. Related videos route
  else if (pathname.startsWith('/api/related/')) {
    const videoId = pathname.replace('/api/related/', '').trim();
    const filtered = INITIAL_VIDEOS.filter((v) => v.id !== videoId);
    finalResponse = createJsonResponse({ data: filtered, isCached: true }, 200, 600);
  }
  // 8. Channel details & videos route
  else if (pathname.startsWith('/api/channel/')) {
    const rawChannelId = decodeURIComponent(pathname.replace('/api/channel/', '').trim());
    const pageToken = url.searchParams.get('pageToken') || undefined;
    const order = url.searchParams.get('order') || 'date';

    if (!rawChannelId) {
      finalResponse = createJsonResponse({ error: 'BAD_REQUEST', message: 'Missing channel ID' }, 400);
    } else if (apiKey) {
      try {
        let channelItem: ChannelItem | null = null;
        let uploadsPlaylistId: string | null = null;
        let channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings&id=${encodeURIComponent(rawChannelId)}&key=${apiKey}`;
        if (rawChannelId.startsWith('@')) {
          channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings&forHandle=${encodeURIComponent(rawChannelId)}&key=${apiKey}`;
        }
        const chRes = await fetch(channelUrl);
        if (chRes.ok) {
          const chJson = await chRes.json() as any;
          const item = chJson.items?.[0];
          if (item) {
            uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || null;
            channelItem = {
              id: item.id,
              title: item.snippet?.title || 'YouTube Channel',
              description: item.snippet?.description || '',
              customUrl: item.snippet?.customUrl,
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
              bannerUrl: item.brandingSettings?.image?.bannerExternalUrl,
              subscriberCount: item.statistics?.subscriberCount ? formatCount(item.statistics.subscriberCount) : undefined,
              videoCount: item.statistics?.videoCount ? formatCount(item.statistics.videoCount) : undefined,
              viewCount: item.statistics?.viewCount ? formatCount(item.statistics.viewCount) : undefined,
              publishedAt: item.snippet?.publishedAt
            };
          }
        }

        // Fetch channel videos using uploads playlist or search
        let channelVideos: VideoItem[] = [];
        let nextPageToken: string | undefined = undefined;

        if (order === 'date' && uploadsPlaylistId) {
          const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
          const plRes = await fetch(playlistUrl);
          if (plRes.ok) {
            const plJson = await plRes.json() as any;
            nextPageToken = plJson.nextPageToken;
            const vIds = (plJson.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
            if (vIds.length > 0) {
              const vDetailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${vIds.join(',')}&key=${apiKey}`);
              if (vDetailsRes.ok) {
                const vDetailsJson = await vDetailsRes.json() as any;
                channelVideos = (vDetailsJson.items || []).map((vItem: any) => ({
                  id: vItem.id,
                  title: vItem.snippet?.title || 'Video',
                  description: vItem.snippet?.description || '',
                  thumbnailUrl: vItem.snippet?.thumbnails?.high?.url || vItem.snippet?.thumbnails?.medium?.url,
                  channelId: vItem.snippet?.channelId || channelItem?.id || rawChannelId,
                  channelTitle: vItem.snippet?.channelTitle || channelItem?.title || 'Channel',
                  channelAvatarUrl: channelItem?.thumbnailUrl,
                  publishedAt: vItem.snippet?.publishedAt,
                  duration: vItem.contentDetails?.duration,
                  viewCount: vItem.statistics?.viewCount,
                  likeCount: vItem.statistics?.likeCount
                }));
              }
            }
          }
        }

        // Fallback to search if playlist didn't yield or order is viewCount
        if (channelVideos.length === 0) {
          const searchVidUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelItem?.id || rawChannelId)}&type=video&order=${order === 'viewCount' ? 'viewCount' : 'date'}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
          const vidRes = await fetch(searchVidUrl);
          if (vidRes.ok) {
            const vidJson = await vidRes.json() as any;
            nextPageToken = vidJson.nextPageToken;
            const vIds = (vidJson.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
            if (vIds.length > 0) {
              const vDetailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${vIds.join(',')}&key=${apiKey}`);
              if (vDetailsRes.ok) {
                const vDetailsJson = await vDetailsRes.json() as any;
                channelVideos = (vDetailsJson.items || []).map((vItem: any) => ({
                  id: vItem.id,
                  title: vItem.snippet?.title || 'Video',
                  description: vItem.snippet?.description || '',
                  thumbnailUrl: vItem.snippet?.thumbnails?.high?.url || vItem.snippet?.thumbnails?.medium?.url,
                  channelId: vItem.snippet?.channelId || channelItem?.id || rawChannelId,
                  channelTitle: vItem.snippet?.channelTitle || channelItem?.title || 'Channel',
                  channelAvatarUrl: channelItem?.thumbnailUrl,
                  publishedAt: vItem.snippet?.publishedAt,
                  duration: vItem.contentDetails?.duration,
                  viewCount: vItem.statistics?.viewCount,
                  likeCount: vItem.statistics?.likeCount
                }));
              }
            }
          }
        }

        if (!channelItem) {
          channelItem = {
            id: rawChannelId,
            title: rawChannelId.replace(/^channel_/, '').replace(/_/g, ' '),
            description: 'Welcome to the official channel page on StreamHub.',
            thumbnailUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${rawChannelId}`,
            subscriberCount: '1.5M',
            videoCount: '120'
          };
        }

        if (channelVideos.length === 0) {
          channelVideos = INITIAL_VIDEOS;
        }

        finalResponse = createJsonResponse({ channel: channelItem, data: channelVideos, nextPageToken, isCached: false }, 200, 300);
      } catch (err) {
        const fallbackChannel: ChannelItem = {
          id: rawChannelId,
          title: rawChannelId.replace(/^channel_/, '').replace(/_/g, ' '),
          description: 'Official channel on StreamHub.',
          thumbnailUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${rawChannelId}`,
          subscriberCount: '1.2M',
          videoCount: '85'
        };
        finalResponse = createJsonResponse({ channel: fallbackChannel, data: INITIAL_VIDEOS, isCached: true }, 200, 180);
      }
    } else {
      const fallbackChannel: ChannelItem = {
        id: rawChannelId,
        title: rawChannelId.replace(/^channel_/, '').replace(/_/g, ' '),
        description: 'Official channel on StreamHub.',
        thumbnailUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${rawChannelId}`,
        subscriberCount: '1.2M',
        videoCount: '85'
      };
      finalResponse = createJsonResponse({ channel: fallbackChannel, data: INITIAL_VIDEOS, apiKeyMissing: true, isCached: true }, 200, 300);
    }
  }
  // 9. Search Autocomplete Suggestions route
  else if (pathname === '/api/suggestions') {
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      finalResponse = createJsonResponse({ suggestions: [] }, 200, 300);
    } else {
      try {
        const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
        const sRes = await fetch(suggestUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (sRes.ok) {
          const sJson = await sRes.json() as any;
          const suggestions = Array.isArray(sJson[1]) ? (sJson[1] as string[]).slice(0, 10) : [];
          finalResponse = createJsonResponse({ suggestions }, 200, 300);
        } else {
          finalResponse = createJsonResponse({ suggestions: [] }, 200, 60);
        }
      } catch (err) {
        const sampleKeywords = [
          '4k nature relaxing video', 'wildlife documentary 4k', 'bbc earth nature',
          'national geographic wildlife', 'veritasium science', 'lofi hip hop radio',
          'deep ocean creatures', 'aurora borealis 4k', 'macro photography nature',
          'mountain climbing documentary', 'ambient study music', 'kurzgesagt science'
        ];
        const filtered = sampleKeywords.filter(k => k.toLowerCase().includes(q.toLowerCase()));
        finalResponse = createJsonResponse({ suggestions: filtered }, 200, 60);
      }
    }
  }
  // Default not found for unknown /api/*
  else {
    finalResponse = createJsonResponse({ error: 'NOT_FOUND', message: 'API route not found' }, 404);
  }

  // Write to memory cache
  if (finalResponse.ok && request.method === 'GET') {
    finalResponse.clone().text().then((body) => {
      setMemoryCached(url.pathname + url.search, body);
    }).catch(() => {});
  }

  // Write to Cloudflare Cache API
  try {
    // @ts-ignore Cloudflare runtime caches
    const cfCache = typeof caches !== 'undefined' ? caches.default : null;
    if (cfCache && request.method === 'GET' && finalResponse.ok) {
      const respToCache = finalResponse.clone();
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(cfCache.put(cacheKey, respToCache));
      } else {
        await cfCache.put(cacheKey, respToCache);
      }
    }
  } catch (e) {
    // Ignore cache put failure
  }

  return finalResponse;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/* requests to the Worker API handler
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    // Static assets fallback with SPA routing handled by Cloudflare Assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
