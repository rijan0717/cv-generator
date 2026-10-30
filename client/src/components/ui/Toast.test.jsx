import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../context/ToastContext.jsx';
import { useToast } from '../../context/useToast.js';

/**
 * A page with one button per kind of message, so the tests drive the
 * toasts the way the application does — through the hook — rather than by
 * rendering the component with made-up props.
 */
function Harness() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.success('Your profile has been updated')}>
        succeed
      </button>
      <button type="button" onClick={() => toast.error('That email address is already registered')}>
        fail
      </button>
      <button type="button" onClick={() => toast.error('')}>
        say nothing
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toasts', () => {
  it('shows a success message, announced as a status', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'succeed' }));

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Your profile has been updated');
  });

  it('announces a failure at once, as an alert', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'fail' }));

    expect(screen.getByRole('alert')).toHaveTextContent('That email address is already registered');
  });

  it('can be dismissed before its time is up', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'fail' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('goes away on its own', () => {
    vi.useFakeTimers();
    renderHarness();

    // `fireEvent` rather than `userEvent` here: user-event waits on real
    // timers of its own, which deadlocks once the clock is faked.
    fireEvent.click(screen.getByRole('button', { name: 'succeed' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    // A success stays for four seconds.
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says the same thing once, not twice', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'fail' }));
    await user.click(screen.getByRole('button', { name: 'fail' }));

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('ignores an empty message, so a caller need not check first', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'say nothing' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
