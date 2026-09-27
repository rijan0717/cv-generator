import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

/**
 * Shared page frame: navigation bar, page content and footer.
 *
 * It is used as a layout route, so child routes render into `<Outlet />`
 * without each page having to import the navigation itself.
 */
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Lets a keyboard user jump past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
