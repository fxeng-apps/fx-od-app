import React, { useState, useMemo } from 'react';
import {
  Pencil,
  Lock,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  UserCheck,
  AlertTriangle,
  GraduationCap,
  Users,
  Building,
  Shield,
} from 'lucide-react';
import type { UserProfile, UserRole, Department, ImportedUserRecord } from '../../types/user';
import { ROLE_LABELS } from '../../constants/roles';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Pagination } from '../common/Pagination';

export interface UnifiedUserRecord {
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
  isActive: boolean;
  source: 'users' | 'imported_users';
  createdAt?: string;
  rawProfile?: UserProfile;
  rawRegistry?: ImportedUserRecord;
}

interface UserManagementTableProps {
  users: UserProfile[];
  registry: ImportedUserRecord[];
  mentors: UserProfile[]; // legacy prop, we will construct unifiedMentors from users and registry
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => void;
  onUpdateRegistry: (docId: string, updates: Partial<ImportedUserRecord>) => void;
  onSoftDeleteUser: (uid: string) => void;
  onDeleteRegistry: (docId: string) => void;
  onAssignMentor: (studentUid: string, mentor: UserProfile) => void;
}

type SortColumn =
  | 'displayName'
  | 'email'
  | 'role'
  | 'department'
  | 'registerNumber'
  | 'isLinked';

type SwitcherSection = 'STUDENT' | 'STAFF' | 'HOD' | 'MANAGEMENT';

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  registry,
  onUpdateUser,
  onUpdateRegistry,
  onSoftDeleteUser,
  onDeleteRegistry,
  onAssignMentor,
}) => {
  // Active Section Tab
  const [activeSection, setActiveSection] = useState<SwitcherSection>('STUDENT');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [studentMentorFilter, setStudentMentorFilter] = useState<string>('ALL');

  // Sorting states
  const [sortColumn, setSortColumn] = useState<SortColumn>('displayName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Selection states
  const [editingRecord, setEditingRecord] = useState<UnifiedUserRecord | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<UnifiedUserRecord | null>(null);
  const [selectedMentorUid, setSelectedMentorUid] = useState<string>('');
  const [mentorSearchText, setMentorSearchText] = useState('');
  const [viewingMentorStudents, setViewingMentorStudents] = useState<UnifiedUserRecord | null>(null);

  // Form states for manual editing modal
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STUDENT');
  const [editDepartment, setEditDepartment] = useState<Department>('CSE');
  const [editRegNo, setEditRegNo] = useState('');
  const [editYear, setEditYear] = useState<'I' | 'II' | 'III' | 'IV' | ''>('III');
  const [editSection, setEditSection] = useState('A');
  const [editMentorEmail, setEditMentorEmail] = useState('');

  // 1. Combine users and registry into a unified list
  const unifiedList = useMemo(() => {
    const list: UnifiedUserRecord[] = [];
    const activeUserEmails = new Set<string>();

    users.forEach((u) => {
      activeUserEmails.add(u.email.toLowerCase());
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
        isActive: u.isActive,
        source: 'users',
        createdAt: typeof u.createdAt === 'string' ? u.createdAt : '',
        rawProfile: u,
      });
    });

    registry.forEach((r) => {
      if (!activeUserEmails.has(r.email.toLowerCase())) {
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
          isLinked: r.isLinked,
          isActive: true,
          source: 'imported_users',
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
          rawRegistry: r,
        });
      }
    });

    return list;
  }, [users, registry]);

  // 2. Resolve eligible mentors (role === 'MENTOR') from both users and registry dynamically
  const unifiedMentors = useMemo(() => {
    const list: { uid: string; displayName: string; email: string; department: Department }[] = [];
    const activeEmails = new Set<string>();

    users.forEach((u) => {
      if (u.role === 'MENTOR') {
        activeEmails.add(u.email.toLowerCase());
        list.push({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          department: u.department,
        });
      }
    });

    registry.forEach((r) => {
      if (r.role === 'MENTOR' && !activeEmails.has(r.email.toLowerCase())) {
        list.push({
          uid: r.linkedUid || r.id || r.email,
          displayName: r.displayName,
          email: r.email,
          department: r.department,
        });
      }
    });

    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users, registry]);

  // 3. Helper to fetch students assigned to a specific mentor
  const getStudentsForMentor = (mentorEmail: string, mentorUid?: string) => {
    return unifiedList.filter((item) => {
      if (item.role !== 'STUDENT') return false;
      const matchEmail = item.mentorEmail && item.mentorEmail.trim().toLowerCase() === mentorEmail.toLowerCase();
      const matchUid = mentorUid && item.rawProfile?.mentorUid === mentorUid;
      return matchEmail || matchUid;
    });
  };

  // 4. Filtering Logic
  const filteredList = useMemo(() => {
    return unifiedList.filter((item) => {
      // 1. Role switcher tab filter
      if (activeSection === 'STUDENT') {
        if (item.role !== 'STUDENT') return false;
      } else if (activeSection === 'STAFF') {
        if (item.role !== 'MENTOR') return false;
      } else if (activeSection === 'HOD') {
        if (item.role !== 'HOD') return false;
      } else if (activeSection === 'MANAGEMENT') {
        if (!['SUPER_ADMIN', 'PRINCIPAL', 'ACADEMIC_COORDINATOR'].includes(item.role)) return false;
      }

      // 2. Department filter
      if (departmentFilter !== 'ALL' && item.department !== departmentFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL') {
        const isLinked = item.isLinked;
        if (statusFilter === 'ACTIVE' && !isLinked) return false;
        if (statusFilter === 'INACTIVE' && isLinked) return false;
      }

      // 4. Student-specific Mentor filter
      if (activeSection === 'STUDENT' && studentMentorFilter !== 'ALL') {
        const hasMentor = item.mentorEmail && item.mentorEmail.trim() !== '' && item.mentorName !== 'Unassigned Mentor';
        if (studentMentorFilter === 'ASSIGNED' && !hasMentor) return false;
        if (studentMentorFilter === 'UNASSIGNED' && hasMentor) return false;
      }

      // 5. Smart search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      if (activeSection === 'STUDENT') {
        return (
          item.displayName.toLowerCase().includes(q) ||
          item.registerNumber?.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        );
      } else {
        return (
          item.displayName.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        );
      }
    });
  }, [unifiedList, activeSection, departmentFilter, statusFilter, studentMentorFilter, searchQuery]);

  // 5. Sorting Logic
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let valA: string | boolean = a[sortColumn] || '';
      let valB: string | boolean = b[sortColumn] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredList, sortColumn, sortDirection]);

  // 6. Pagination Slice
  const totalPages = Math.ceil(sortedList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, currentPage, pageSize]);

  // Helper resets
  const handleSectionSwitch = (section: SwitcherSection) => {
    setActiveSection(section);
    setSearchQuery('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setStudentMentorFilter('ALL');
    setCurrentPage(1);
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1 inline" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#2f5da8] ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2f5da8] ml-1 inline" />
    );
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Modals Actions
  const openEditModal = (rec: UnifiedUserRecord) => {
    setEditingRecord(rec);
    setEditName(rec.displayName);
    setEditEmail(rec.email);
    setEditRole(rec.role);
    setEditDepartment(rec.department);
    setEditRegNo(rec.registerNumber || '');
    setEditYear((rec.year as any) || 'III');
    setEditSection(rec.section || 'A');
    setEditMentorEmail(rec.mentorEmail || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const updates = {
      displayName: editName,
      email: editEmail,
      role: editRole,
      department: editDepartment,
      registerNumber: editRegNo || undefined,
      year: editYear as any || undefined,
      section: editSection || undefined,
      mentorEmail: editMentorEmail || undefined,
    };

    if (editingRecord.source === 'users') {
      onUpdateUser(editingRecord.id, updates as Partial<UserProfile>);
    } else {
      onUpdateRegistry(editingRecord.id, updates as Partial<ImportedUserRecord>);
    }

    setEditingRecord(null);
  };

  const handleDelete = (rec: UnifiedUserRecord) => {
    if (rec.role === 'SUPER_ADMIN') {
      alert('This SUPER_ADMIN account is protected and cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete/deactivate ${rec.displayName}?`)) {
      if (rec.source === 'users') {
        onSoftDeleteUser(rec.id);
      } else {
        onDeleteRegistry(rec.id);
      }
    }
  };

  const openAssignMentorModal = (rec: UnifiedUserRecord) => {
    setAssigningStudent(rec);
    setMentorSearchText('');

    let matchedMentorUid = '';
    if (rec.rawProfile?.mentorUid) {
      matchedMentorUid = rec.rawProfile.mentorUid;
    } else if (rec.mentorEmail) {
      const found = unifiedMentors.find(
        (m) => m.email.toLowerCase() === rec.mentorEmail?.toLowerCase()
      );
      if (found) {
        matchedMentorUid = found.uid;
      }
    }
    setSelectedMentorUid(matchedMentorUid);
  };

  const handleAssignMentorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStudent || !selectedMentorUid) return;
    const selectedMentor = unifiedMentors.find((m) => m.uid === selectedMentorUid);
    if (!selectedMentor) return;

    if (assigningStudent.source === 'users') {
      onAssignMentor(assigningStudent.id, {
        uid: selectedMentor.uid,
        displayName: selectedMentor.displayName,
        email: selectedMentor.email,
        role: 'MENTOR',
        department: selectedMentor.department,
        isActive: true,
        isDeleted: false,
      } as UserProfile);
    } else {
      onUpdateRegistry(assigningStudent.id, {
        mentorEmail: selectedMentor.email,
      });
    }

    setAssigningStudent(null);
    setSelectedMentorUid('');
  };

  // Filter mentors search inline in the assign mentor modal
  const filteredMentorsForDropdown = useMemo(() => {
    return unifiedMentors.filter((m) => {
      const q = mentorSearchText.toLowerCase().trim();
      if (!q) return true;
      return m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [unifiedMentors, mentorSearchText]);

  // Analytics Cards Renderer
  const renderSummaryCards = () => {
    const rawList = unifiedList.filter((item) => {
      if (activeSection === 'STUDENT') return item.role === 'STUDENT';
      if (activeSection === 'STAFF') return item.role === 'MENTOR';
      if (activeSection === 'HOD') return item.role === 'HOD';
      return ['SUPER_ADMIN', 'PRINCIPAL', 'ACADEMIC_COORDINATOR'].includes(item.role);
    });

    if (activeSection === 'STUDENT') {
      const total = rawList.length;
      const assigned = rawList.filter(
        (item) =>
          item.mentorEmail &&
          item.mentorEmail.trim() !== '' &&
          item.mentorName !== 'Unassigned Mentor'
      ).length;
      const unassigned = total - assigned;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Students
              </span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[#2f5da8] dark:text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Assigned Mentor
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{assigned}</span>
            </div>
            <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/40 text-green-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Unassigned Mentor
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{unassigned}</span>
            </div>
            <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'STAFF') {
      const total = rawList.length;
      const assigned = rawList.filter((item) => getStudentsForMentor(item.email, item.id).length > 0).length;
      const unassigned = total - assigned;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Staff
              </span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Assigned Mentors
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{assigned}</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Unassigned Mentors
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{unassigned}</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Regular Staff
              </span>
              <span className="text-lg font-bold text-gray-500 dark:text-gray-400">0</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'HOD') {
      const total = rawList.length;
      return (
        <div className="grid grid-cols-1 gap-3 text-left">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between max-w-xs">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total HODs
              </span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[#2f5da8]">
              <Building className="w-5 h-5" />
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'MANAGEMENT') {
      const total = rawList.length;
      return (
        <div className="grid grid-cols-1 gap-3 text-left">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between max-w-xs">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Management Accounts
              </span>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{total}</span>
            </div>
            <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 text-left">
      {/* 1. TOP ROLE SWITCHER SEGMENTED TABS */}
      <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-lg inline-flex gap-1 border border-gray-300 dark:border-gray-600 w-full sm:w-auto">
        {(
          [
            { id: 'STUDENT', label: 'Students' },
            { id: 'STAFF', label: 'Staff' },
            { id: 'HOD', label: 'HODs' },
            { id: 'MANAGEMENT', label: 'Management' },
          ] as const
        ).map((tab) => {
          const isSelected = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSectionSwitch(tab.id)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#2f5da8] text-white shadow-xs'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. LIGHTWEIGHT ANALYTICS CARDS */}
      {renderSummaryCards()}

      {/* 3. SEARCH & SECONDARY FILTER BAR */}
      <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Smart placeholder search input */}
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
                  ? 'Search students by name, reg no, email...'
                  : 'Search staff by name, email...'
              }
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
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

            {/* Status dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Account</option>
                <option value="INACTIVE">Pre-Registered</option>
              </select>
            </div>

            {/* Student specific filter option */}
            {activeSection === 'STUDENT' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Mentor:</span>
                <select
                  value={studentMentorFilter}
                  onChange={(e) => {
                    setStudentMentorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-[#2f5da8] cursor-pointer"
                >
                  <option value="ALL">All Students</option>
                  <option value="ASSIGNED">Assigned Mentor</option>
                  <option value="UNASSIGNED">Unassigned Mentor</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DYNAMIC TABLES BY ROLE */}
      <div className="overflow-x-auto w-full max-w-full bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs custom-scrollbar">
        <table className="min-w-[850px] w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#E2E8F0] dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 uppercase font-bold text-[11px] tracking-wider select-none">
              <th
                className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap"
                onClick={() => handleSort('displayName')}
              >
                Name {renderSortIcon('displayName')}
              </th>
              <th
                className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap"
                onClick={() => handleSort('email')}
              >
                College Email {renderSortIcon('email')}
              </th>
              {activeSection !== 'HOD' && (
                <th
                  className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap"
                  onClick={() => handleSort('role')}
                >
                  {activeSection === 'STUDENT' ? 'Register Number' : 'Role Badge'} {renderSortIcon('role')}
                </th>
              )}
              <th
                className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap"
                onClick={() => handleSort('department')}
              >
                Department {renderSortIcon('department')}
              </th>
              {activeSection === 'STUDENT' && <th className="p-3 whitespace-nowrap">Current Mentor</th>}
              {activeSection === 'STAFF' && <th className="p-3 text-center whitespace-nowrap">Assigned Students</th>}
              <th
                className="p-3 cursor-pointer hover:text-blue-900 dark:hover:text-white whitespace-nowrap"
                onClick={() => handleSort('isLinked')}
              >
                Status {renderSortIcon('isLinked')}
              </th>
              <th className="p-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200 font-medium">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400 text-xs">
                  No records match selected section filters.
                </td>
              </tr>
            ) : (
              paginatedList.map((rec) => {
                const isSuperAdmin = rec.role === 'SUPER_ADMIN';
                const isStudent = rec.role === 'STUDENT';
                const isStaff = rec.role === 'MENTOR';

                // Resolve Staff Specific Badges
                let staffBadge = <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Staff</span>;
                let studentCount = 0;

                if (isStaff) {
                  studentCount = getStudentsForMentor(rec.email, rec.id).length;
                  if (studentCount > 0) {
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

                // Resolve Student Mentorship status
                const isUnassigned =
                  isStudent &&
                  (!rec.mentorEmail ||
                    rec.mentorEmail.trim() === '' ||
                    rec.mentorName === 'Unassigned Mentor');

                return (
                  <tr key={rec.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40 transition-colors">
                    {/* Name */}
                    <td className="p-3 font-semibold text-gray-900 dark:text-white">{rec.displayName}</td>

                    {/* Email */}
                    <td className="p-3 font-mono text-[#2f5da8] dark:text-blue-300 font-semibold">{rec.email}</td>

                    {/* Role / Reg No column */}
                    {activeSection !== 'HOD' && (
                      <td className="p-3">
                        {activeSection === 'STUDENT' ? (
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {rec.registerNumber || 'N/A'} <span className="text-[10px] text-gray-400 font-normal">({rec.year || 'III'}-{rec.section || 'A'})</span>
                          </div>
                        ) : activeSection === 'STAFF' ? (
                          staffBadge
                        ) : (
                          // Management Badge
                          <span className="font-semibold text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            {ROLE_LABELS[rec.role] || rec.role}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Department */}
                    <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{rec.department}</td>

                    {/* Student Current Mentor Column */}
                    {activeSection === 'STUDENT' && (
                      <td className="p-3">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Unassigned
                          </span>
                        ) : (
                          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold truncate max-w-[150px]" title={rec.mentorName || rec.mentorEmail}>
                            {rec.mentorName || rec.mentorEmail}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Staff student list column */}
                    {activeSection === 'STAFF' && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setViewingMentorStudents(rec)}
                          className="px-2 py-1 rounded text-xs font-bold text-[#2f5da8] dark:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer underline decoration-dotted"
                          title="Click to view students list"
                        >
                          {studentCount} Student(s)
                        </button>
                      </td>
                    )}

                    {/* Status Badge */}
                    <td className="p-3">
                      {rec.isLinked ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="warning">Pre-Reg</Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isStudent && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAssignMentorModal(rec)}
                            title="Assign / Reassign Faculty Mentor"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[#2f5da8] mr-1 shrink-0" /> Mentor
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(rec)}
                          title="Edit User Details"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#2f5da8] mr-1" /> Edit
                        </Button>

                        {isSuperAdmin ? (
                          <div title="This account cannot be deleted.">
                            <Button
                              variant="danger"
                              size="sm"
                              disabled
                              className="opacity-40 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5 mr-1" /> Protected
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(rec)}
                            title="Delete / Deactivate Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. STANDARDIZED PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedList.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[10, 25, 50]}
      />

      {/* Modal - Assign Mentor */}
      <Modal
        isOpen={!!assigningStudent}
        onClose={() => setAssigningStudent(null)}
        title={`Assign Faculty Mentor to ${assigningStudent?.displayName}`}
      >
        <form onSubmit={handleAssignMentorSubmit} className="space-y-4 text-xs text-left">
          <div className="p-3 bg-blue-50 dark:bg-gray-700/60 rounded-md border border-blue-200 dark:border-gray-600">
            <p className="font-semibold text-[#2f5da8] dark:text-blue-300">{assigningStudent?.displayName}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Reg: {assigningStudent?.registerNumber || 'N/A'} • Dept: {assigningStudent?.department}
            </p>
          </div>

          {/* Search Box inside Selector Dropdown */}
          <div className="space-y-1">
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Search Faculty Mentor</label>
            <input
              type="text"
              placeholder="Type name or email to filter list..."
              value={mentorSearchText}
              onChange={(e) => setMentorSearchText(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Select Faculty Mentor *</label>
            <select
              required
              value={selectedMentorUid}
              onChange={(e) => setSelectedMentorUid(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#2f5da8]"
            >
              <option value="">-- Choose Faculty Mentor ({filteredMentorsForDropdown.length} options) --</option>
              {filteredMentorsForDropdown.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName} ({m.email}) — [{m.department}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setAssigningStudent(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!selectedMentorUid}>
              Save Mentor Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Mentees Click-through list */}
      <Modal
        isOpen={!!viewingMentorStudents}
        onClose={() => setViewingMentorStudents(null)}
        title={`Students Assigned to ${viewingMentorStudents?.displayName}`}
      >
        <div className="space-y-3.5 text-xs text-left">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600">
            <p className="text-[11px] text-gray-500">Mentor College Email</p>
            <p className="font-semibold text-gray-900 dark:text-white">{viewingMentorStudents?.email}</p>
          </div>

          <div className="overflow-x-auto w-full max-w-full border border-gray-200 dark:border-gray-700 rounded-md max-h-80 overflow-y-auto custom-scrollbar">
            <table className="min-w-[500px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Reg Number</th>
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5">Year / Sec</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
                {viewingMentorStudents &&
                  (getStudentsForMentor(viewingMentorStudents.email, viewingMentorStudents.id).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">
                        No students currently assigned to this mentor.
                      </td>
                    </tr>
                  ) : (
                    getStudentsForMentor(viewingMentorStudents.email, viewingMentorStudents.id).map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="p-2.5 font-bold text-gray-900 dark:text-white">{student.displayName}</td>
                        <td className="p-2.5 font-mono">{student.registerNumber || 'N/A'}</td>
                        <td className="p-2.5">{student.department}</td>
                        <td className="p-2.5">
                          {student.year || 'III'} - {student.section || 'A'}
                        </td>
                        <td className="p-2.5">
                          {student.isLinked ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="warning">Pre-Reg</Badge>
                          )}
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

      {/* Modal - Edit User Record */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={`Edit User Record: ${editingRecord?.displayName}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs text-left">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">College Email *</label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Role *</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
              >
                <option value="STUDENT">Student</option>
                <option value="MENTOR">Faculty Mentor</option>
                <option value="HOD">HOD</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Department *</label>
              <select
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value as Department)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
              >
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="IT">IT</option>
                <option value="AI_DS">AI_DS</option>
              </select>
            </div>
          </div>

          {editRole === 'STUDENT' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Register Number</label>
                  <input
                    type="text"
                    value={editRegNo}
                    onChange={(e) => setEditRegNo(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Year</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
                  >
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Section</label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Mentor Email</label>
                <input
                  type="email"
                  placeholder="mentor@fx.edu.in"
                  value={editMentorEmail}
                  onChange={(e) => setEditMentorEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2f5da8]"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingRecord(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
