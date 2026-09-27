import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

// The health page calls the API on mount; stub it so the test does not need a
// running server.
vi.mock('./api/health.js', () => ({
  getHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    uptimeSeconds: 1,
    database: 'connected',
    timestamp: new Date().toISOString(),
  }),
}));

describe('App', () => {
  it('renders the project title on the home route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Smart CV Generator')).toBeInTheDocument();
  });
});
