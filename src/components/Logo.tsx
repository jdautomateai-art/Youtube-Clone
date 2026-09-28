import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-11 h-11'
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl'
  }[size];

  return (
    <div className="flex items-center gap-2 select-none group cursor-pointer">
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 ${iconDimensions}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Original StreamHub double-arc wave stream symbol */}
          <path
            d="M7 11C7 8.79086 8.79086 7 11 7H14C17.866 7 21 10.134 21 14C21 17.866 17.866 21 14 21H7V11Z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M9 16C9 12.134 12.134 9 16 9C19.866 9 23 12.134 23 16C23 19.866 19.866 23 16 23C13.5 23 11.3 21.7 10 19.8"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="3.5" fill="white" />
          <path
            d="M21 7L24 10L21 13"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span className={`font-black tracking-tight flex items-baseline font-sans text-neutral-900 dark:text-neutral-100 ${textSizes}`}>
          <span>Stream</span>
          <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent ml-0.5 font-extrabold">Hub</span>
        </span>
      )}
    </div>
  );
};
