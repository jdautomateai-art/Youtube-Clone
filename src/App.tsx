import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './firebase/context';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { AuthModalPrompt } from './components/AuthModalPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { ShortsPage } from './pages/ShortsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { LibraryPage } from './pages/LibraryPage';
import { HistoryPage } from './pages/HistoryPage';
import { LikedVideosPage } from './pages/LikedVideosPage';
import { SearchPage } from './pages/SearchPage';
import { TrendingPage } from './pages/TrendingPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppContent: React.FC = () => {
  const { route } = useNavigation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isShortsPage = route.path === '/shorts';
  const isWatchPage = route.path.startsWith('/watch');

  // Render current active page
  const renderCurrentPage = () => {
    const path = route.path;

    if (path === '/') return <HomePage />;
    if (path.startsWith('/watch')) return <WatchPage />;
    if (path === '/shorts') return <ShortsPage />;
    if (path === '/subscriptions') return <SubscriptionsPage />;
    if (path === '/library') return <LibraryPage />;
    if (path === '/history') return <HistoryPage />;
    if (path === '/liked') return <LikedVideosPage />;
    if (path.startsWith('/search')) return <SearchPage />;
    if (path === '/trending') return <TrendingPage />;
    if (path === '/profile') return <ProfilePage />;

    return <NotFoundPage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Skip to Main Content Link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Sticky Header */}
      <Header
        onToggleSidebar={() => {
          setSidebarExpanded(!sidebarExpanded);
          setMobileDrawerOpen(!mobileDrawerOpen);
        }}
      />

      {/* Main Container */}
      <div className="flex-1 flex w-full">
        {/* Sidebar (only on non-watch pages on desktop for maximized watch space, or everywhere) */}
        {!isWatchPage && !isShortsPage && (
          <Sidebar
            isExpanded={sidebarExpanded}
            mobileDrawerOpen={mobileDrawerOpen}
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Watch & Shorts still need mobile slide drawer support */}
        {(isWatchPage || isShortsPage) && (
          <Sidebar
            isExpanded={false}
            mobileDrawerOpen={mobileDrawerOpen}
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Page Content wrapped in Error Boundary */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <ErrorBoundary>
            {renderCurrentPage()}
          </ErrorBoundary>
        </div>
      </div>

      {/* Footer (omitted on full-height Shorts view) */}
      {!isShortsPage && <Footer />}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Global Authentication Modal Prompt */}
      <AuthModalPrompt />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
