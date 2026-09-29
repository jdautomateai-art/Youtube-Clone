import React, { useState } from 'react';
import { VideoItem } from '../types';
import { formatTimeAgo, formatViewCount, parseYouTubeDuration } from '../services/youtubeApi';
import { useNavigation } from '../context/NavigationContext';

interface VideoCardProps {
  video: VideoItem;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const { openVideo, openChannel } = useNavigation();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const durationStr = parseYouTubeDuration(video.duration);
  const viewsStr = formatViewCount(video.viewCount);
  const timeStr = formatTimeAgo(video.publishedAt);

  const thumbnail = imgError
    ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
    : video.thumbnailUrl;

  const avatar = video.channelAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${video.channelId || video.channelTitle}`;

  const handleChannelClick = (e: React.MouseEvent) => {
    if (video.channelId) {
      e.stopPropagation();
      openChannel(video.channelId);
    }
  };

  return (
    <article
      onClick={() => openVideo(video.id)}
      className="group flex flex-col cursor-pointer transition-all duration-200"
    >
      {/* 16:9 Thumbnail Container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        <img
          src={thumbnail}
          alt={video.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Duration badge */}
        {durationStr && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-3xs font-semibold tracking-wide backdrop-blur-xs">
            {durationStr}
          </span>
        )}
      </div>

      {/* Meta row: Avatar & Details */}
      <div className="flex gap-3 mt-3 items-start">
        <img
          src={avatar}
          alt={video.channelTitle}
          loading="lazy"
          onClick={handleChannelClick}
          className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 bg-neutral-200 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-800 hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <h2
            title={video.title}
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
          >
            {video.title}
          </h2>

          <p
            onClick={handleChannelClick}
            className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            {video.channelTitle}
          </p>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
            <span>{viewsStr} views</span>
            <span>•</span>
            <span>{timeStr}</span>
          </p>
        </div>
      </div>
    </article>
  );
};
