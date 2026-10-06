import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { BottomNav } from '../components/layout/BottomNav';
import { X } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen((prev) => !prev);
  };

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  return (
    <div className="h-screen w-screen bg-[#EAEDF2] dark:bg-[#0B1120] text-[#1F2937] dark:text-[#F9FAFB] flex font-sans overflow-hidden">
      {/* Desktop Permanent Sidebar (Extends top to bottom) */}
      <Sidebar />

      {/* Right Column (Navbar Header + Scrollable Content) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Institutional Navbar (Starts after Sidebar on desktop, spans full width on mobile) */}
        <Navbar onToggleMobileDrawer={toggleMobileDrawer} />

        {/* Scrollable Content Area with Mobile Bottom Nav Clearance */}
        <main className="flex-1 h-full overflow-y-auto p-3.5 sm:p-5 lg:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0 overscroll-y-contain custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Optional Mobile Slide-out Drawer Panel */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={closeMobileDrawer}
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative z-10 w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={closeMobileDrawer}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer z-20"
              title="Close Menu"
            >
              <X className="w-5 h-5 text-current" />
            </button>
            <Sidebar onNavigate={closeMobileDrawer} isMobileDrawer />
          </div>
        </div>
      )}

      {/* WhatsApp-Styled Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};
