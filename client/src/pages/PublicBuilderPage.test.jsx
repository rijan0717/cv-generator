import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PublicBuilderPage from './PublicBuilderPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import * as authApi from '../api/auth.js';
import * as cvApi from '../api/cvs.js';
import * as templateApi from '../api/templates.js';

vi.mock('../api/auth.js');
vi.mock('../api/cvs.js');
vi.mock('../api/templates.js');

// The template gallery renders a live miniature CV for every template it
// is given, and the builder renders a full A4 preview beside the form.
// That is a lot of layout for jsdom, and under the parallel run these
// tests pass the 5-second default while still being perfectly healthy —
// so the limit is raised here rather than the tests being thinned out to
// fit it.
vi.setConfig({ testTimeout: 20000 });

/**
 * Renders the public builder for a visitor with no account.
 * @returns {object} The render result.
 */
function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/build-cv']}>
        <ToastProvider>
          <AuthProvider>
            <PublicBuilderPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();

  // A 401 from /auth/me is the normal case for a visitor, and it is the
  // state this whole page exists for.
  authApi.getCurrentUser.mockRejectedValue(new Error('Authentication required'));

  templateApi.listTemplates.mockResolvedValue([
    { key: 'classic', name: 'Classic', description: 'Traditional', isActive: true },
    { key: 'modern', name: 'Modern', description: 'Two column', isActive: true },
  ]);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('PublicBuilderPage', () => {
  it('asks for a design before asking for any content', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /create your cv/i })).toBeInTheDocument();

    // No form until a design is chosen: a blank form is the hardest
    // moment in writing a CV and the worst place to start someone.
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it('opens the form filled in, once a design is chosen', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^classic template/i }));

    const fullName = await screen.findByLabelText(/full name/i);
    expect(fullName).toBeInTheDocument();

    // Sample content, not an empty box — the visitor types over it.
    expect(fullName.value.length).toBeGreaterThan(0);
  });

  it('keeps what was written when the design is changed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^classic template/i }));

    const fullName = await screen.findByLabelText(/full name/i);
    await user.clear(fullName);
    await user.type(fullName, 'Sita Sharma');

    await user.click(screen.getByRole('button', { name: /change design/i }));
    await user.click(await screen.findByRole('button', { name: /^modern template/i }));

    // Switching design is a question about how the CV looks. Answering
    // it by replacing the content would throw away the part that took
    // effort.
    expect(await screen.findByLabelText(/full name/i)).toHaveValue('Sita Sharma');
  });

  it('asks for an account at the download, and exports nothing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^classic template/i }));
    await user.click(await screen.findByRole('button', { name: /download my cv/i }));

    expect(
      await screen.findByRole('heading', { name: /create a free account to download it/i }),
    ).toBeInTheDocument();

    // The gate is the point: no CV is created for a visitor who has not
    // signed in, so nothing of theirs reaches the server.
    expect(cvApi.createCV).not.toHaveBeenCalled();
    expect(cvApi.updateCV).not.toHaveBeenCalled();
  });

  it('lets the visitor carry on editing instead of signing up', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^classic template/i }));
    await user.click(await screen.findByRole('button', { name: /download my cv/i }));
    await user.click(await screen.findByRole('button', { name: /not yet/i }));

    expect(
      screen.queryByRole('heading', { name: /create a free account to download it/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('offers registering and logging in, and comes back here afterwards', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^classic template/i }));
    await user.click(await screen.findByRole('button', { name: /download my cv/i }));

    const wall = (
      await screen.findByRole('heading', { name: /create a free account to download it/i })
    ).closest('section');

    expect(
      within(wall).getByRole('link', { name: /create account and download/i }),
    ).toHaveAttribute('href', '/register');
    expect(within(wall).getByRole('link', { name: /already have an account/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
