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
  GraduationCap,
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
          { to: '/student/history', label: 'History', icon: History },
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
    ? 'w-full h-full bg-[#0B426E] text-white p-4 flex flex-col justify-between overflow-y-auto'
    : 'w-60 bg-[#0B426E] text-white h-full overflow-y-auto p-3 flex flex-col justify-between hidden md:flex shrink-0 shadow-md';

  return (
    <aside className={containerClasses}>
      <div className="space-y-4">
        {/* Header Branding for Drawer */}
        {isMobileDrawer && (
          <div className="flex items-center gap-3 pb-3 border-b border-white/20">
            <div className="w-8 h-8 rounded-md bg-white text-[#0B426E] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white tracking-tight">FX Movement Pass Portal</h2>
              <p className="text-[11px] text-white/70">Institutional ERP System</p>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="px-2 py-1 border-b border-white/10">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
            Portal Navigation
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={`${link.to}-${idx}`}
                to={link.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0B426E] font-semibold shadow-xs'
                      : 'text-white/80 hover:bg-[#0d4e82] hover:text-white'
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
      <div className="p-3 bg-white/10 rounded-md border border-white/10 text-center space-y-0.5 mt-6">
        <p className="text-xs font-semibold text-white">Francis Xavier Engineering College</p>
        <p className="text-[10px] text-white/70">Movement Pass Management System v2.0</p>
      </div>
    </aside>
  );
};
