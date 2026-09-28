import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 py-8 px-4 text-neutral-500 dark:text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-500 shrink-0" />
          <p>
            <strong className="text-neutral-700 dark:text-neutral-300">StreamHub</strong> is an independent project. Videos are played exclusively through YouTube&apos;s official embedded player.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>YouTube Terms of Service</span>
            <ExternalLink size={12} />
          </a>
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>Google Privacy Policy</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
};
