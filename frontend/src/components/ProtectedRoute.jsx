import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

export function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  if (booting) {
    return (
      <div className="h-screen flex items-center justify-center bg-void">
        <Spinner size={28} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Renders children only if the current user's role is in `roles`; otherwise renders nothing (or `fallback`). */
export function RoleGate({ roles, children, fallback = null }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return fallback;
  return children;
}
