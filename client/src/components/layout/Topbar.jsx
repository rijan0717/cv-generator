import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Button from '../ui/Button.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

/**
 * The slim bar across the top.
 *
 * It carries only what belongs everywhere: the brand, the theme switch, and
 * who is signed in. Every module now lives in the sidebar, so this stays
 * the same height whatever is added to the application.
 *
 * @param {{showMenuButton: boolean, isDrawerOpen: boolean,
 *          onToggleDrawer: () => void}} props
 */
export default function Topbar({ showMenuButton, isDrawerOpen, onToggleDrawer }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  /** Logs out and returns to the home page. */
  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex h-full items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          {/* Only shown when there is a sidebar to open. */}
          {showMenuButton && (
            <button
              type="button"
              aria-expanded={isDrawerOpen}
              aria-label={isDrawerOpen ? 'Close navigation' : 'Open navigation'}
              onClick={onToggleDrawer}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth="2"
                  d={isDrawerOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'}
                />
              </svg>
            </button>
          )}

          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            >
              CV
            </span>
            <span className="hidden sm:inline">Smart CV Generator</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
              <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-400">
                {user.name}
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
