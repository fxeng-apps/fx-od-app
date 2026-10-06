import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/user';
import { Loader } from '../components/common/Loader';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { firebaseUser, userProfile, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAEDF2] dark:bg-[#0B1120] flex items-center justify-center">
        <Loader label="Verifying institutional security credentials..." />
      </div>
    );
  }

  // Not authenticated or no valid Firestore user record -> Redirect to Login Gate
  if (!firebaseUser || !userProfile) {
    return <Navigate to="/" replace />;
  }

  // If role restricted route, check active role
  if (allowedRoles && activeRole && !allowedRoles.includes(activeRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
