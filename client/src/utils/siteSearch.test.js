import { describe, it, expect } from 'vitest';
import { matchScore, searchStatic, serverResults, mergeResults } from './siteSearch.js';

describe('matchScore', () => {
  it('ranks a title that starts with the query highest', () => {
    expect(matchScore('react', 'React Developer')).toBe(3);
    expect(matchScore('developer', 'React Developer')).toBe(2);
    expect(matchScore('frontend', 'React Developer', 'frontend role')).toBe(1);
  });

  it('needs every word somewhere in the item', () => {
    expect(matchScore('react dev', 'React Developer')).toBeGreaterThan(0);
    expect(matchScore('react python', 'React Developer')).toBe(0);
  });

  it('ignores case', () => {
    expect(matchScore('ats', 'ATS-friendly')).toBe(3);
  });
});

describe('searchStatic', () => {
  it('returns nothing for a query under two characters', () => {
    expect(searchStatic('a', { isAuthenticated: false })).toEqual({
      pages: [],
      templates: [],
      help: [],
    });
  });

  it('finds an FAQ answer and links to its anchor', () => {
    const { help } = searchStatic('photo', { isAuthenticated: false });
    expect(help.some((result) => result.to === '/faq#photo')).toBe(true);
  });

  it('finds templates, linking a visitor to the public page and a user to the gallery', () => {
    const visitor = searchStatic('classic', { isAuthenticated: false });
    const user = searchStatic('classic', { isAuthenticated: true });
    expect(visitor.templates[0]).toMatchObject({ title: 'Classic', to: '/features/templates' });
    expect(user.templates[0]).toMatchObject({ title: 'Classic', to: '/templates' });
  });

  it('offers signed-in pages only to someone signed in', () => {
    const visitor = searchStatic('my cvs', { isAuthenticated: false });
    const user = searchStatic('my cvs', { isAuthenticated: true });
    expect(visitor.pages.some((result) => result.to === '/cvs')).toBe(false);
    expect(user.pages.some((result) => result.to === '/cvs')).toBe(true);
  });
});

describe('serverResults', () => {
  const data = {
    blog: [{ title: 'Writing a summary', slug: 'writing-a-summary', excerpt: '' }],
    pages: [],
    jobs: [
      { id: 'j1', title: 'React Developer', company: 'Acme', location: 'Remote', jobType: '' },
    ],
    people: [
      { name: 'Anjali S.', profile: { position: 'React Developer', location: 'Kathmandu' } },
    ],
  };

  it('links each kind of result to its page', () => {
    const rows = serverResults(data, { canSeeDirectory: false });
    expect(rows.blog[0].to).toBe('/blog/writing-a-summary');
    expect(rows.jobs[0]).toMatchObject({ to: '/jobs/j1', subtitle: 'Acme · Remote' });
  });

  it('sends a visitor from a person to sign-up, and an employer to the directory', () => {
    expect(serverResults(data, { canSeeDirectory: false }).people[0].to).toBe('/register');
    expect(serverResults(data, { canSeeDirectory: true }).people[0].to).toBe('/talent');
  });
});

describe('mergeResults', () => {
  const local = { pages: [{ title: 'FAQ' }], templates: [{ title: 'Classic' }], help: [] };
  const remote = { jobs: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] };

  it('keeps only non-empty groups, in display order', () => {
    const groups = mergeResults(local, remote, 'all', 10);
    expect(groups.map((group) => group.key)).toEqual(['pages', 'templates', 'jobs']);
  });

  it('narrows to the chosen scope and caps each group', () => {
    const groups = mergeResults(local, remote, 'jobs', 2);
    expect(groups).toHaveLength(1);
    expect(groups[0].results).toHaveLength(2);
  });
});
