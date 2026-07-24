import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Loader } from '../../components/common/Loader';

export const Login: React.FC = () => {
  const { loginWithGoogle, userProfile, loading: authLoading, error: authError } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A] flex flex-col justify-center items-center p-4 relative text-left">
      {/* Theme Switcher Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer shadow-xs transition-colors"
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

      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-8 rounded-lg shadow-md">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {/* Institutional High-Contrast Branding Container */}
          <div className="mx-auto bg-white p-2 rounded-md border border-gray-200 shadow-xs flex items-center justify-center w-40 h-16">
            <img
              src="https://www.francisxavier.ac.in/cs-content/themes/fxec/images/logo.png"
              alt="Francis Xavier Engineering College Logo"
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Francis Xavier Engineering College
            </h2>
            <p className="text-xs text-[#0B426E] dark:text-blue-400 font-semibold mt-0.5">
              Institutional Movement Pass Management System v2.0
            </p>
          </div>
        </div>

        {/* Access Denied Banner */}
        {(accessDeniedError || authError) && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md space-y-1 text-red-700 dark:text-red-300">
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
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Sign in using your official institutional Google Workspace account.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#0B426E] hover:bg-[#083356] text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In with Google Account'}</span>
          </button>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>Role-Based Institutional Access Control</span>
        </div>
      </div>
    </div>
  );
};
