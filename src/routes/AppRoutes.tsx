import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Login } from '../pages/Login/Login';
import { ProtectedRoute } from './ProtectedRoute';
import { Loader } from '../components/common/Loader';

// Code-split route pages to optimize initial bundle delivery
const Dashboard = React.lazy(() => import('../pages/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const ApplyOD = React.lazy(() => import('../pages/Student/ApplyOD').then((m) => ({ default: m.ApplyOD })));
const MyRequests = React.lazy(() => import('../pages/Student/MyRequests').then((m) => ({ default: m.MyRequests })));
const StudentNotifications = React.lazy(() => import('../pages/Student/Notifications').then((m) => ({ default: m.StudentNotifications })));
const StudentsUnderMe = React.lazy(() => import('../pages/Mentor/StudentsUnderMe').then((m) => ({ default: m.StudentsUnderMe })));
const MentorPending = React.lazy(() => import('../pages/Mentor/PendingApprovals').then((m) => ({ default: m.PendingApprovals })));
const MentorHistory = React.lazy(() => import('../pages/Mentor/History').then((m) => ({ default: m.MentorHistory })));
const DepartmentStudents = React.lazy(() => import('../pages/HOD/DepartmentStudents').then((m) => ({ default: m.DepartmentStudents })));
const HODPending = React.lazy(() => import('../pages/HOD/PendingApprovals').then((m) => ({ default: m.HODPendingApprovals })));
const HODHistory = React.lazy(() => import('../pages/HOD/ApprovedHistory').then((m) => ({ default: m.HODHistory })));
const UserManagement = React.lazy(() => import('../pages/Admin/UserManagement').then((m) => ({ default: m.UserManagement })));
const AuditLogs = React.lazy(() => import('../pages/Admin/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const HistoricalODViewer = React.lazy(() => import('../pages/Admin/HistoricalODViewer').then((m) => ({ default: m.HistoricalODViewer })));
const Analytics = React.lazy(() => import('../pages/Analytics/Analytics').then((m) => ({ default: m.Analytics })));
const Profile = React.lazy(() => import('../pages/Profile/Profile').then((m) => ({ default: m.Profile })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loader label="Loading..." />}>
      <Routes>
        {/* Public Login Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Layout Group */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />

            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
              <Route path="/student/requests" element={<MyRequests />} />
              <Route path="/student/apply" element={<ApplyOD />} />
              <Route path="/student/history" element={<Navigate to="/student/requests" replace />} />
              <Route path="/student/notifications" element={<StudentNotifications />} />
            </Route>

            {/* Mentor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['MENTOR']} />}>
              <Route path="/mentor/students" element={<StudentsUnderMe />} />
              <Route path="/mentor/pending" element={<MentorPending />} />
              <Route path="/mentor/history" element={<MentorHistory />} />
            </Route>

            {/* HOD Routes */}
            <Route element={<ProtectedRoute allowedRoles={['HOD']} />}>
              <Route path="/hod/students" element={<DepartmentStudents />} />
              <Route path="/hod/pending" element={<HODPending />} />
              <Route path="/hod/history" element={<HODHistory />} />
            </Route>

            {/* Admin & Management Routes */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['SUPER_ADMIN', 'PRINCIPAL', 'ACADEMIC_COORDINATOR']}
                />
              }
            >
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/audit" element={<AuditLogs />} />
              <Route path="/admin/history" element={<HistoricalODViewer />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
