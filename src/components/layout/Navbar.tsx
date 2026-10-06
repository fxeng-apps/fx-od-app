import React, { useState, useEffect } from 'react';
import { Menu, Moon, Sun, LogOut, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { NotificationBell } from './NotificationBell';
import { ROLE_LABELS } from '../../constants/roles';

interface NavbarProps {
  onToggleMobileDrawer?: () => void;
}

const LiveClock: React.FC = React.memo(() => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-white/90 bg-white/10 px-2.5 py-1 rounded-md border border-white/20">
      <Clock className="w-3.5 h-3.5 text-white/70" />
      <span>{currentTime || '12:00:00 PM'}</span>
    </div>
  );
});

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileDrawer }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const userRole = userProfile?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  return (
    <header className="sticky top-0 z-30 h-14 min-h-[56px] bg-[#2f5da8] dark:bg-[#152a4e] text-white border-b border-black/10 dark:border-gray-800 px-3 sm:px-4 lg:px-6 flex items-center justify-between shadow-xs select-none transition-colors">
      {/* Left Brand Header */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileDrawer && (
          <button
            onClick={onToggleMobileDrawer}
            className="md:hidden p-1.5 -ml-1 text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            title="Toggle Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="md:hidden h-8 w-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
          <img src="/college-crest.png" alt="FXEC Crest" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
              <span className="sm:hidden">FX Movement Pass</span>
              <span className="hidden sm:inline">Institutional Movement Pass Portal</span>
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-medium bg-white/20 text-white border border-white/25 px-1.5 py-0.5 rounded-md">
              v2.0
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-white/85 truncate font-normal">Francis Xavier Engineering College</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Digital Clock */}
        <LiveClock />

        {/* Theme Switch */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 border border-white/20 text-white hover:bg-white/20 cursor-pointer transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Read-Only Role Badge */}
        {userProfile && (
          <div className="hidden sm:flex items-center gap-1.5 bg-white/10 border border-white/30 rounded-md px-2.5 py-1 text-xs font-medium text-white">
            <Shield className="w-3.5 h-3.5 text-white/80" />
            <span className="uppercase font-semibold tracking-wider text-[11px]">{roleLabel}</span>
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile Chip */}
        {userProfile && (
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-white/20">
            <div className="hidden xl:block text-right">
              <p className="text-xs font-semibold text-white leading-tight">
                {userProfile.displayName}
              </p>
              <p className="text-[10px] text-white/80 font-medium">
                {userProfile.department}
              </p>
            </div>
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-7 h-7 rounded-md border border-white/30 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-white text-[#2f5da8] font-bold flex items-center justify-center text-xs shadow-xs">
                {userProfile.displayName.charAt(0)}
              </div>
            )}
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-md cursor-pointer transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
