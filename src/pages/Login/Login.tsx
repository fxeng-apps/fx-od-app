import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Sun, Moon, Download, Smartphone, CheckCircle2, Share2, PlusSquare, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Loader } from '../../components/common/Loader';

export const Login: React.FC = () => {
  const { loginWithGoogle, userProfile, loading: authLoading, error: authError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isInstalled, isIOS, showIOSPrompt, setShowIOSPrompt, installFeedback, installApp } = usePWAInstall();
  const [loading, setLoading] = useState(false);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [userProfile, authLoading, navigate]);

  if (authLoading) {
    return <Loader label="Restoring institutional session..." />;
  }

  const handleSignIn = async () => {
    setLoading(true);
    setAccessDeniedError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication Failed';
      setAccessDeniedError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A] flex flex-col justify-center items-center p-4 sm:p-6 relative text-left select-none">
      {/* Theme Switcher Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-xs transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
              <span>Dark</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-md w-full space-y-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-8 rounded-2xl shadow-xl transition-all">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {/* Institutional High-Contrast Branding Container */}
          <div className="mx-auto bg-white p-2 rounded-xl border border-gray-200 shadow-xs flex items-center justify-center w-40 h-16">
            <img
              src="https://www.francisxavier.ac.in/cs-content/themes/fxec/images/logo.png"
              alt="Francis Xavier Engineering College Logo"
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Francis Xavier Engineering College
            </h2>
            <p className="text-xs text-[#0B426E] dark:text-blue-400 font-semibold mt-0.5">
              Institutional Movement Pass Management System v2.0
            </p>
          </div>
        </div>

        {/* Access Denied Banner */}
        {(accessDeniedError || authError) && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-1 text-red-700 dark:text-red-300 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <Lock className="w-4 h-4 text-red-600" />
              <span>Institutional Authorization Error</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
              {accessDeniedError || authError}
            </p>
          </div>
        )}

        {/* Login Form Action */}
        <div className="space-y-3 pt-1">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Sign in using your official institutional Google Workspace account.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#0B426E] hover:bg-[#083356] text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In with Google Account'}</span>
          </button>
        </div>

        {/* Install Mobile App Section */}
        <div className="pt-2">
          {isInstalled ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>App Installed & Ready on Home Screen</span>
            </div>
          ) : (
            <div className="p-3.5 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-700/40 dark:to-gray-700/20 border border-blue-200/80 dark:border-gray-600 rounded-xl space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B426E] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Install FX Movement App</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                    Native app experience with instant 1-tap access and offline readiness.
                  </p>
                </div>
              </div>

              <button
                onClick={installApp}
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#0B426E] dark:text-blue-300 border border-[#0B426E]/30 dark:border-blue-500/30 font-semibold text-xs py-2 px-3 rounded-lg shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App on Phone</span>
              </button>

              {installFeedback && (
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-[#0B426E] dark:text-blue-300 text-center animate-in fade-in duration-200">
                  {installFeedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>Role-Based Institutional Access Control</span>
        </div>
      </div>

      {/* iOS Safari 'Add to Home Screen' Instructions Sheet (ONLY for iOS Safari devices) */}
      {showIOSPrompt && isIOS && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-250">
            {/* Sheet Handle for Mobile */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0B426E] text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Add to your Home Screen in 3 steps</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSPrompt(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                <div className="w-6 h-6 rounded-full bg-[#0B426E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    Tap the Share button <Share2 className="w-4 h-4 text-blue-500 inline" />
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Located in the Safari toolbar at the bottom or top of your screen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                <div className="w-6 h-6 rounded-full bg-[#0B426E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    Select "Add to Home Screen" <PlusSquare className="w-4 h-4 text-emerald-500 inline" />
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Scroll down through the share options menu and tap "Add to Home Screen".
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                <div className="w-6 h-6 rounded-full bg-[#0B426E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Tap "Add" at the top right
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    The app icon will now appear on your iPhone home screen just like an App Store app!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full bg-[#0B426E] hover:bg-[#083356] text-white font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
