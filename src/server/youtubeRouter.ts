import { Router, Request, Response } from 'express';
import { INITIAL_VIDEOS, INITIAL_SHORTS } from '../data/mockYouTubeData';

const router = Router();
const memoryCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 mins server-side cache

function getFromCache(key: string) {
  const item = memoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}

function setToCache(key: string, data: any) {
  memoryCache.set(key, { data, expiry: Date.now() + CACHE_DURATION_MS });
}

// Content filter to remove music and girl content per user specification
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

// Category mappings to YouTube videoCategoryIds or search terms
const CATEGORY_TERMS: Record<string, string> = {
  Gaming: 'gameplay gaming walkthrough',
  Tech: 'technology science engineering hardware reviews',
  News: 'breaking news today world discovery',
  Education: 'educational documentary science physics history',
  Sports: 'sports highlights athletics match',
  Movies: 'animation film cinema cgi 4k',
  Cooking: 'culinary food cooking masterclass recipe',
  Travel: 'travel nature documentary 4k landscape wildlife',
  Comedy: 'comedy sketch animated funny'
};

router.get('/status', (req: Request, res: Response) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  res.json({
    hasApiKey: Boolean(apiKey && apiKey !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && apiKey.length > 10),
    cachedVideosCount: INITIAL_VIDEOS.length
  });
});

router.get('/feed', async (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'All';
  const pageToken = req.query.pageToken as string | undefined;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const cacheKey = `feed_${category}_${pageToken || 'start'}`;

  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json({ ...cached, isCached: true });
  }

  if (apiKey && apiKey !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && apiKey.length > 10) {
    try {
      let url = '';
      if (category === 'All') {
        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=24&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      } else {
        const queryTerm = CATEGORY_TERMS[category] || category;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=24&q=${encodeURIComponent(queryTerm)}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      }

      const ytRes = await fetch(url);
      if (ytRes.ok) {
        const json = await ytRes.json();
        let items: any[] = [];

        if (category === 'All') {
          items = (json.items || []).map((item: any) => ({
            id: item.id,
            title: item.snippet?.title || 'Video',
            description: item.snippet?.description || '',
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            channelId: item.snippet?.channelId,
            channelTitle: item.snippet?.channelTitle,
            publishedAt: item.snippet?.publishedAt,
            duration: item.contentDetails?.duration,
            viewCount: item.statistics?.viewCount,
            likeCount: item.statistics?.likeCount,
            category: 'All'
          }));
        } else {
          // search result format -> needs video ids
          const videoIds = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
          if (videoIds.length > 0) {
            const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
            if (detailsRes.ok) {
              const detailsJson = await detailsRes.json();
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
                likeCount: item.statistics?.likeCount,
                category
              }));
            }
          }
        }

        if (items.length > 0) {
          const allowedItems = items.filter(isAllowedContent);
          const payload = { data: allowedItems.length > 0 ? allowedItems : items, nextPageToken: json.nextPageToken, isCached: false };
          setToCache(cacheKey, payload);
          return res.json(payload);
        }
      }
    } catch (err) {
      console.warn('YouTube feed fetch error, serving fallback:', err);
    }
  }

  // Fallback to rich curated videos
  let filtered = [...INITIAL_VIDEOS];
  if (category !== 'All') {
    const term = category.toLowerCase();
    const matched = INITIAL_VIDEOS.filter((v) => v.category?.toLowerCase() === term);
    if (matched.length > 0) filtered = matched;
  }
  const fallbackPayload = {
    data: filtered,
    apiKeyMissing: !apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY',
    isCached: true
  };
  setToCache(cacheKey, fallbackPayload);
  return res.json(fallbackPayload);
});

router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const pageToken = req.query.pageToken as string | undefined;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const cacheKey = `search_${query}_${pageToken || 'start'}`;

  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json({ ...cached, isCached: true });
  }

  if (apiKey && apiKey !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && apiKey.length > 10 && query) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=24&q=${encodeURIComponent(query)}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const ytRes = await fetch(url);
      if (ytRes.ok) {
        const json = await ytRes.json();
        const videoIds = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
        if (videoIds.length > 0) {
          const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
          if (detailsRes.ok) {
            const detailsJson = await detailsRes.json();
            const items = (detailsJson.items || []).map((item: any) => ({
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

            const allowedItems = items.filter(isAllowedContent);
            const payload = { data: allowedItems.length > 0 ? allowedItems : items, nextPageToken: json.nextPageToken, isCached: false };
            setToCache(cacheKey, payload);
            return res.json(payload);
          }
        }
      }
    } catch (err) {
      console.warn('YouTube search API error, serving fallback:', err);
    }
  }

  // Fallback search in curated videos
  const qLower = query.toLowerCase();
  const matched = INITIAL_VIDEOS.filter(
    (v) => v.title.toLowerCase().includes(qLower) ||
           v.description.toLowerCase().includes(qLower) ||
           v.channelTitle.toLowerCase().includes(qLower)
  );

  const fallbackData = matched.length > 0 ? matched : INITIAL_VIDEOS;
  const fallbackPayload = {
    data: fallbackData,
    apiKeyMissing: !apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY',
    isCached: true
  };
  setToCache(cacheKey, fallbackPayload);
  return res.json(fallbackPayload);
});

router.get('/video/:id', async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const cacheKey = `video_${videoId}`;

  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json({ data: cached, isCached: true });
  }

  if (apiKey && apiKey !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && apiKey.length > 10) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
      const ytRes = await fetch(url);
      if (ytRes.ok) {
        const json = await ytRes.json();
        const item = json.items?.[0];
        if (item) {
          const video = {
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
          };
          setToCache(cacheKey, video);
          return res.json({ data: video, isCached: false });
        }
      }
    } catch (err) {
      console.warn('YouTube video details error:', err);
    }
  }

  const found = INITIAL_VIDEOS.find((v) => v.id === videoId) || INITIAL_SHORTS.find((v) => v.id === videoId);
  if (found) {
    setToCache(cacheKey, found);
    return res.json({ data: found, isCached: true });
  }

  const generated = {
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
  setToCache(cacheKey, generated);
  return res.json({ data: generated, isCached: true });
});

router.get('/related/:id', async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const filtered = INITIAL_VIDEOS.filter((v) => v.id !== videoId);
  return res.json({ data: filtered, isCached: true });
});

router.get('/shorts', async (req: Request, res: Response) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey && apiKey !== 'YOUR_YOUTUBE_DATA_API_V3_KEY' && apiKey.length > 10) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&videoEmbeddable=true&maxResults=15&q=%23shorts+robotics+nature+science&key=${apiKey}`;
      const ytRes = await fetch(url);
      if (ytRes.ok) {
        const json = await ytRes.json();
        const videoIds = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
        if (videoIds.length > 0) {
          const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
          if (detailsRes.ok) {
            const detailsJson = await detailsRes.json();
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
            if (allowed.length > 0) {
              return res.json({ data: allowed, isCached: false });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Shorts API error, fallback:', err);
    }
  }
  return res.json({ data: INITIAL_SHORTS, isCached: true });
});

export default router;
