import React, { useState } from 'react';
import { Bell, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationReadMutation } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime, formatAbsoluteTimestamp } from '../../utils/dateUtils';
import type { SystemNotification } from '../../types/notification';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotifications(userProfile?.uid, 10);

  const markReadMutation = useMarkNotificationReadMutation();

  const handleNotificationClick = (item: SystemNotification) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    const targetRoute = item.route || item.navigationTarget;
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-md border border-white/20 transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Viewport-clamped popup on mobile, anchored dropdown on desktop */}
          <div className="fixed left-2.5 right-2.5 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl sm:rounded-lg shadow-2xl z-50 overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-gray-100 dark:bg-gray-700/80 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="text-[#2f5da8] dark:text-blue-400 w-4 h-4" />
                <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">Notifications</h3>
                <span className="text-[10px] sm:text-[11px] bg-blue-50 dark:bg-blue-950/60 text-[#2f5da8] dark:text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                  {unreadCount} Unread
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                title="Close notifications"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Items List */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-200 dark:divide-gray-700/60 custom-scrollbar overscroll-contain">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((item) => {
                  const targetRoute = item.route || item.navigationTarget;
                  const relativeTimeStr = formatRelativeTime(item.createdAt);
                  const absoluteTimestampStr = formatAbsoluteTimestamp(item.createdAt);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      title={absoluteTimestampStr}
                      className={`p-3 sm:p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                        item.read
                          ? 'bg-white dark:bg-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-300'
                          : 'bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-900 dark:text-gray-100 border-l-4 border-[#2f5da8]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {!item.read && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#2f5da8] dark:bg-blue-400 shrink-0"
                                title="Unread"
                              />
                            )}
                            <h4
                              className={`text-xs break-words line-clamp-2 ${
                                item.read
                                  ? 'font-medium text-gray-700 dark:text-gray-300'
                                  : 'font-bold text-gray-900 dark:text-white'
                              }`}
                            >
                              {item.title}
                            </h4>
                          </div>

                          <span
                            className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5"
                            title={absoluteTimestampStr}
                          >
                            {relativeTimeStr}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                          <span className="truncate">
                            Sender: <strong className="font-semibold text-gray-600 dark:text-gray-300">{item.sender.name}</strong> ({item.sender.role})
                          </span>
                          {targetRoute && (
                            <ExternalLink className="w-3 h-3 text-[#2f5da8] dark:text-blue-300 shrink-0 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Lazy Loading Pagination trigger in Bell dropdown */}
              {hasNextPage && (
                <div className="p-2.5 text-center bg-gray-50 dark:bg-gray-700/30">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchNextPage();
                    }}
                    disabled={isFetchingNextPage}
                    className="text-xs text-[#2f5da8] dark:text-blue-300 font-semibold hover:underline flex items-center justify-center gap-1.5 w-full cursor-pointer py-1"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading older...
                      </>
                    ) : (
                      'Load older notifications'
                    )}
                  </button>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-2.5 bg-gray-100 dark:bg-gray-700/50 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between px-3 shrink-0">
                <span className="text-[11px] text-gray-400">
                  Showing {notifications.length} updates
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-[#2f5da8] dark:text-blue-300 hover:underline font-semibold cursor-pointer py-0.5 px-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
