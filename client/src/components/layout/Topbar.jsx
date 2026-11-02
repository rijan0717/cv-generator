import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useToast } from '../../context/useToast.js';
import Button from '../ui/Button.jsx';
import BrandMark from '../ui/BrandMark.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import NavMenu from './NavMenu.jsx';
import HeaderSearch from './HeaderSearch.jsx';
import { HEADER_MENUS, MENU_ICONS } from './menus.js';
import { homePathFor } from '../../utils/homePath.js';

/**
 * Up to two initials for the avatar: "Rijan Pariyar" -> "RP".
 * @param {string} name - The account name.
 * @returns {string} The initials.
 */
function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * The kind of account, in words, shown under the name.
 * @param {object} user - The signed-in user.
 * @returns {string} "Admin", "Employer" or "Job seeker".
 */
function roleLabel(user) {
  if (user.role === 'admin') return 'Admin';
  if (user.accountType === 'employer') return 'Employer';
  if (user.accountType === 'jobseeker') return 'Job seeker';
  return 'New account';
}

/**
 * The bar across the top.
 *
 * It shows two different things depending on who is looking:
 *
 *   - **A visitor** gets the public navigation — the three dropdown menus
 *     and the sign-up and log-in buttons. This is the front of the site,
 *     and somebody who has not signed up needs to be able to find out what
 *     is here without an account.
 *   - **A signed-in user** gets the bar it was before: the brand, the theme
 *     switch and who is signed in. Every module is in the sidebar for them,
 *     so repeating it across the top would be two navigations for one
 *     application.
 *
 * @param {{showMenuButton: boolean, isDrawerOpen: boolean,
 *          onToggleDrawer: () => void}} props
 */
export default function Topbar({ showMenuButton, isDrawerOpen, onToggleDrawer }) {
  const { isAuthenticated, user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The public menu on a phone, where there is no room for dropdowns.
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  useEffect(() => setIsPublicMenuOpen(false), [pathname]);

  // The search row under the bar, where there is no room for the box in it.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  useEffect(() => setIsSearchOpen(false), [pathname]);

  // The box sits in the bar once there is room beside everything else: a
  // visitor's bar also carries the three menus, so it needs a wider screen.
  const inlineSearchFrom = isAuthenticated ? 'md' : 'xl';

  /**
   * Logs out and returns to the home page.
   *
   * The move happens before the session is cleared: leaving a guarded page
   * first means ProtectedRoute never sees a signed-out user on it, so the
   * user lands on the home page rather than being bounced to /login on the
   * way there.
   */
  async function handleLogout() {
    navigate('/', { replace: true });
    await logout();
    toast.success('You have been logged out.');
  }

  // The blur is on a layer *inside* the header, not on the header itself.
  //
  // `backdrop-filter` makes whatever carries it a backdrop root, and the
  // dropdown panels are descendants of this header: with the filter on the
  // header, the panels composited against the blurred backdrop instead of
  // over the page, and the page showed straight through an open menu.
  //
  // On its own absolutely-positioned layer the filter has no descendants
  // to affect, so the translucent blurred bar is kept and the menus are
  // still painted over the page. `-z-10` puts it behind the bar's content
  // without taking it out of the header.
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-navy-700">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-white/80 backdrop-blur-md dark:bg-navy-900/80"
      />

      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-6">
          {/* Only shown when there is a sidebar to open. */}
          {showMenuButton && (
            <button
              type="button"
              aria-expanded={isDrawerOpen}
              aria-label={isDrawerOpen ? 'Close navigation' : 'Open navigation'}
              onClick={onToggleDrawer}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-100 dark:hover:bg-navy-800"
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
            to={isAuthenticated ? homePathFor(user) : '/'}
            aria-label="SmartCV, home"
            className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-fuchsia"
          >
            <BrandMark size="md" />
          </Link>

          {/* The site search, like the one in Dribbble's bar: between the
              brand and the menus. Narrower screens get the button on the
              right instead, which opens it as a row under the bar. */}
          <HeaderSearch
            className={`hidden w-full max-w-md ${
              inlineSearchFrom === 'md' ? 'md:block' : 'xl:block'
            }`}
          />

          {/* The public menus, on a wide screen. */}
          {!isAuthenticated && (
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {HEADER_MENUS.map((menu) => (
                <NavMenu key={menu.label} label={menu.label} items={menu.items} />
              ))}
            </nav>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-expanded={isSearchOpen}
            aria-controls="mobile-search"
            aria-label={isSearchOpen ? 'Close search' : 'Search'}
            onClick={() => setIsSearchOpen((open) => !open)}
            className={`rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-navy-800 ${
              inlineSearchFrom === 'md' ? 'md:hidden' : 'xl:hidden'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isSearchOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </>
              )}
            </svg>
          </button>

          {/* The admin's published pages used to sit here — About, How it
              works and anything else marked for the header. They are in
              the footer instead, and in the Explore menu where they fit.
              The right of the bar is for signing up and signing in, and a
              row of grey links beside them took the eye off both. */}
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-navy-700">
              {/* Who is signed in, and as what: one glance tells an admin
                  testing several accounts which one this tab is using. */}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-100 dark:hover:bg-navy-800"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 place-items-center rounded-full cvg-gradient-bg text-sm font-semibold text-white"
                  >
                    {initials(user.name)}
                  </span>
                )}
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">
                    {user.name}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-100">
                    {roleLabel(user)}
                  </span>
                </span>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <>
              {/* The two account buttons are now the only thing on this
                  side of the bar besides the theme switch, so they are
                  both drawn as buttons rather than one being a bare link.
                  Sign up carries the brand gradient because it is the
                  action the site wants; Log in is outlined, which keeps it
                  equally findable without competing.

                  Both are given explicit colours in each theme rather than
                  inheriting: an outlined button that only sets a border
                  disappears when the theme is toggled to dark. */}
              <Link
                to="/register"
                className="cvg-gradient-bg cvg-glow cvg-glow-hover hidden rounded-full px-5 py-2 text-sm font-bold text-white transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia sm:inline-block"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-bold text-slate-900 transition hover:border-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-600 dark:text-slate-50 dark:hover:border-slate-300 dark:hover:bg-navy-800"
              >
                Log in
              </Link>

              {/* The same menus, stacked, below `lg`. */}
              <button
                type="button"
                aria-expanded={isPublicMenuOpen}
                aria-controls="public-menu"
                aria-label={isPublicMenuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsPublicMenuOpen((open) => !open)}
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-100 dark:hover:bg-navy-800"
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
                    d={isPublicMenuOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'}
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {isSearchOpen && (
        <div
          id="mobile-search"
          className={`border-t border-slate-200 bg-white px-4 py-3 dark:border-navy-700 dark:bg-navy-900 ${
            inlineSearchFrom === 'md' ? 'md:hidden' : 'xl:hidden'
          }`}
        >
          <HeaderSearch autoFocus onDone={() => setIsSearchOpen(false)} />
        </div>
      )}

      {/* The stacked public menu. It replaces the dropdowns rather than
          repeating them, so a phone gets one list it can scroll instead of
          three menus it cannot hover. */}
      {!isAuthenticated && isPublicMenuOpen && (
        <div
          id="public-menu"
          className="max-h-[70vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 lg:hidden dark:border-navy-700 dark:bg-navy-900"
        >
          {HEADER_MENUS.map((menu) => (
            <div key={menu.label} className="mb-5 last:mb-0">
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-100">
                {menu.label}
              </p>
              <ul className="mt-1">
                {menu.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-navy-800"
                    >
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-brand-fuchsia dark:text-fuchsia-100"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={MENU_ICONS[item.icon]} />
                      </svg>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-100">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <Link
            to="/register"
            className="mt-2 block rounded-full cvg-gradient-bg px-5 py-2.5 text-center text-sm font-semibold text-white sm:hidden"
          >
            Sign up — it&apos;s free
          </Link>
        </div>
      )}
    </header>
  );
}
