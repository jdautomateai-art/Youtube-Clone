import React, { useState } from 'react';
import { X, Lock, AlertCircle, ExternalLink, Copy, Check, Loader2, Globe } from 'lucide-react';
import { useAuth } from '../firebase/context';

export const AuthModalPrompt: React.FC = () => {
  const {
    showSignInModal,
    setShowSignInModal,
    signInPromptReason,
    isSigningIn,
    signInWithGoogle,
    authError,
    authErrorCode,
    currentHostname,
    firebaseProjectId,
    clearAuthError
  } = useAuth();

  const [copied, setCopied] = useState(false);

  if (!showSignInModal) return null;

  const isUnauthorizedDomain =
    authErrorCode === 'auth/unauthorized-domain' ||
    Boolean(authError && authError.toLowerCase().includes('unauthorized'));

  const isPopupBlocked =
    authErrorCode === 'auth/popup-blocked' ||
    Boolean(authError && authError.toLowerCase().includes('popup'));

  const handleCopy = () => {
    const textToCopy = currentHostname || (typeof window !== 'undefined' ? window.location.hostname : '');
    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const firebaseSettingsUrl = firebaseProjectId
    ? `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`
    : 'https://console.firebase.google.com/';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={() => {
        clearAuthError();
        setShowSignInModal(false);
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            clearAuthError();
            setShowSignInModal(false);
          }}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Lock size={24} />
        </div>

        <h3 id="auth-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
          Sign in to StreamHub
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
          {signInPromptReason}
        </p>

        {/* Specialized Domain Authorization Guidance */}
        {isUnauthorizedDomain && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-start gap-2.5 mb-2.5">
              <Globe className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold text-sm text-amber-900 dark:text-amber-100">
                  Firebase Domain Authorization Required
                </p>
                <p className="text-amber-800 dark:text-amber-300 mt-1 leading-normal">
                  To allow Google Sign-In from this deployed domain, add it to your Firebase Authorized Domains list (takes 10 seconds):
                </p>
              </div>
            </div>

            {/* Hostname with 1-click copy */}
            <div className="my-3 flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-neutral-950/80 rounded-lg border border-amber-200/80 dark:border-amber-900/40">
              <code className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate select-all">
                {currentHostname || 'youtube-clone.jd-automate-ai.workers.dev'}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Domain'}
              </button>
            </div>

            {/* Steps list */}
            <ol className="list-decimal list-inside space-y-1 text-amber-800/90 dark:text-amber-300/90 mb-3 pl-1">
              <li>Click <strong>Open Firebase Settings</strong> below</li>
              <li>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong></li>
              <li>Paste the domain and click <strong>Done</strong></li>
            </ol>

            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors text-xs"
            >
              <ExternalLink size={14} />
              Open Firebase Console Settings
            </a>
          </div>
        )}

        {/* Generic or Popup-blocked error notices */}
        {authError && !isUnauthorizedDomain && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Sign-in Notice</p>
              <p className="leading-relaxed">{authError}</p>
              {isPopupBlocked && (
                <div className="mt-2 text-neutral-600 dark:text-neutral-400">
                  Tip: Use the "Sign in with Redirect" button below to bypass browser popup blockers.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Primary Popup Sign In Button */}
        <button
          onClick={() => signInWithGoogle('popup')}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium text-neutral-800 dark:text-neutral-200 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSigningIn ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Secondary Redirect Sign In Option (Fallback) */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => signInWithGoogle('redirect')}
            disabled={isSigningIn}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Popup not opening? Try Sign In with Redirect
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
          Sync your personal library, liked videos, and comments securely in Cloud Firestore.
        </p>
      </div>
    </div>
  );
};

