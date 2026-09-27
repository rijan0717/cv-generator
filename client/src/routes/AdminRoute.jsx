import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * Guards the admin area.
 *
 * A visitor who is not logged in goes to the login page; a logged-in user who
 * is not an admin goes to their own dashboard rather than the login page,
 * because logging in again would not help them.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-500">
        <Spinner label="Checking your permissions" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
