import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Login } from '../pages/Login/Login';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { ApplyOD } from '../pages/Student/ApplyOD';
import { MyRequests } from '../pages/Student/MyRequests';
import { StudentNotifications } from '../pages/Student/Notifications';
import { StudentsUnderMe } from '../pages/Mentor/StudentsUnderMe';
import { PendingApprovals as MentorPending } from '../pages/Mentor/PendingApprovals';
import { MentorHistory } from '../pages/Mentor/History';
import { DepartmentStudents } from '../pages/HOD/DepartmentStudents';
import { HODPendingApprovals as HODPending } from '../pages/HOD/PendingApprovals';
import { HODHistory } from '../pages/HOD/ApprovedHistory';
import { UserManagement } from '../pages/Admin/UserManagement';
import { AuditLogs } from '../pages/Admin/AuditLogs';
import { HistoricalODViewer } from '../pages/Admin/HistoricalODViewer';
import { Analytics } from '../pages/Analytics/Analytics';
import { Profile } from '../pages/Profile/Profile';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
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
  );
};
