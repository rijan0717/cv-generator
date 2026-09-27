import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * Guards routes that require a logged-in user.
 *
 * Client-side guards are for convenience only — they stop a visitor seeing a
 * page that would not work. The real protection is on the server, where every
 * route checks the session cookie and the ownership of the resource.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While the start-up "who am I" request is in flight we know nothing yet.
  // Redirecting now would throw a logged-in user out on every page refresh.
  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // `state.from` lets the login page send the user back where they meant
    // to go, and `replace` keeps the guarded URL out of the history.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
