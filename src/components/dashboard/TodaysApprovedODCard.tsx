import React, { useState, useMemo } from 'react';
import { CheckCircle2, User, Calendar, MapPin, Award, Layers } from 'lucide-react';
import type { ODRequest } from '../../types/od';
import { Badge } from '../common/Badge';

interface TodaysApprovedODCardProps {
  allRequests: ODRequest[];
}

export const TodaysApprovedODCard: React.FC<TodaysApprovedODCardProps> = ({ allRequests }) => {
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('ALL');

  // Format today's date in YYYY-MM-DD format for comparing with request dates
  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const getPassTypeLabel = (req: ODRequest): string => {
    if (!req.schedule || req.schedule.length === 0) {
      return 'Full Day';
    }
    const todayEntry = req.schedule.find((entry) => entry.date === todayStr);
    if (!todayEntry) return 'Full Day';
    if (todayEntry.passType === 'FULL_DAY') return 'Full Day';
    return `Partial - Periods: ${todayEntry.periods.map((p) => `P${p}`).join(', ')}`;
  };

  // Filter approved OD requests active for today
  const todaysApprovedRequests = useMemo(() => {
    return allRequests.filter((req) => {
      const overallStatus = typeof req.status === 'object' ? req.status.overall : req.status;
      if (overallStatus !== 'HOD_APPROVED') return false;

      // Check if today falls in the schedule entries
      if (req.schedule && req.schedule.length > 0) {
        return req.schedule.some((entry) => entry.date === todayStr);
      }
      if (req.startDate && req.endDate) {
        return todayStr >= req.startDate && todayStr <= req.endDate;
      }
      return req.startDate === todayStr;
    });
  }, [allRequests, todayStr]);

  // Group today's approved requests by section / class (e.g., "CSE - III A")
  const sectionGroups = useMemo(() => {
    const map = new Map<string, ODRequest[]>();

    todaysApprovedRequests.forEach((req) => {
      const dept = req.department || req.studentSnapshot?.department || 'GEN';
      const year = req.studentSnapshot?.year ? `Year ${req.studentSnapshot.year}` : '';
      const section = req.studentSnapshot?.section ? `Sec ${req.studentSnapshot.section}` : '';
      const key = `${dept} ${year} ${section}`.trim() || 'General';

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(req);
    });

    return map;
  }, [todaysApprovedRequests]);

  const sectionKeys = useMemo(() => Array.from(sectionGroups.keys()).sort(), [sectionGroups]);

  // Displayed requests based on section selection
  const displayedRequests = useMemo(() => {
    if (selectedSectionKey === 'ALL') {
      return todaysApprovedRequests;
    }
    return sectionGroups.get(selectedSectionKey) || [];
  }, [selectedSectionKey, todaysApprovedRequests, sectionGroups]);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
      {/* Header Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-green-50 dark:bg-green-950/60 text-[#16A34A] border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
              Today's Sanctioned Approved ODs
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Approved students on official duty for today's session ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/50 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Total Approved Today:</span>
          <span className="text-base font-bold text-[#16A34A]">{todaysApprovedRequests.length}</span>
        </div>
      </div>

      {todaysApprovedRequests.length === 0 ? (
        <div className="p-6 text-center bg-gray-50 dark:bg-gray-700/30 rounded-md border border-dashed border-gray-200 dark:border-gray-600">
          <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No Approved ODs Active Today</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            There are currently no sanctioned OD applications active for today's date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Class / Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
              Filter Class / Section:
            </span>
            <button
              onClick={() => setSelectedSectionKey('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSectionKey === 'ALL'
                  ? 'bg-[#0B426E] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>All Classes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                {todaysApprovedRequests.length}
              </span>
            </button>

            {sectionKeys.map((secKey) => {
              const isSelected = selectedSectionKey === secKey;
              const count = sectionGroups.get(secKey)?.length || 0;
              return (
                <button
                  key={secKey}
                  onClick={() => setSelectedSectionKey(secKey)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0B426E] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{secKey}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Approved Students Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 space-y-2.5 text-xs shadow-2xs hover:border-[#0B426E] transition-colors"
              >
                {/* Student Header */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-gray-600 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-[#0B426E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {req.studentSnapshot?.name || 'Student'}
                      </h4>
                      <p className="text-[10px] font-mono text-[#0B426E] dark:text-blue-300">
                        Reg: {req.studentSnapshot?.registerNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Sanctioned</Badge>
                </div>

                {/* Section & Event Info */}
                <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Class Section:</span>
                    <strong className="text-gray-800 dark:text-gray-200 font-semibold">
                      {req.department} ({req.studentSnapshot?.year || 'III'}-{req.studentSnapshot?.section || 'A'})
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" /> Pass Type:
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {getPassTypeLabel(req)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Award className="w-3 h-3 text-gray-400" /> Faculty In Charge:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{req.facultyInCharge}</span>
                  </div>

                  <div className="flex items-start justify-between gap-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-400 flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3 text-gray-400" /> Event & Venue:
                    </span>
                    <span className="font-semibold text-[#0B426E] dark:text-blue-300 text-right truncate max-w-[140px]" title={req.purpose || req.description || req.odType}>
                      {req.purpose || req.description || req.odType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
