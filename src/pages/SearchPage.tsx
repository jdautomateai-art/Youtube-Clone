import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { searchYouTubeVideos } from '../services/youtubeApi';
import { VideoItem } from '../types';
import { VideoCard } from '../components/VideoCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { Search, RotateCw } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { route } = useNavigation();
  const query = route.searchQuery || '';

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function performSearch() {
      if (!query.trim()) {
        setVideos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchYouTubeVideos(query);
        if (isMounted) {
          setVideos(res.data);
          setNextPageToken(res.nextPageToken);
        }
      } catch (err) {
        if (isMounted) setError('Search query failed. Please retry.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    performSearch();
    return () => { isMounted = false; };
  }, [query]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await searchYouTubeVideos(query, nextPageToken);
      if (res.data && res.data.length > 0) {
        const existingIds = new Set(videos.map((v) => v.id));
        const newOnes = res.data.filter((v) => !existingIds.has(v.id));
        setVideos((prev) => [...prev, ...(newOnes.length > 0 ? newOnes : res.data)]);
        setNextPageToken(res.nextPageToken);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
      <div className="mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <Search size={22} className="text-indigo-500" />
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Results for &ldquo;{query}&rdquo;
        </h1>
      </div>

      {loading && <SkeletonGrid count={8} />}

      {!loading && error && (
        <div className="py-20 text-center text-neutral-500">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          <div className="mt-12 mb-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <RotateCw size={16} className="animate-spin text-indigo-500" />
                  <span>Loading more...</span>
                </>
              ) : (
                <span>Load more results</span>
              )}
            </button>
          </div>
        </>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="py-24 text-center text-neutral-500">
          <p className="text-base font-semibold">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs mt-1">Try different keywords or check spelling.</p>
        </div>
      )}
    </div>
  );
};
