import React, { useEffect, useState } from 'react';
import { VideoItem } from '../types';
import { fetchVideosFeed } from '../services/youtubeApi';
import { VideoCard } from '../components/VideoCard';
import { CategoryChips } from '../components/CategoryChips';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { useNavigation } from '../context/NavigationContext';
import { Info, RotateCw } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { route, openCategory } = useNavigation();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [showKeyNotice, setShowKeyNotice] = useState(false);

  const selectedCategory = route.category || 'All';

  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchVideosFeed(selectedCategory);
        if (isMounted) {
          setVideos(res.data);
          setNextPageToken(res.nextPageToken);
          if (res.apiKeyMissing) {
            setShowKeyNotice(true);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Unable to load video feed. Please check your connection and try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFeed();
    return () => { isMounted = false; };
  }, [selectedCategory]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchVideosFeed(selectedCategory, nextPageToken);
      if (res.data && res.data.length > 0) {
        // Filter duplicates
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
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Category Chips Bar */}
      <CategoryChips
        selectedCategory={selectedCategory}
        onSelectCategory={openCategory}
      />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* API Key info banner (friendly, non-intrusive) */}
        {showKeyNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 flex items-start gap-3">
            <Info size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                Live YouTube API integration active:
              </span>{' '}
              Curated embeddable videos are streaming. To enable unlimited live searches and YouTube feeds from your Google Cloud project, add your <code className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono">YOUTUBE_API_KEY</code> to your environment secrets.
            </div>
            <button
              onClick={() => setShowKeyNotice(false)}
              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 shrink-0 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && <SkeletonGrid count={8} />}

        {/* Error state */}
        {error && !loading && (
          <div className="py-16 text-center">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <RotateCw size={16} />
              Retry Feed
            </button>
          </div>
        )}

        {/* Video Cards Grid */}
        {!loading && !error && videos.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Load More Button */}
            <div className="mt-12 mb-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RotateCw size={16} className="animate-spin text-indigo-500" />
                    <span>Loading more videos...</span>
                  </>
                ) : (
                  <span>Load more videos</span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && !error && videos.length === 0 && (
          <div className="py-20 text-center text-neutral-500 dark:text-neutral-400">
            <p className="text-base font-semibold">No videos found for &quot;{selectedCategory}&quot;</p>
            <p className="text-xs mt-1">Try selecting another category or check back shortly.</p>
          </div>
        )}
      </main>
    </div>
  );
};
