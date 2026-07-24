import React, { useState, useEffect } from 'react';
import { GraduationCap, Moon, Sun, LogOut, Shield, Clock, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { NotificationBell } from './NotificationBell';
import { ROLE_LABELS } from '../../constants/roles';

interface NavbarProps {
  onToggleMobileDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileDrawer }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const userRole = userProfile?.role || 'STUDENT';
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  return (
    <header className="sticky top-0 z-30 bg-[#0B426E] text-white border-b border-white/10 px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between shadow-md">
      {/* Left Brand Header & Mobile Hamburger */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleMobileDrawer}
          className="md:hidden p-1.5 rounded-md hover:bg-white/10 text-white transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <div className="h-8 w-8 rounded-md bg-white text-[#0B426E] flex items-center justify-center font-bold shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold text-xs sm:text-sm text-white tracking-tight leading-tight">
              Institutional Movement Pass Portal
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-medium bg-white/15 text-white border border-white/20 px-1.5 py-0.5 rounded-md">
              v2.0
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-white/80">Francis Xavier Engineering College</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Digital Clock */}
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-white/90 bg-white/10 px-2.5 py-1 rounded-md border border-white/20">
          <Clock className="w-3.5 h-3.5 text-white/70" />
          <span>{currentTime || '12:00:00 PM'}</span>
        </div>

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
              <div className="w-7 h-7 rounded-md bg-white text-[#0B426E] font-bold flex items-center justify-center text-xs">
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
