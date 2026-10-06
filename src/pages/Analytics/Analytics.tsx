import React from 'react';
import {
  Users,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  FileX,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { useAllODRequests } from '../../hooks/useODRequests';
import { useAllUsers } from '../../hooks/useUserManagement';
import { Card } from '../../components/common/Card';
import { Loader } from '../../components/common/Loader';

export const Analytics: React.FC = () => {
  const { data: requests = [], isLoading: isLoadingODs } = useAllODRequests();
  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers();

  const isLoading = isLoadingODs || isLoadingUsers;

  // 1. User Demographics Metrics
  const totalUsers = users.length;
  const totalStudents = users.filter((u) => u.role === 'STUDENT').length;
  const totalStaff = users.filter((u) => u.role !== 'STUDENT').length;
  const totalMentors = users.filter((u) => u.role === 'MENTOR').length;
  const totalHODs = users.filter((u) => u.role === 'HOD').length;
  const totalDepartments = Array.from(new Set(users.map((u) => u.department))).length || 7;

  // 2. Lifecycle Metrics
  const getStatus = (r: any) => typeof r.status === 'object' ? r.status.overall : r.status;
  const totalRequests = requests.length;
  const pendingMentor = requests.filter((r) => getStatus(r) === 'PENDING').length;
  const pendingHOD = requests.filter((r) => getStatus(r) === 'MENTOR_APPROVED').length;
  const approvedODs = requests.filter((r) => getStatus(r) === 'HOD_APPROVED').length;
  const rejectedODs = requests.filter(
    (r) => getStatus(r) === 'MENTOR_REJECTED' || getStatus(r) === 'HOD_REJECTED'
  ).length;
  const withdrawnODs = requests.filter((r) => getStatus(r) === 'WITHDRAWN').length;
  const expiredODs = requests.filter((r) => getStatus(r) === 'EXPIRED').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTodayODs = requests.filter((r) => {
    if (getStatus(r) !== 'HOD_APPROVED') return false;
    const start = r.startDate;
    const end = r.endDate || r.startDate;
    return todayStr >= start && todayStr <= end;
  }).length;

  // 3. Time Window Metrics
  const todaysApproved = requests.filter(
    (r) => getStatus(r) === 'HOD_APPROVED' && r.startDate === todayStr
  ).length;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeeksODs = requests.filter((r) => {
    const created = r.createdAt ? new Date(r.createdAt as any) : new Date(r.startDate);
    return created >= sevenDaysAgo;
  }).length;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const thisMonthsODs = requests.filter((r) => {
    const created = r.createdAt ? new Date(r.createdAt as any) : new Date(r.startDate);
    return created.getFullYear() === currentYear && created.getMonth() === currentMonth;
  }).length;

  const approvalRate = totalRequests > 0 ? Math.round((approvedODs / totalRequests) * 100) : 0;

  // 4. Departmental Distributions
  const deptCounts: Record<string, number> = {};
  requests.forEach((r) => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  // 5. Category Distributions
  const typeCounts: Record<string, number> = {};
  requests.forEach((r) => {
    const key = r.odType || 'Full Day';
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });

  if (isLoading) {
    return <Loader label="Computing institutional Super Admin analytics..." />;
  }

  return (
    <div className="space-y-5">
      {/* Header Overview Banner */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2f5da8] dark:text-blue-400" />
            Super Admin Institutional Analytics
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            System-wide overview of user demographics, OD lifecycle metrics, sanction rates, and departmental distributions.
          </p>
        </div>
        <div className="bg-[#2f5da8]/10 dark:bg-blue-950/40 text-[#2f5da8] dark:text-blue-300 border border-[#2f5da8]/20 px-3 py-1.5 rounded-md text-xs font-bold shrink-0">
          Institutional Sanction Rate: {approvalRate}%
        </div>
      </div>

      {/* Group 1: User Demographics Overview */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          User & Identity Demographics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total Users</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{totalUsers}</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
          </Card>
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Students</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[#2f5da8] dark:text-blue-400">{totalStudents}</span>
              <GraduationCap className="w-4 h-4 text-[#2f5da8] dark:text-blue-400" />
            </div>
          </Card>
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total Staff</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{totalStaff}</span>
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </Card>
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Mentors</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-teal-600 dark:text-teal-400">{totalMentors}</span>
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </Card>
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">HODs</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{totalHODs}</span>
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Departments</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-700 dark:text-gray-200">{totalDepartments}</span>
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
          </Card>
        </div>
      </div>

      {/* Group 2: OD Lifecycle Overview */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          OD Lifecycle & Approval Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Active Today</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-green-600 dark:text-green-400">{activeTodayODs}</span>
              <Activity className="w-4 h-4 text-green-600" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Pending Mentor</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-amber-500">{pendingMentor}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Pending HOD</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{pendingHOD}</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Approved</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-green-600 dark:text-green-400">{approvedODs}</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Rejected</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-red-600 dark:text-red-400">{rejectedODs}</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Withdrawn</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-500 dark:text-gray-400">{withdrawnODs}</span>
              <FileX className="w-4 h-4 text-gray-400" />
            </div>
          </Card>

          <Card className="p-3.5 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Expired</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{expiredODs}</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </Card>
        </div>
      </div>

      {/* Group 3: Time Window Volume Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 space-y-1 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-gray-800 dark:to-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider block">Today's Approved ODs</span>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold text-[#2f5da8] dark:text-blue-300">{todaysApproved}</h3>
            <Calendar className="w-5 h-5 text-[#2f5da8] dark:text-blue-400" />
          </div>
          <p className="text-[10px] text-gray-400">OD applications sanctioned for today ({todayStr})</p>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-r from-teal-50/50 to-emerald-50/30 dark:from-gray-800 dark:to-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider block">This Week's Volume</span>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold text-teal-700 dark:text-teal-300">{thisWeeksODs}</h3>
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-[10px] text-gray-400">Applications submitted in the last 7 calendar days</p>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-r from-purple-50/50 to-pink-50/30 dark:from-gray-800 dark:to-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider block">This Month's Volume</span>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold text-purple-700 dark:text-purple-300">{thisMonthsODs}</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-[10px] text-gray-400">Applications created in current calendar month</p>
        </Card>
      </div>

      {/* Group 4: Visual Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Breakdown */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="text-[#2f5da8] dark:text-blue-400 w-4 h-4" /> Departmental Volume Distribution
          </h3>
          <div className="space-y-2.5">
            {Object.entries(deptCounts).map(([dept, count]) => {
              const pct = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200">{dept}</span>
                    <span className="text-[#2f5da8] dark:text-blue-300">{count} requests ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2f5da8] dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OD Category Breakdown */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <PieChart className="text-[#2f5da8] dark:text-blue-400 w-4 h-4" /> Category Volume Distribution
          </h3>
          <div className="space-y-2.5">
            {Object.entries(typeCounts).map(([cat, count]) => {
              const pct = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200">{cat}</span>
                    <span className="text-[#2f5da8] dark:text-blue-300">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
