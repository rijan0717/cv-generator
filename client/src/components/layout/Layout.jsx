import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';
import { needsAccountType } from '../../utils/homePath.js';

/** Where the collapsed/expanded choice is remembered between visits. */
const COLLAPSE_KEY = 'sidebar:collapsed';

/**
 * The application frame.
 *
 * It is an app shell, not a scrolling document: the frame is exactly the
 * height of the window and the main area scrolls inside it. That is what
 * stops the page jumping on every navigation — with the whole document
 * scrolling, moving from a long page to a short one left the window
 * scrolled past the end of the new content and the browser snapped it
 * back. Here the sidebar cannot move at all, and only the content pane
 * is returned to the top.
 *
 * The sidebar collapses to icons, and the choice is remembered: it is a
 * preference about how somebody wants to work, not per-page state, and
 * having to set it again on every visit would be worse than not
 * offering it.
 *
 * Below large screens the sidebar becomes a drawer over the content
 * rather than squeezing it.
 */
export default function Layout() {
  const { user, isAuthenticated } = useAuth();

  // No sidebar until the account type is chosen: the welcome step is the
  // only thing such an account can do, so it gets the whole page.
  const showSidebar = isAuthenticated && !needsAccountType(user);
  const { pathname } = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Read during the first render, so the sidebar is never drawn wide
    // and then snapped narrow.
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      // Private browsing, or storage disabled. Not a reason to fail.
      return false;
    }
  });

  const mainRef = useRef(null);

  // Each page starts at its own top. Without this the content pane keeps
  // the previous page's offset, so a short page opens part way down and
  // looks broken.
  useEffect(() => {
    // `scrollTo?.()`, because jsdom does not implement it on an element
    // and a test rendering the frame should not fail over a scroll.
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [pathname]);

  /** Collapses or expands the sidebar, and remembers which. */
  function toggleCollapsed() {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // The preference simply will not survive a reload.
      }
      return next;
    });
  }

  // The footer belongs to the public landing page only: a visitor on the
  // home route sees it, a signed-in user never does.
  const showFooter = pathname === '/' && !isAuthenticated;

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Lets a keyboard user jump past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-slate-100 dark:focus:text-slate-900"
      >
        Skip to content
      </a>

      <Topbar
        showMenuButton={showSidebar}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((open) => !open)}
      />

      {/* `min-h-0` is what lets the children scroll: without it a flex
          child refuses to shrink below its content, and the pane grows
          instead of scrolling. */}
      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <>
            {/* Permanent sidebar from large screens up. */}
            <aside
              className={[
                'relative hidden shrink-0 border-r border-slate-200 bg-white',
                'transition-[width] duration-200 ease-out lg:block',
                'dark:border-slate-700 dark:bg-slate-900',
                isCollapsed ? 'w-16' : 'w-60',
              ].join(' ')}
            >
              {/* The toggle sits on the border itself, which is where the
                  eye looks for the edge of a panel, and outside the
                  scrolling area so it never scrolls away. */}
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={isCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? 'Expand' : 'Collapse'}
                className="absolute -right-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isCollapsed ? '' : 'rotate-180'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              {/* The navigation scrolls on its own, so a long list never
                  pushes the bottom entries out of reach on a short
                  screen. `overscroll-contain` keeps that scroll from
                  continuing into the page behind it. */}
              <div className="h-full overflow-y-auto overscroll-contain">
                <Sidebar isCollapsed={isCollapsed} />
              </div>
            </aside>

            {/* A drawer below that. The backdrop is a real button so it can
                be dismissed with the keyboard as well as a tap. */}
            {isDrawerOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={closeDrawer}
                  className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
                />
                <aside className="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-200 bg-white pt-14 lg:hidden dark:border-slate-700 dark:bg-slate-900">
                  {/* Never collapsed in the drawer: it is hidden by
                      default there, so there is no space to win. */}
                  <Sidebar onNavigate={closeDrawer} />
                </aside>
              </>
            )}
          </>
        )}

        <main id="main" ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
          {showFooter && <Footer />}
        </main>
      </div>
    </div>
  );
}
