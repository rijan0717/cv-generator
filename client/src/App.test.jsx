import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import * as authApi from './api/auth.js';
import * as cvApi from './api/cvs.js';
import * as reviewApi from './api/reviews.js';
import * as applicationApi from './api/applications.js';
import * as jobApi from './api/jobs.js';

// The auth context calls the API on mount to find out who is logged in,
// and the job seeker's dashboard reads CVs, applications and saved jobs.
// Stubbing the modules keeps these tests independent of a running server.
vi.mock('./api/auth.js');
vi.mock('./api/cvs.js');
vi.mock('./api/reviews.js');
vi.mock('./api/applications.js');
vi.mock('./api/jobs.js');

/**
 * Renders the app at a given route inside the providers it needs.
 *
 * The toast provider is one of them: anything that reports an outcome —
 * logging out, saving, a refused form — reads it, so the tree cannot
 * mount without it, exactly as in main.jsx.
 *
 * @param {string} route - The initial URL.
 */
function renderAt(route) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('App routing', () => {
  describe('when nobody is logged in', () => {
    beforeEach(() => {
      // A 401 from /auth/me is the normal case for a visitor.
      authApi.getCurrentUser.mockRejectedValue(new Error('Authentication required'));
      reviewApi.listPublicReviews.mockResolvedValue({
        reviews: [],
        summary: { average: 0, count: 0 },
      });
    });

    it('shows the landing page at the home route', async () => {
      renderAt('/');

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /build a cv that gets you shortlisted/i,
        }),
      ).toBeInTheDocument();
    });

    it('offers a way to create an account', async () => {
      renderAt('/');

      // The header's "Get started" is a button, so the link is the one on
      // the landing page itself.
      const links = await screen.findAllByRole('link', { name: /get started/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/register');
    });

    it('shows the login page', async () => {
      renderAt('/login');

      expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    });

    it('redirects a guarded route to the login page', async () => {
      renderAt('/dashboard');

      expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    });

    it('shows a not-found page for an unknown route', async () => {
      renderAt('/no-such-page');

      expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    });
  });

  describe('when a user is logged in', () => {
    beforeEach(() => {
      authApi.getCurrentUser.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test.user@example.com',
        role: 'user',
        accountType: 'jobseeker',
        avatarUrl: '',
        status: 'active',
      });
      cvApi.listCVs.mockResolvedValue({
        cvs: [],
        pagination: { page: 1, limit: 12, total: 0, pages: 1 },
      });
      reviewApi.listPublicReviews.mockResolvedValue({
        reviews: [],
        summary: { average: 0, count: 0 },
      });
      applicationApi.listMyApplications.mockResolvedValue({
        applications: [],
        pagination: { page: 1, limit: 5, total: 0, pages: 1 },
      });
      jobApi.listSavedJobs.mockResolvedValue([]);
    });

    it('shows the dashboard on a guarded route', async () => {
      renderAt('/dashboard');

      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('shows the CV list on its own route', async () => {
      renderAt('/cvs');

      expect(await screen.findByRole('heading', { name: /my cvs/i })).toBeInTheDocument();
    });

    it('tells a new job seeker what is missing rather than showing empty panels', async () => {
      renderAt('/dashboard');

      // The dashboard's whole job for somebody who has just signed up is
      // to say what they have not done yet.
      expect(await screen.findByText(/have not created a cv yet/i)).toBeInTheDocument();
      expect(screen.getByText(/have not applied for anything yet/i)).toBeInTheDocument();
      expect(screen.getByText(/have not saved any jobs/i)).toBeInTheDocument();
    });

    it('sends a signed-in user from the landing page to their own dashboard', async () => {
      // Coming back to the site days later, the session is still valid. The
      // landing page is written for a visitor who has not signed up, so the
      // user belongs on their dashboard instead.
      renderAt('/');

      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /build a cv that gets you shortlisted/i }),
      ).not.toBeInTheDocument();
    });

    it('shows the logged-in navigation', async () => {
      renderAt('/');

      expect(await screen.findByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });
});
