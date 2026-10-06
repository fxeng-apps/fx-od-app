import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  FileText,
  History,
  User,
  Users,
  CheckCheck,
  PieChart,
  UserCheck,
  ShieldCheck,
  Settings,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isMobileDrawer = false }) => {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'STUDENT';

  const getRoleNavLinks = () => {
    switch (role) {
      case 'STUDENT':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/student/requests', label: 'My Movement Passes', icon: FileText },
          { to: '/student/apply', label: 'Apply Pass', icon: Send },
          { to: '/student/notifications', label: 'Notifications', icon: Bell },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'MENTOR':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/mentor/students', label: 'Students Under Me', icon: Users },
          { to: '/mentor/pending', label: 'Pending Approvals', icon: FileText },
          { to: '/mentor/history', label: 'Approval History', icon: History },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'HOD':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/hod/students', label: 'Department Students', icon: Users },
          { to: '/hod/pending', label: 'Pending Approvals', icon: CheckCheck },
          { to: '/hod/history', label: 'Approval History', icon: History },
          { to: '/analytics', label: 'Department Analytics', icon: PieChart },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'SUPER_ADMIN':
      case 'PRINCIPAL':
      case 'ACADEMIC_COORDINATOR':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/analytics', label: 'Analytics', icon: PieChart },
          { to: '/admin/history', label: 'Historical Passes', icon: History },
          { to: '/admin/users', label: 'User Management', icon: UserCheck },
          { to: '/admin/audit', label: 'Audit Logs', icon: ShieldCheck },
          { to: '/profile', label: 'Settings', icon: Settings },
        ];
      default:
        return [{ to: '/student/requests', label: 'My Movement Passes', icon: FileText }];
    }
  };

  const navLinks = getRoleNavLinks();

  const containerClasses = isMobileDrawer
    ? 'w-full h-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex flex-col justify-between overflow-y-auto select-none transition-colors'
    : 'w-64 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 h-full flex flex-col justify-between hidden md:flex shrink-0 border-r border-gray-300 dark:border-gray-800 select-none shadow-xs transition-colors z-20';

  return (
    <aside className={containerClasses}>
      {/* Top College Logo Branding (Exact h-14 to match Navbar header alignment) */}
      <div className="h-14 min-h-[56px] border-b border-gray-300 dark:border-gray-800 flex items-center px-4 shrink-0 bg-white dark:bg-gray-900">
        <img
          src="/logo.png"
          alt="Francis Xavier Engineering College Logo"
          className="h-9 w-auto max-w-[210px] object-contain"
          onError={(e) => {
            e.currentTarget.src = '/college-crest.png';
          }}
        />
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {/* Section Header */}
        <div className="px-2 py-0.5">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Portal Navigation
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={`${link.to}-${idx}`}
                to={link.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2f5da8]/15 text-[#2f5da8] dark:bg-[#2f5da8]/25 dark:text-blue-300 font-semibold border-l-4 border-[#2f5da8]'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-current" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Institutional Footer */}
      <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className="p-2.5 bg-gray-100 dark:bg-gray-800/60 rounded-xl border border-gray-300/80 dark:border-gray-700/60 text-center space-y-0.5">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Francis Xavier Engineering College</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Movement Pass Portal v2.0</p>
        </div>
      </div>
    </aside>
  );
};
