import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
          name: /gets you shortlisted/i,
        }),
      ).toBeInTheDocument();
    });

    it('sends a visitor to the builder rather than straight to registration', async () => {
      renderAt('/');

      // The hero's primary call to action, on the first of its two
      // panels: it is a link rather than a button because it navigates.
      //
      // It goes to the public builder, not to `/register`. Asking
      // someone to create an account before they have seen the tool do
      // anything is what the public funnels exist to avoid; the account
      // is asked for at the export instead.
      const links = await screen.findAllByRole('link', { name: /create my cv/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/build-cv');
    });

    it('still offers a way to create an account', async () => {
      renderAt('/');

      const links = await screen.findAllByRole('link', { name: /create a free account/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/register');
    });

    it('switches the hero between its two panels', async () => {
      const user = userEvent.setup();
      renderAt('/');

      // The two pills are tabs; the header menu of the same name is an
      // ordinary button, which is what keeps these two apart.
      await screen.findByRole('heading', { name: /gets you shortlisted/i });

      await user.click(screen.getByRole('tab', { name: /get hired/i }));

      expect(
        await screen.findByRole('heading', { name: /rewrite it for the job/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /gets you shortlisted/i }),
      ).not.toBeInTheDocument();
    });

    it('opens a header menu and shows what each entry is for', async () => {
      const user = userEvent.setup();
      renderAt('/');

      const trigger = await screen.findByRole('button', { name: /get hired/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      // The description under each link is the reason the menu exists.
      expect(
        await screen.findByText(/paste an advert and your cv is rewritten/i),
      ).toBeInTheDocument();
    });

    it('shows the login page', async () => {
      renderAt('/login');

      expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    });

    it('redirects a guarded route to the login page', async () => {
      renderAt('/dashboard');

      expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    });

    it('shows the public page behind a header-menu entry', async () => {
      // These exist so a visitor can read what a tool does without being
      // sent to the login form first, so they must not be guarded.
      renderAt('/features/cv-builder');

      expect(
        await screen.findByRole('heading', { level: 1, name: /use it everywhere/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^log in$/i })).not.toBeInTheDocument();
    });

    it('shows a not-found page for an unknown feature slug', async () => {
      renderAt('/features/no-such-feature');

      expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
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
        screen.queryByRole('heading', { name: /gets you shortlisted/i }),
      ).not.toBeInTheDocument();
    });

    it('shows the logged-in navigation', async () => {
      renderAt('/');

      expect(await screen.findByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });
});
