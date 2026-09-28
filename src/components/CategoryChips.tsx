import React, { useRef } from 'react';
import { CATEGORIES } from '../data/mockYouTubeData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative sticky top-14 sm:top-16 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs py-2.5 border-b border-neutral-100 dark:border-neutral-800 transition-colors">
      <div className="flex items-center max-w-7xl mx-auto px-4 relative group">
        {/* Left scroll arrow button */}
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll categories left"
          className="hidden md:flex absolute left-2 z-10 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Chips row */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right scroll arrow button */}
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll categories right"
          className="hidden md:flex absolute right-2 z-10 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
