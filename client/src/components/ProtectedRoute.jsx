import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD_MAP } from '../constants/roles';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 36 }}>
          sync
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // If allowedRoles is specified, check the user's role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's own dashboard
    const dashboardPath = ROLE_DASHBOARD_MAP[user.role] || '/signin';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
}