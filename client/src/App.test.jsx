import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import * as authApi from './api/auth.js';
import * as cvApi from './api/cvs.js';
import * as reviewApi from './api/reviews.js';

// The auth context calls the API on mount to find out who is logged in, and
// the dashboard lists CVs. Stubbing both modules keeps these tests
// independent of a running server.
vi.mock('./api/auth.js');
vi.mock('./api/cvs.js');
vi.mock('./api/reviews.js');

/**
 * Renders the app at a given route inside the auth provider.
 * @param {string} route - The initial URL.
 */
function renderAt(route) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('App routing', () => {
  describe('when nobody is logged in', () => {
    beforeEach(() => {
      // A 401 from /auth/me is the normal case for a visitor.
      authApi.getCurrentUser.mockRejectedValue(new Error('Authentication required'));
      reviewApi.listPublicReviews.mockResolvedValue({ reviews: [], summary: { average: 0, count: 0 } });
    });

    it('shows the landing page at the home route', async () => {
      renderAt('/');

      expect(
        await screen.findByRole('heading', { name: /write a cv that gets past the filter/i }),
      ).toBeInTheDocument();
    });

    it('offers a way to create an account', async () => {
      renderAt('/');

      // The landing page has two of these: one in the hero, one in the
      // closing call to action.
      const links = await screen.findAllByRole('link', { name: /create a free account/i });
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
        avatarUrl: '',
        status: 'active',
      });
      cvApi.listCVs.mockResolvedValue([]);
      reviewApi.listPublicReviews.mockResolvedValue({ reviews: [], summary: { average: 0, count: 0 } });
    });

    it('shows the dashboard on a guarded route', async () => {
      renderAt('/dashboard');

      expect(await screen.findByRole('heading', { name: /my cvs/i })).toBeInTheDocument();
    });

    it('shows the logged-in navigation', async () => {
      renderAt('/');

      expect(await screen.findByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });
});
