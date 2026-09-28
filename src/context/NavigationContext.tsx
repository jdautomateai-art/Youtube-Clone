import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface RouteState {
  path: string;
  params: Record<string, string>;
  searchQuery: string;
  category: string;
  videoId?: string;
}

interface NavigationContextType {
  route: RouteState;
  navigate: (url: string) => void;
  openVideo: (videoId: string) => void;
  openSearch: (query: string) => void;
  openCategory: (cat: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function parseCurrentRoute(): RouteState {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'All';
  const vParam = searchParams.get('v');

  let videoId: string | undefined = undefined;
  if (pathname.startsWith('/watch/')) {
    videoId = pathname.replace('/watch/', '').split('/')[0].split('?')[0];
  } else if (pathname === '/watch' && vParam) {
    videoId = vParam;
  }

  return {
    path: pathname || '/',
    params: {},
    searchQuery: q,
    category,
    videoId: videoId || undefined
  };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);

  const updateRoute = useCallback(() => {
    setRoute(parseCurrentRoute());
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      updateRoute();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateRoute]);

  const navigate = useCallback((url: string) => {
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({}, '', url);
      updateRoute();
    }
  }, [updateRoute]);

  const openVideo = useCallback((videoId: string) => {
    navigate(`/watch/${videoId}`);
  }, [navigate]);

  const openSearch = useCallback((query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  const openCategory = useCallback((cat: string) => {
    if (cat === 'All') {
      navigate('/');
    } else {
      navigate(`/?category=${encodeURIComponent(cat)}`);
    }
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ route, navigate, openVideo, openSearch, openCategory }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};
