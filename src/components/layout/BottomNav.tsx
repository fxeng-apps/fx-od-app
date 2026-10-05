import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Plus,
  History,
  User,
  Users,
  CheckCheck,
  PieChart,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMentorPendingRequests, useHODPendingRequests } from '../../hooks/useODRequests';

interface TabItem {
  to: string;
  label: string;
  icon: React.ElementType;
  isCenterAction?: boolean;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { userProfile, activeRole } = useAuth();
  const role = activeRole || userProfile?.role || 'STUDENT';

  // Live pending counts for Faculty / HOD badges
  const isMentor = role === 'MENTOR';
  const isHOD = role === 'HOD';

  const { data: mentorPending = [] } = useMentorPendingRequests(
    isMentor ? userProfile?.uid : undefined,
    isMentor ? userProfile?.email : undefined
  );

  const { data: hodPending = [] } = useHODPendingRequests(
    isHOD ? userProfile?.department : undefined
  );

  const mentorPendingCount = isMentor ? mentorPending.length : 0;
  const hodPendingCount = isHOD ? hodPending.length : 0;

  const getRoleTabs = (): TabItem[] => {
    switch (role) {
      case 'STUDENT':
        return [
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { to: '/student/requests', label: 'Passes', icon: FileText },
          { to: '/student/apply', label: 'Apply', icon: Plus, isCenterAction: true },
          { to: '/student/history', label: 'History', icon: History },
          { to: '/profile', label: 'Profile', icon: User },
        ];

      case 'MENTOR':
        return [
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { to: '/mentor/students', label: 'Students', icon: Users },
          { to: '/mentor/pending', label: 'Approvals', icon: CheckCheck, badge: mentorPendingCount },
          { to: '/mentor/history', label: 'History', icon: History },
          { to: '/profile', label: 'Profile', icon: User },
        ];

      case 'HOD':
        return [
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { to: '/hod/students', label: 'Students', icon: Users },
          { to: '/hod/pending', label: 'Approvals', icon: CheckCheck, badge: hodPendingCount },
          { to: '/analytics', label: 'Analytics', icon: PieChart },
          { to: '/profile', label: 'Profile', icon: User },
        ];

      case 'SUPER_ADMIN':
      case 'PRINCIPAL':
      case 'ACADEMIC_COORDINATOR':
        return [
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { to: '/analytics', label: 'Analytics', icon: PieChart },
          { to: '/admin/history', label: 'History', icon: History },
          { to: '/admin/users', label: 'Users', icon: UserCheck },
          { to: '/admin/audit', label: 'Audit', icon: ShieldCheck },
        ];

      default:
        return [
          { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { to: '/student/requests', label: 'Passes', icon: FileText },
          { to: '/profile', label: 'Profile', icon: User },
        ];
    }
  };

  const tabs = getRoleTabs();

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        paddingTop: '6px',
      }}
    >
      <div className="flex items-center justify-around px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          // Special Center Action Button (e.g., Student Quick Apply)
          if (tab.isCenterAction) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center -mt-5 group transition-transform active:scale-95 cursor-pointer"
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                        isActive
                          ? 'bg-[#0B426E] text-white ring-4 ring-blue-100 dark:ring-blue-950 scale-105'
                          : 'bg-[#0B426E] text-white ring-4 ring-white dark:ring-gray-900 hover:scale-105'
                      }`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-semibold tracking-tight transition-colors ${
                        isActive ? 'text-[#0B426E] dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          // Standard WhatsApp-style Tab
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-w-[56px] py-1 transition-all active:scale-95 cursor-pointer ${
                  isActive ? 'text-[#0B426E] dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    {/* WhatsApp Android-style rounded pill for active state */}
                    <div
                      className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isActive
                          ? 'bg-[#0B426E]/15 dark:bg-blue-500/20 text-[#0B426E] dark:text-blue-400'
                          : 'bg-transparent text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                    </div>

                    {/* Notification / Pending Badge */}
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="absolute -top-1 right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold px-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-xs animate-in zoom-in duration-150">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                      isActive ? 'font-bold text-[#0B426E] dark:text-blue-400 scale-102' : 'font-medium text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
