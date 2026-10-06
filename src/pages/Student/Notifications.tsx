import React from 'react';
import { Bell, CheckCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications, useMarkNotificationReadMutation } from '../../hooks/useNotifications';
import { Loader } from '../../components/common/Loader';
import { Button } from '../../components/common/Button';
import { formatRelativeTime, formatAbsoluteTimestamp } from '../../utils/dateUtils';
import type { SystemNotification } from '../../types/notification';

export const StudentNotifications: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotifications(userProfile?.uid, 15);

  const markReadMutation = useMarkNotificationReadMutation();

  const handleMarkRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markReadMutation.mutate(id);
  };

  const handleNavigate = (item: SystemNotification) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    const targetRoute = item.route || item.navigationTarget;
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2f5da8] dark:text-blue-300">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              Student Notifications
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time approval alerts and system notifications for your OD requests.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2f5da8] dark:text-blue-300 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-800">
            {unreadCount} Unread
          </span>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <Loader label="Loading student notifications..." />
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 space-y-2">
          <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No notifications found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => {
            const targetRoute = item.route || item.navigationTarget;
            const relativeTimeStr = formatRelativeTime(item.createdAt);
            const absoluteTimestampStr = formatAbsoluteTimestamp(item.createdAt);

            return (
              <div
                key={item.id}
                onClick={() => handleNavigate(item)}
                title={absoluteTimestampStr}
                className={`p-4 rounded-md border transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  item.read
                    ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 text-gray-900 dark:text-white border-l-4 border-l-[#2f5da8]'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!item.read && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-[#2f5da8] dark:bg-blue-400 shrink-0"
                          title="Unread notification"
                        />
                      )}
                      <span
                        className={`text-xs ${
                          item.read
                            ? 'font-normal text-gray-700 dark:text-gray-300'
                            : 'font-bold text-gray-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <span
                      className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0"
                      title={absoluteTimestampStr}
                    >
                      {relativeTimeStr}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed">{item.message}</p>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 pt-0.5">
                    Sender: {item.sender.name} ({item.sender.role})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!item.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleMarkRead(item.id, e)}
                      title="Mark as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1" /> Read
                    </Button>
                  )}
                  {targetRoute && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(item);
                      }}
                    >
                      View <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Lazy Load Pagination */}
          {hasNextPage && (
            <div className="pt-2 text-center">
              <Button
                variant="secondary"
                size="md"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full sm:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading older notifications...
                  </>
                ) : (
                  'Load More Notifications'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
