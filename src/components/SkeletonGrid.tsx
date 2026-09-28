import React from 'react';

interface SkeletonGridProps {
  count?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-video w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-full" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md w-2/3" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
