import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from './ConfirmContext.jsx';
import { useConfirm } from './useConfirm.js';

/** A button that asks, and shows the answer it got back. */
function Asker() {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState('none');

  return (
    <>
      <button
        type="button"
        onClick={async () =>
          setAnswer(String(await confirm({ title: 'Delete "My CV"?', confirmLabel: 'Delete' })))
        }
      >
        Ask
      </button>
      <p>answer: {answer}</p>
    </>
  );
}

function renderAsker() {
  render(
    <ConfirmProvider>
      <Asker />
    </ConfirmProvider>,
  );
}

describe('useConfirm', () => {
  it('shows the question in a modal and resolves true on confirm', async () => {
    renderAsker();
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByRole('heading', { name: 'Delete "My CV"?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('answer: true')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delete "My CV"?' })).toBeNull();
  });

  it('resolves false on cancel', async () => {
    renderAsker();
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('answer: false')).toBeInTheDocument();
  });
});
