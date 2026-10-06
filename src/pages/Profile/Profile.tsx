import React from 'react';
import { Building, IdCard, UserCheck, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';

export const Profile: React.FC = () => {
  const { userProfile, activeRole } = useAuth();

  if (!userProfile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">Institutional Profile</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Authenticated user identity details stored in Firestore.</p>
      </div>

      <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-xs space-y-4">
        {/* User Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {userProfile.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.displayName}
              className="w-14 h-14 rounded-md border border-gray-300 object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#2f5da8] flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-xs">
              {userProfile.displayName.charAt(0)}
            </div>
          )}

          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{userProfile.displayName}</h3>
            <p className="text-xs text-[#2f5da8] dark:text-blue-400 font-semibold">{ROLE_LABELS[activeRole || userProfile.role]}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{userProfile.email}</p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md space-y-1">
            <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 text-[11px]">
              <Building className="w-3.5 h-3.5 text-[#2f5da8] dark:text-blue-400" /> Department
            </span>
            <p className="font-semibold text-gray-900 dark:text-white text-xs">{userProfile.department}</p>
          </div>

          <div className="p-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md space-y-1">
            <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 text-[11px]">
              <IdCard className="w-3.5 h-3.5 text-[#2f5da8] dark:text-blue-400" /> Register Number / UID
            </span>
            <p className="font-semibold text-gray-900 dark:text-white font-mono text-xs">{userProfile.registerNumber || userProfile.uid}</p>
          </div>

          {userProfile.role === 'STUDENT' && (
            <>
              <div className="p-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md space-y-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-[#2f5da8] dark:text-blue-400" /> Year & Section
                </span>
                <p className="font-semibold text-gray-900 dark:text-white text-xs">
                  Year {userProfile.year || 'III'} • Section {userProfile.section || 'A'}
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md space-y-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-[#2f5da8] dark:text-blue-400" /> Assigned Faculty Mentor
                </span>
                <p className="font-semibold text-[#2f5da8] dark:text-blue-400 text-xs">
                  {userProfile.mentorName || 'Faculty Mentor'} ({userProfile.mentorEmail || 'N/A'})
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-3 bg-white dark:bg-gray-700/30 border border-gray-300 dark:border-gray-700 rounded-md text-[11px] text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-green-600" /> Firestore Security Status
          </span>
          <span className="text-green-700 dark:text-green-400 font-semibold uppercase">Verified Institutional Account</span>
        </div>
      </div>
    </div>
  );
};
