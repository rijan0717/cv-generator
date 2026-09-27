import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';

/**
 * The application frame.
 *
 * A signed-in user gets a left sidebar carrying every module, because the
 * list is long enough that a row of header links would wrap and stop being
 * scannable. A visitor gets no sidebar: there is nothing to navigate to
 * until they have an account, and the landing page should be full width.
 *
 * Below large screens the sidebar becomes a drawer over the content rather
 * than squeezing it.
 */
export default function Layout() {
  const { isAuthenticated } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Lets a keyboard user jump past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-slate-100 dark:focus:text-slate-900"
      >
        Skip to content
      </a>

      <Topbar
        showMenuButton={isAuthenticated}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((open) => !open)}
      />

      <div className="flex flex-1">
        {isAuthenticated && (
          <>
            {/* Permanent sidebar from large screens up. */}
            <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-700 dark:bg-slate-900">
              <div className="sticky top-14">
                <Sidebar />
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
                  <Sidebar onNavigate={closeDrawer} />
                </aside>
              </>
            )}
          </>
        )}

        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
