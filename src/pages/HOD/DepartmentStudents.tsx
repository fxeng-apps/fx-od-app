import React, { useState, useMemo } from 'react';
import { Search, GraduationCap, ArrowUp, ArrowDown, Eye, Users, Building } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useStudentsForDepartment,
  useMentorsByDepartment,
  useHODsForDepartment,
  useImportedRegistry,
} from '../../hooks/useUserManagement';
import { useAllODRequests } from '../../hooks/useODRequests';
import type { UserProfile, UserRole, Department } from '../../types/user';
import { StudentProfileModal } from '../../components/modals/StudentProfileModal';
import { Loader } from '../../components/common/Loader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';

type SortCol = 'displayName' | 'registerNumber' | 'mentorName' | 'year' | 'section' | 'email' | 'isLinked';
type SwitcherSection = 'STUDENT' | 'STAFF' | 'HOD';

export interface UnifiedHODUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: Department;
  registerNumber?: string;
  year?: string;
  section?: string;
  mentorEmail?: string;
  mentorName?: string;
  isLinked: boolean;
  source: 'users' | 'imported_users';
  rawProfile?: UserProfile;
}

export const DepartmentStudents: React.FC = () => {
  const { userProfile } = useAuth();
  const dept = userProfile?.department || 'CSE';

  // Fetch all categories for this department
  const { data: activeStudents = [], isLoading: isLoadingStudents } = useStudentsForDepartment(dept);
  const { data: activeMentors = [], isLoading: isLoadingMentors } = useMentorsByDepartment(dept);
  const { data: activeHODs = [], isLoading: isLoadingHODs } = useHODsForDepartment(dept);
  const { data: registry = [], isLoading: isLoadingRegistry } = useImportedRegistry();
  const { data: allODs = [], isLoading: isLoadingODs } = useAllODRequests();

  const isLoading = isLoadingStudents || isLoadingMentors || isLoadingHODs || isLoadingRegistry || isLoadingODs;

  const [activeSection, setActiveSection] = useState<SwitcherSection>('STUDENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedMentorEmail, setSelectedMentorEmail] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorting
  const [sortCol, setSortCol] = useState<SortCol>('displayName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Selection
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [viewingMentorStudents, setViewingMentorStudents] = useState<UnifiedHODUserRecord | null>(null);

  // 1. Filter Registry by HOD's department
  const deptRegistry = useMemo(() => {
    return registry.filter((r) => r.department === dept);
  }, [registry, dept]);

  // 2. Unify records based on the active switcher section
  const unifiedList = useMemo(() => {
    const list: UnifiedHODUserRecord[] = [];
    const activeEmails = new Set<string>();

    if (activeSection === 'STUDENT') {
      activeStudents.forEach((u) => {
        activeEmails.add(u.email.toLowerCase());
        list.push({
          id: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          department: u.department,
          registerNumber: u.registerNumber || '',
          year: u.year || '',
          section: u.section || '',
          mentorEmail: u.mentorEmail || '',
          mentorName: u.mentorName || '',
          isLinked: true,
          source: 'users',
          rawProfile: u,
        });
      });

      deptRegistry.forEach((r) => {
        if (r.role === 'STUDENT' && !activeEmails.has(r.email.toLowerCase())) {
          list.push({
            id: r.id || r.email,
            email: r.email,
            displayName: r.displayName,
            role: r.role,
            department: r.department,
            registerNumber: r.registerNumber || '',
            year: r.year || '',
            section: r.section || '',
            mentorEmail: r.mentorEmail || '',
            isLinked: false,
            source: 'imported_users',
          });
        }
      });
    } else if (activeSection === 'STAFF') {
      activeMentors.forEach((u) => {
        activeEmails.add(u.email.toLowerCase());
        list.push({
          id: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          department: u.department,
          isLinked: true,
          source: 'users',
          rawProfile: u,
        });
      });

      deptRegistry.forEach((r) => {
        if (r.role === 'MENTOR' && !activeEmails.has(r.email.toLowerCase())) {
          list.push({
            id: r.id || r.email,
            email: r.email,
            displayName: r.displayName,
            role: r.role,
            department: r.department,
            isLinked: false,
            source: 'imported_users',
          });
        }
      });
    } else if (activeSection === 'HOD') {
      activeHODs.forEach((u) => {
        activeEmails.add(u.email.toLowerCase());
        list.push({
          id: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          department: u.department,
          isLinked: true,
          source: 'users',
          rawProfile: u,
        });
      });

      deptRegistry.forEach((r) => {
        if (r.role === 'HOD' && !activeEmails.has(r.email.toLowerCase())) {
          list.push({
            id: r.id || r.email,
            email: r.email,
            displayName: r.displayName,
            role: r.role,
            department: r.department,
            isLinked: false,
            source: 'imported_users',
          });
        }
      });
    }

    return list;
  }, [activeSection, activeStudents, activeMentors, activeHODs, deptRegistry]);

  // Compute student list for a mentor dynamically
  const getStudentsForMentor = (mentorEmail: string, mentorUid?: string) => {
    // Search within activeStudents and pre-registered students in the department registry
    const activeMentees = activeStudents.filter((s) => {
      const matchUid = mentorUid && s.mentorUid === mentorUid;
      const matchEmail = s.mentorEmail && s.mentorEmail.trim().toLowerCase() === mentorEmail.toLowerCase();
      return matchUid || matchEmail;
    });

    const preRegMentees = deptRegistry.filter((r) => {
      if (r.role !== 'STUDENT') return false;
      const matchEmail = r.mentorEmail && r.mentorEmail.trim().toLowerCase() === mentorEmail.toLowerCase();
      // Only include if it hasn't signed up yet
      const isAlreadyActive = activeStudents.some((s) => s.email.toLowerCase() === r.email.toLowerCase());
      return matchEmail && !isAlreadyActive;
    });

    return [
      ...activeMentees.map((m) => ({
        id: m.uid,
        displayName: m.displayName,
        registerNumber: m.registerNumber || '',
        year: m.year || '',
        section: m.section || '',
        isLinked: true,
      })),
      ...preRegMentees.map((p) => ({
        id: p.id || p.email,
        displayName: p.displayName,
        registerNumber: p.registerNumber || '',
        year: p.year || '',
        section: p.section || '',
        isLinked: false,
      })),
    ];
  };

  // Helper to fetch student OD status from latest approved request
  const getStudentODStatus = (studentUid: string) => {
    const studentReqs = allODs.filter((r) => (r.studentId === studentUid || r.studentUid === studentUid) && !r.isDeleted);
    if (studentReqs.length === 0) return { label: 'No Applications', variant: 'info' as const };

    const latest = studentReqs[0];
    const statusVal = typeof latest.status === 'object' ? latest.status.overall : latest.status;
    if (statusVal === 'HOD_APPROVED') return { label: 'Approved', variant: 'success' as const };
    if (statusVal === 'PENDING' || statusVal === 'MENTOR_APPROVED') return { label: 'Pending Approval', variant: 'warning' as const };
    return { label: 'Rejected', variant: 'danger' as const };
  };

  // 3. Filter and search unified items
  const filteredList = useMemo(() => {
    return unifiedList.filter((item) => {
      // Search Box filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.displayName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        (item.registerNumber || '').toLowerCase().includes(q);

      // Status filter
      if (statusFilter !== 'ALL') {
        const isLinked = item.isLinked;
        if (statusFilter === 'ACTIVE' && !isLinked) return false;
        if (statusFilter === 'INACTIVE' && isLinked) return false;
      }

      // Student-specific filters
      if (activeSection === 'STUDENT') {
        const matchesYear = selectedYear === 'ALL' || (item.year || 'III') === selectedYear;
        const matchesSection = selectedSection === 'ALL' || (item.section || 'A').toUpperCase() === selectedSection;
        const matchesMentor =
          selectedMentorEmail === 'ALL' || (item.mentorEmail || '').toLowerCase() === selectedMentorEmail.toLowerCase();

        return matchesSearch && matchesYear && matchesSection && matchesMentor;
      }

      return matchesSearch;
    });
  }, [unifiedList, searchQuery, statusFilter, activeSection, selectedYear, selectedSection, selectedMentorEmail]);

  // 4. Sorting logic
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let valA = a[sortCol] || '';
      let valB = b[sortCol] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredList, sortCol, sortDir]);

  // 5. Pagination
  const totalPages = Math.ceil(sortedList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, currentPage, pageSize]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (col: SortCol) => {
    if (sortCol !== col) return <ArrowUp className="inline w-3 h-3 opacity-40 ml-1" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="inline w-3 h-3 text-[#0B426E] dark:text-blue-400 ml-1" />
    ) : (
      <ArrowDown className="inline w-3 h-3 text-[#0B426E] dark:text-blue-400 ml-1" />
    );
  };

  const handleSectionSwitch = (sect: SwitcherSection) => {
    setActiveSection(sect);
    setSearchQuery('');
    setSelectedYear('ALL');
    setSelectedSection('ALL');
    setSelectedMentorEmail('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Render stats cards based on section
  const renderSummaryCards = () => {
    const sectionList = unifiedList; // unfiltered records for the tab

    if (activeSection === 'STUDENT') {
      const total = sectionList.length;
      const linked = sectionList.filter((s) => s.isLinked).length;
      const unlinked = total - linked;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Students ({dept})</span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 text-[#0B426E] dark:text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Accounts</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{linked}</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pre-Registered</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{unlinked}</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'STAFF') {
      const total = sectionList.length;
      const assigned = sectionList.filter((m) => getStudentsForMentor(m.email, m.id).length > 0).length;
      const unassigned = total - assigned;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Dept Staff</span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Mentors</span>
              <span className="text-lg font-bold text-green-600">{assigned}</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unassigned Mentors</span>
              <span className="text-lg font-bold text-amber-600">{unassigned}</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'HOD') {
      const total = sectionList.length;
      return (
        <div className="grid grid-cols-1 gap-3 text-left max-w-xs">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total HODs ({dept})</span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Building className="w-5 h-5" />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs text-left">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Building className="w-5 h-5 text-[#0B426E] dark:text-blue-400" />
          Department Students Directory ({dept})
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Role-segmented directory listing students, faculty mentors, and departmental managers.
        </p>
      </div>

      {/* 2. Top Segmented Swticher Tab */}
      <div className="flex justify-start">
        <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg inline-flex gap-1 border border-gray-200 dark:border-gray-600 w-full sm:w-auto">
          {(
            [
              { id: 'STUDENT', label: 'Students' },
              { id: 'STAFF', label: 'Staff' },
              { id: 'HOD', label: 'HODs' },
            ] as const
          ).map((tab) => {
            const isSelected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSectionSwitch(tab.id)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B426E] text-white shadow-xs dark:bg-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Lightweight Analytics Summary */}
      {renderSummaryCards()}

      {/* 4. Filters & Search Box */}
      <div className="p-3.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs space-y-3 text-xs text-left">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                activeSection === 'STUDENT'
                  ? 'Search student name, reg no, email...'
                  : 'Search staff by name or email...'
              }
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0B426E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department Lock Indicator */}
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-gray-600 dark:text-gray-300">
              Department: {dept}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B426E] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Account</option>
                <option value="INACTIVE">Pre-Registered</option>
              </select>
            </div>

            {/* Students specific filters */}
            {activeSection === 'STUDENT' && (
              <>
                {/* Year Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs">
                  <span className="text-gray-500 font-medium">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-gray-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="dark:bg-gray-800">All</option>
                    <option value="I" className="dark:bg-gray-800">I</option>
                    <option value="II" className="dark:bg-gray-800">II</option>
                    <option value="III" className="dark:bg-gray-800">III</option>
                    <option value="IV" className="dark:bg-gray-800">IV</option>
                  </select>
                </div>

                {/* Section Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs">
                  <span className="text-gray-500 font-medium">Sec:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-gray-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="dark:bg-gray-800">All</option>
                    <option value="A" className="dark:bg-gray-800">A</option>
                    <option value="B" className="dark:bg-gray-800">B</option>
                    <option value="C" className="dark:bg-gray-800">C</option>
                    <option value="D" className="dark:bg-gray-800">D</option>
                  </select>
                </div>

                {/* Mentor Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs">
                  <span className="text-gray-500 font-medium">Mentor:</span>
                  <select
                    value={selectedMentorEmail}
                    onChange={(e) => {
                      setSelectedMentorEmail(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-gray-900 dark:text-white font-semibold focus:outline-none cursor-pointer max-w-[130px]"
                  >
                    <option value="ALL" className="dark:bg-gray-800">All Mentors</option>
                    {activeMentors.map((m) => (
                      <option key={m.uid} value={m.email} className="dark:bg-gray-800">
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. Main Table & Records */}
      {isLoading ? (
        <Loader label="Loading directory records..." />
      ) : sortedList.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs">
          No records match selected section filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 uppercase font-semibold text-[11px] tracking-wider select-none">
                  <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => toggleSort('displayName')}>
                    Name {renderSortIcon('displayName')}
                  </th>
                  <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => toggleSort('email')}>
                    College Email {renderSortIcon('email')}
                  </th>
                  {activeSection !== 'HOD' && (
                    <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => toggleSort('registerNumber')}>
                      {activeSection === 'STUDENT' ? 'Register No' : 'Role Badge'} {renderSortIcon('registerNumber')}
                    </th>
                  )}
                  {activeSection === 'STUDENT' && (
                    <>
                      <th className="p-3">Assigned Mentor</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">OD Pass Status</th>
                    </>
                  )}
                  {activeSection === 'STAFF' && (
                    <th className="p-3 text-center">Assigned Students</th>
                  )}
                  <th className="p-3 cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => toggleSort('isLinked')}>
                    Status {renderSortIcon('isLinked')}
                  </th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200 font-medium">
                {paginatedList.map((rec) => {
                  const isStudent = rec.role === 'STUDENT';
                  const isStaff = rec.role === 'MENTOR';

                  // Dynamic staff badge
                  let staffBadge = <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Staff</span>;
                  let mentorStudentCount = 0;

                  if (isStaff) {
                    mentorStudentCount = getStudentsForMentor(rec.email, rec.id).length;
                    if (mentorStudentCount > 0) {
                      staffBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                          🟢 Assigned Mentor
                        </span>
                      );
                    } else {
                      staffBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          🟡 Unassigned Mentor
                        </span>
                      );
                    }
                  }

                  const odStatus = isStudent ? getStudentODStatus(rec.id) : null;

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-left">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">{rec.displayName}</td>
                      <td className="p-3 font-mono text-[#0B426E] dark:text-blue-300 font-semibold">{rec.email}</td>
                      {activeSection !== 'HOD' && (
                        <td className="p-3">
                          {isStudent ? (
                            <span className="font-mono text-gray-800 dark:text-gray-200">{rec.registerNumber || 'N/A'}</span>
                          ) : (
                            staffBadge
                          )}
                        </td>
                      )}
                      {isStudent && (
                        <>
                          <td className="p-3 text-gray-800 dark:text-gray-200">
                            {rec.mentorName || 'Unassigned'}
                            {rec.mentorEmail && <div className="text-[10px] text-gray-400 font-mono">{rec.mentorEmail}</div>}
                          </td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">
                            Year {rec.year || 'III'} • Sec {rec.section || 'A'}
                          </td>
                          <td className="p-3">
                            {odStatus && <Badge variant={odStatus.variant}>{odStatus.label}</Badge>}
                          </td>
                        </>
                      )}
                      {isStaff && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setViewingMentorStudents(rec)}
                            className="px-2 py-1 rounded text-xs font-bold text-[#0B426E] dark:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer underline decoration-dotted"
                          >
                            {mentorStudentCount} Student(s)
                          </button>
                        </td>
                      )}
                      <td className="p-3">
                        {rec.isLinked ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Pre-Reg</Badge>}
                      </td>
                      <td className="p-3 text-right">
                        {rec.rawProfile ? (
                          <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(rec.rawProfile!)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
                          </Button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No live profile</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 6. Standard Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      )}

      {/* Student Profile Dialog */}
      <StudentProfileModal
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        canEdit={false}
      />

      {/* Dialog - Mentees Click-through */}
      <Modal
        isOpen={!!viewingMentorStudents}
        onClose={() => setViewingMentorStudents(null)}
        title={`Students Assigned to ${viewingMentorStudents?.displayName}`}
      >
        <div className="space-y-3.5 text-xs text-left">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600">
            <p className="text-[11px] text-gray-500">Mentor Email</p>
            <p className="font-semibold text-gray-900 dark:text-white">{viewingMentorStudents?.email}</p>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Reg Number</th>
                  <th className="p-2.5">Year / Sec</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
                {viewingMentorStudents &&
                  (getStudentsForMentor(viewingMentorStudents.email, viewingMentorStudents.id).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        No students currently assigned to this mentor.
                      </td>
                    </tr>
                  ) : (
                    getStudentsForMentor(viewingMentorStudents.email, viewingMentorStudents.id).map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="p-2.5 font-bold text-gray-900 dark:text-white">{student.displayName}</td>
                        <td className="p-2.5 font-mono">{student.registerNumber || 'N/A'}</td>
                        <td className="p-2.5">
                          {student.year || 'III'} - {student.section || 'A'}
                        </td>
                        <td className="p-2.5">
                          {student.isLinked ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Pre-Reg</Badge>}
                        </td>
                      </tr>
                    ))
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-1">
            <Button variant="ghost" onClick={() => setViewingMentorStudents(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
