import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = localStorage.getItem('scoto_auth_token');
  const userStr = localStorage.getItem('scoto_auth_user');

  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }

  // If not authenticated, redirect to login page
  if (!token || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check role permissions if specified
  const effectiveRole = user.role || user.role_code || 'SystemAdmin';
  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

