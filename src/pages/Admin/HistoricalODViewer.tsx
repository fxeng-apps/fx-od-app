import React, { useState, useMemo } from 'react';
import { Calendar, History, Search } from 'lucide-react';
import { useAllODRequests } from '../../hooks/useODRequests';
import { RequestsTable } from '../../components/tables/RequestsTable';
import { Loader } from '../../components/common/Loader';

export const HistoricalODViewer: React.FC = () => {
  const { data: requests = [], isLoading } = useAllODRequests();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedMentor, setSelectedMentor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique sections and mentors for dropdown filters
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.studentSnapshot?.section) set.add(r.studentSnapshot.section);
    });
    return Array.from(set).sort();
  }, [requests]);

  const uniqueMentors = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.assignedMentorUid && r.assignedMentorSnapshot?.name) {
        map.set(r.assignedMentorUid, r.assignedMentorSnapshot.name);
      }
    });
    return Array.from(map.entries());
  }, [requests]);

  // Filter requests active on selected date or matching selectedDate range
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Date Filter (Check if selectedDate matches any date in schedule array)
      const matchesDate = !selectedDate || (r.schedule && r.schedule.length > 0
        ? r.schedule.some((entry) => entry.date === selectedDate)
        : (selectedDate >= r.startDate && selectedDate <= (r.endDate || r.startDate)));
      if (!matchesDate) return false;

      // 2. Department Filter
      if (selectedDept !== 'ALL' && r.department !== selectedDept) return false;

      // 3. Section Filter
      if (selectedSection !== 'ALL' && r.studentSnapshot?.section !== selectedSection) return false;

      // 4. Mentor Filter
      if (selectedMentor !== 'ALL' && (r.mentorId || r.assignedMentorUid) !== selectedMentor) return false;

      // 5. Status Filter
      const overallStatus = typeof r.status === 'object' ? r.status.overall : r.status;
      if (selectedStatus !== 'ALL' && overallStatus !== selectedStatus) return false;

      // 6. Search Query
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const studentName = (r.studentSnapshot?.name || '').toLowerCase();
        const regNo = (r.studentSnapshot?.registerNumber || '').toLowerCase();
        const reqNo = (r.requestNumber || r.id || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const mentor = (r.assignedMentorSnapshot?.name || '').toLowerCase();

        return (
          studentName.includes(queryLower) ||
          regNo.includes(queryLower) ||
          reqNo.includes(queryLower) ||
          desc.includes(queryLower) ||
          mentor.includes(queryLower)
        );
      }

      return true;
    });
  }, [
    requests,
    selectedDate,
    selectedDept,
    selectedSection,
    selectedMentor,
    selectedStatus,
    searchQuery,
  ]);

  // Status Breakdown for Selected Date
  const statusCounts = useMemo(() => {
    const approved = filteredRequests.filter((r) => (typeof r.status === 'object' ? r.status.overall : r.status) === 'HOD_APPROVED').length;
    const pending = filteredRequests.filter((r) => {
      const status = typeof r.status === 'object' ? r.status.overall : r.status;
      return status === 'PENDING' || status === 'MENTOR_APPROVED';
    }).length;
    const rejected = filteredRequests.filter((r) => {
      const status = typeof r.status === 'object' ? r.status.overall : r.status;
      return status === 'MENTOR_REJECTED' || status === 'HOD_REJECTED';
    }).length;
    const withdrawn = filteredRequests.filter((r) => (typeof r.status === 'object' ? r.status.overall : r.status) === 'WITHDRAWN').length;
    const expired = filteredRequests.filter((r) => (typeof r.status === 'object' ? r.status.overall : r.status) === 'EXPIRED').length;

    return { approved, pending, rejected, withdrawn, expired, total: filteredRequests.length };
  }, [filteredRequests]);

  if (isLoading) {
    return <Loader label="Loading historical OD records database..." />;
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#0B426E] dark:text-blue-400" />
            Historical OD Inspector
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Inspect approved, pending, rejected, withdrawn, and expired OD requests for any specific date across departments.
          </p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-3.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0B426E] dark:text-blue-400" /> Target Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0B426E]"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0B426E]"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AI_DS">AI_DS</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0B426E]"
            >
              <option value="ALL">All Sections</option>
              {uniqueSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Mentor Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              Faculty Mentor
            </label>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0B426E]"
            >
              <option value="ALL">All Mentors</option>
              {uniqueMentors.map(([uid, name]) => (
                <option key={uid} value={uid}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              OD Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0B426E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="HOD_APPROVED">Approved (Sanctioned)</option>
              <option value="PENDING">Pending Mentor</option>
              <option value="MENTOR_APPROVED">Pending HOD</option>
              <option value="MENTOR_REJECTED">Rejected by Mentor</option>
              <option value="HOD_REJECTED">Rejected by HOD</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by student name, reg no, request #, or purpose..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0B426E]"
          />
        </div>
      </div>

      {/* Date Status Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-center">
          <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Active</span>
          <span className="text-base font-bold text-[#0B426E] dark:text-blue-300">{statusCounts.total}</span>
        </div>
        <div className="p-2.5 bg-green-50/70 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-center">
          <span className="text-[10px] text-green-700 dark:text-green-300 uppercase font-semibold block">Approved</span>
          <span className="text-base font-bold text-green-600 dark:text-green-400">{statusCounts.approved}</span>
        </div>
        <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-center">
          <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold block">Pending</span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-400">{statusCounts.pending}</span>
        </div>
        <div className="p-2.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-center">
          <span className="text-[10px] text-red-700 dark:text-red-300 uppercase font-semibold block">Rejected</span>
          <span className="text-base font-bold text-red-600 dark:text-red-400">{statusCounts.rejected}</span>
        </div>
        <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md text-center">
          <span className="text-[10px] text-gray-600 dark:text-gray-300 uppercase font-semibold block">Withdrawn</span>
          <span className="text-base font-bold text-gray-700 dark:text-gray-300">{statusCounts.withdrawn}</span>
        </div>
        <div className="p-2.5 bg-amber-100/50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md text-center">
          <span className="text-[10px] text-amber-800 dark:text-amber-200 uppercase font-semibold block">Expired</span>
          <span className="text-base font-bold text-amber-800 dark:text-amber-300">{statusCounts.expired}</span>
        </div>
      </div>

      {/* Main Table */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            No OD requests found active on {selectedDate} for the selected filters.
          </p>
        </div>
      ) : (
        <RequestsTable requests={filteredRequests} showStudentDetails={true} />
      )}
    </div>
  );
};
