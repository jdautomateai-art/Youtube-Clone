import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export const OpenInNewTabButton: React.FC = () => {
  // Check if running inside an iframe (such as AI Studio preview)
  const [isInsideIframe, setIsInsideIframe] = useState(() => {
    try {
      return window.self !== window.top || Boolean((window.location as any)?.ancestorOrigins?.length);
    } catch (e) {
      return true;
    }
  });

  const [currentUrl, setCurrentUrl] = useState(() => {
    return typeof window !== 'undefined' ? window.location.href : '';
  });

  useEffect(() => {
    try {
      const inside = window.self !== window.top || Boolean((window.location as any)?.ancestorOrigins?.length);
      setIsInsideIframe(inside);
    } catch (e) {
      setIsInsideIframe(true);
    }

    const handleLocationChange = () => {
      setCurrentUrl(window.location.href);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // When loaded in a normal standalone browser tab/window, hide the button per Section L
  if (!isInsideIframe) {
    return null;
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Ensure currentUrl is fresh
    const targetUrl = window.location.href;
    setCurrentUrl(targetUrl);

    // Try window.open first; if blocked or constrained, anchor default behavior will handle it
    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        // Successfully opened via window.open
        e.preventDefault();
      }
    } catch (err) {
      // Let standard <a target="_blank"> native navigation proceed
    }
  };

  return (
    <a
      href={currentUrl || window.location.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleLinkClick}
      title="Open StreamHub in a new browser tab for full-screen experience and Google Sign-In"
      aria-label="Open in new tab"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-sm transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 no-underline shrink-0"
    >
      <ExternalLink size={14} className="stroke-[2.5] shrink-0" />
      <span className="whitespace-nowrap font-medium">Open in new tab</span>
    </a>
  );
};
