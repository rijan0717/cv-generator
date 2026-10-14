import { describe, it, expect } from 'vitest';
import { wordDiff, similarity } from './wordDiff.js';

describe('wordDiff', () => {
  it('marks removed and added words around the unchanged ones', () => {
    const runs = wordDiff(
      'Responsible for managing the release process',
      'Managed the release process',
    );

    expect(runs).toEqual([
      { type: 'removed', text: 'Responsible for managing ' },
      { type: 'added', text: 'Managed ' },
      { type: 'same', text: 'the release process' },
    ]);
  });

  it('ignores case and punctuation when comparing words', () => {
    const runs = wordDiff('Built the API.', 'built the API');
    expect(runs.every((run) => run.type === 'same')).toBe(true);
  });

  it('joins back into the rewritten text', () => {
    const after = 'Reduced regression time by 40% by using Playwright';
    const runs = wordDiff(
      'Was able to reduce regression time by 40% by utilizing Playwright',
      after,
    );
    const rebuilt = runs
      .filter((run) => run.type !== 'removed')
      .map((run) => run.text)
      .join('');
    expect(rebuilt).toBe(after);
  });

  it('reports how much of the original survived', () => {
    expect(similarity(wordDiff('a b c d', 'a b c d'))).toBe(1);
    expect(similarity(wordDiff('a b c d', 'w x y z'))).toBe(0);
  });
});
