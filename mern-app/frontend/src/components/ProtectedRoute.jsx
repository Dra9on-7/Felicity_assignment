import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component
 * Protects routes that require authentication and/or specific roles
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check role-based access
  if (roles.length > 0 && !roles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user?.role === 'admin' 
      ? '/admin/dashboard'
      : user?.role === 'organizer'
        ? '/organizer/dashboard'
        : '/dashboard';
    
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

/**
 * PublicOnlyRoute component
 * For routes that should only be accessible when NOT logged in (login, register)
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect authenticated users to their dashboard
    const redirectPath = user?.role === 'admin' 
      ? '/admin/dashboard'
      : user?.role === 'organizer'
        ? '/organizer/dashboard'
        : '/dashboard';
    
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
