import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Spinner from '../components/ui/Spinner.jsx';
import HomePage from '../pages/HomePage.jsx';
import { homePathFor } from '../utils/homePath.js';

/**
 * Decides what "/" shows.
 *
 * The landing page is written for a visitor who has not signed up yet. A user
 * who is still signed in — a bookmark, or a tab opened again days later — has
 * no use for it, so they go straight to their own home page instead: the admin
 * overview, their company, My CVs, or the one-time "who are you?" step.
 */
export default function HomeRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Wait for the start-up "who am I" request to finish. Rendering now would
  // show the landing page for a moment before redirecting, and a session that
  // has quietly expired would look live until the answer came back.
  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to={homePathFor(user)} replace />;

  return <HomePage />;
}
