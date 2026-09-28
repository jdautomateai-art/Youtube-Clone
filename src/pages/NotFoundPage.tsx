import React from 'react';
import { Compass, Home } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const NotFoundPage: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[70vh]">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <Compass size={36} />
      </div>
      <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
        404
      </h1>
      <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-2">
        Page Not Found
      </h2>
      <p className="text-sm text-neutral-500 max-w-sm mb-6">
        The video or page you are looking for doesn’t exist or may have been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all cursor-pointer"
      >
        <Home size={16} />
        <span>Return to Home</span>
      </button>
    </div>
  );
};
