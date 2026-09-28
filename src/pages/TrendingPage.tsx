import React, { useEffect, useState } from 'react';
import { Compass, Flame } from 'lucide-react';
import { VideoItem } from '../types';
import { fetchTrendingFeed } from '../services/youtubeApi';
import { VideoCard } from '../components/VideoCard';
import { SkeletonGrid } from '../components/SkeletonGrid';

const TRENDING_TABS = ['Now', 'Gaming', 'Tech', 'Education', 'Movies'] as const;

export const TrendingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Now');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadTrending() {
      setLoading(true);
      try {
        const categoryParam = activeTab === 'Now' ? 'All' : activeTab;
        const res = await fetchTrendingFeed(categoryParam);
        if (isMounted) {
          setVideos(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTrending();
    return () => { isMounted = false; };
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
          <Flame size={26} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            Trending Videos
          </h1>
          <p className="text-xs text-neutral-500">Most popular content streaming across the web</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-8 overflow-x-auto no-scrollbar">
        {TRENDING_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <SkeletonGrid count={8} />}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};
