import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateGallery from './TemplateGallery.jsx';
import { TEMPLATES } from '../../templates/index.js';

/** The card buttons, read from the grid by their accessible names. */
function cardNames() {
  return within(screen.getByRole('list'))
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));
}

describe('TemplateGallery', () => {
  it('shows every template it is given as a card', () => {
    render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);
    expect(cardNames()).toHaveLength(TEMPLATES.length);
  });

  it('marks the current template', () => {
    render(<TemplateGallery templates={TEMPLATES} selectedKey="modern" onChoose={() => {}} />);

    const current = screen.getByRole('button', { name: 'Modern template (current)' });
    expect(current).toHaveAttribute('aria-pressed', 'true');
  });

  it('hands the chosen template to the caller', async () => {
    const onChoose = vi.fn();
    render(<TemplateGallery templates={TEMPLATES} onChoose={onChoose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Executive template' }));

    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ key: 'executive' }));
  });

  it('filters by category', async () => {
    render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /^ATS-friendly/ }));

    // Read from the registry rather than written out, so that adding a
    // template to a category does not fail a test about filtering.
    const expected = TEMPLATES.filter((template) => template.category === 'ats').map(
      (template) => `${template.name} template`,
    );

    expect(expected.length).toBeGreaterThan(0);
    expect(cardNames().sort()).toEqual(expected.sort());
  });

  it('searches names and descriptions', async () => {
    render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);

    // "sidebar" is in Modern's description, not in any template's name.
    await userEvent.type(screen.getByRole('searchbox'), 'sidebar');

    expect(cardNames()).toContain('Modern template');
    expect(cardNames()).not.toContain('Classic template');
  });

  it('filters to templates with a photo', async () => {
    render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'With photo' }));

    const expected = TEMPLATES.filter((t) => t.usesPhoto).map((t) => `${t.name} template`);
    expect(cardNames()).toEqual(expected);
  });

  it('says so when nothing matches, and can clear the filters', async () => {
    render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);

    await userEvent.type(screen.getByRole('searchbox'), 'no template is called this');
    expect(screen.getByText(/No templates match/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardNames()).toHaveLength(TEMPLATES.length);
  });

  it('offers "Preview with my CV" only when there is a CV to preview', () => {
    const { rerender } = render(<TemplateGallery templates={TEMPLATES} onChoose={() => {}} />);
    expect(screen.queryByRole('checkbox', { name: 'Preview with my CV' })).toBeNull();

    rerender(
      <TemplateGallery
        templates={TEMPLATES}
        onChoose={() => {}}
        userCV={{ templateKey: 'classic', settings: {}, personal: {} }}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Preview with my CV' })).toBeInTheDocument();
  });
});
