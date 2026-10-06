import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  Calendar as CalendarIcon,
  Search,
  User,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAllODRequests } from '../../hooks/useODRequests';
import { Button } from '../../components/common/Button';
import { ROLE_LABELS } from '../../constants/roles';
import { StudentDashboard } from '../Student/StudentDashboard';
import { Loader } from '../../components/common/Loader';

export const Dashboard: React.FC = () => {
  const { userProfile, activeRole } = useAuth();
  const navigate = useNavigate();
  const { data: allRequests = [], isLoading } = useAllODRequests();

  const role = activeRole || userProfile?.role || 'STUDENT';

  // State for Faculty Verification Filters
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Filter approved passes for selected criteria
  const verifiedPasses = useMemo(() => {
    if (role === 'STUDENT') return [];
    return allRequests.filter((req) => {
      // 1. Date check
      let matchesDate = false;
      if (req.schedule && req.schedule.length > 0) {
        matchesDate = req.schedule.some((entry: any) => entry.date === selectedDate);
      } else if (req.startDate && req.endDate) {
        matchesDate = selectedDate >= req.startDate && selectedDate <= req.endDate;
      } else {
        matchesDate = req.startDate === selectedDate;
      }
      if (!matchesDate) return false;

      // 2. Department Filter
      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;

      // 3. Class (Year) Filter
      if (yearFilter !== 'ALL' && req.studentSnapshot?.year !== yearFilter) return false;

      // 4. Section Filter
      if (sectionFilter !== 'ALL' && req.studentSnapshot?.section?.toUpperCase() !== sectionFilter) return false;

      // 5. Search check
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const studentName = (req.studentSnapshot?.name || '').toLowerCase();
        const regNo = (req.studentSnapshot?.registerNumber || '').toLowerCase();
        if (!studentName.includes(q) && !regNo.includes(q)) return false;
      }

      return true;
    });
  }, [allRequests, selectedDate, deptFilter, yearFilter, sectionFilter, searchQuery, role]);

  // Render Student Dashboard for Student role
  if (role === 'STUDENT') {
    return <StudentDashboard />;
  }

  const roleLabel = ROLE_LABELS[role];

  // Helper to extract pass type details for the chosen date
  const getPassTypeLabelForDate = (req: any, dateStr: string): string => {
    if (!req.schedule || req.schedule.length === 0) {
      return 'Full Day';
    }
    const dateEntry = req.schedule.find((entry: any) => entry.date === dateStr);
    if (!dateEntry) return 'Full Day';
    if (dateEntry.passType === 'FULL_DAY') return 'Full Day';
    return `Partial - Periods: ${dateEntry.periods.map((p: any) => `P${p}`).join(', ')}`;
  };

  if (isLoading) {
    return <Loader label="Loading verification dashboard..." />;
  }

  return (
    <div className="space-y-4 text-left">
      {/* Faculty ERP Welcome Header */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
            Faculty Verification Dashboard
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Logged in as <strong className="text-gray-900 dark:text-gray-200 font-semibold">{userProfile?.displayName || 'User'}</strong> ({roleLabel} • {userProfile?.department})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'MENTOR' && (
            <Button variant="primary" size="sm" onClick={() => navigate('/mentor/pending')}>
              <FileText className="mr-1.5 w-3.5 h-3.5" /> Review Mentor Approvals
            </Button>
          )}
          {role === 'HOD' && (
            <Button variant="primary" size="sm" onClick={() => navigate('/hod/pending')}>
              <UserCheck className="mr-1.5 w-3.5 h-3.5" /> Sanction HOD Approvals
            </Button>
          )}
        </div>
      </div>

      {/* Today's Date Academic session Banner */}
      <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-[#2f5da8] dark:text-blue-400" />
          <div>
            <h4 className="font-semibold text-xs text-gray-900 dark:text-white">Institutional verification session</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Active verification date: <strong className="text-[#2f5da8] dark:text-blue-400 font-semibold">{selectedDate}</strong>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
            🔴 Pending Mentor: <strong className="text-red-600">{verifiedPasses.filter(r => (typeof r.status === 'object' ? r.status.overall : r.status) === 'PENDING').length}</strong>
          </div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
            🟡 Waiting for HOD: <strong className="text-yellow-600">{verifiedPasses.filter(r => (typeof r.status === 'object' ? r.status.overall : r.status) === 'MENTOR_APPROVED').length}</strong>
          </div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
            🟢 Fully Approved: <strong className="text-green-600">{verifiedPasses.filter(r => (typeof r.status === 'object' ? r.status.overall : r.status) === 'HOD_APPROVED').length}</strong>
          </div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
            📋 Total OD Requests: <strong className="text-[#2f5da8] dark:text-blue-400">{verifiedPasses.length}</strong>
          </div>
        </div>
      </div>

      {/* Verification Filter and Search panel */}
      <div className="p-3.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs space-y-3.5 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Smart Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or register number..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          {/* Filtering selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Verification Date */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8] font-semibold cursor-pointer"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Depts</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="IT">IT</option>
                <option value="AI_DS">AI_DS</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Year:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Years</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Sec:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Secs</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Verification List table/cards */}
      {verifiedPasses.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
          No movement passes found matching current verification filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {verifiedPasses.map((pass) => {
            const statusStr = typeof pass.status === 'object' ? pass.status.overall : (pass.status as string);
            
            let cardBg = 'bg-gray-50 dark:bg-gray-800';
            let cardBorder = 'border-gray-200 dark:border-gray-700';
            let statusLabel = 'Other';
            
            if (statusStr === 'PENDING') {
              cardBg = 'bg-[#FEE2E2] dark:bg-[#450a0a]';
              cardBorder = 'border-[#DC2626]';
              statusLabel = '🔴 Mentor Pending';
            } else if (statusStr === 'MENTOR_APPROVED') {
              cardBg = 'bg-[#FFF7CC] dark:bg-[#422006]';
              cardBorder = 'border-[#E6C65A]';
              statusLabel = '🟡 Waiting for HOD';
            } else if (statusStr === 'HOD_APPROVED') {
              cardBg = 'bg-[#DCFCE7] dark:bg-[#052e16]';
              cardBorder = 'border-[#22C55E]';
              statusLabel = '🟢 Fully Approved';
            }

            return (
              <div
                key={pass.id}
                className={`p-4 rounded-md border-2 ${cardBg} ${cardBorder} shadow-sm space-y-3 text-xs flex flex-col`}
              >
                <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-white/60 dark:bg-black/20 flex items-center justify-center font-bold text-[#2f5da8] dark:text-blue-300 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">
                        {pass.studentSnapshot?.name || 'Student'}
                      </h4>
                      <p className="text-[11px] font-mono font-semibold text-gray-600 dark:text-gray-300">
                        {pass.studentSnapshot?.registerNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Status</span>
                    <span className="font-bold text-gray-900 dark:text-white">{statusLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Class</span>
                    <strong className="text-gray-800 dark:text-gray-200">
                      {pass.department} ({pass.studentSnapshot?.year || 'III'}-{pass.studentSnapshot?.section || 'A'})
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Mentor</span>
                    <span className="text-gray-800 dark:text-gray-200">{pass.assignedMentorSnapshot?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Pass Type</span>
                    <strong className="text-[#2f5da8] dark:text-blue-300">{getPassTypeLabelForDate(pass, selectedDate)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">From</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{pass.startDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">To</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{pass.endDate || pass.startDate}</span>
                  </div>
                  
                  <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-2 mt-2 space-y-1">
                    <div className="flex items-start gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium line-clamp-2" title={pass.purpose || pass.description}>
                        {pass.purpose || pass.description}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
