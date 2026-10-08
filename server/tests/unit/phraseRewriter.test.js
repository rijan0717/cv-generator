/**
 * Unit tests for the sentence rewriter.
 *
 * The interesting cases are the ones where it must *refuse* to rewrite.
 * A rewriter that always produces something is easy to write and
 * dangerous to use: it ends up putting words in the user's mouth.
 */
import { describe, it, expect } from 'vitest';
import {
  gerundToBase,
  toPastTense,
  tidy,
  rewriteAsAction,
  rewriteDescription,
} from '../../src/algorithms/phraseRewriter.js';

describe('gerundToBase', () => {
  it('strips the -ing from a plain gerund', () => {
    expect(gerundToBase('testing')).toBe('test');
  });

  it('undoes a doubled consonant', () => {
    expect(gerundToBase('planning')).toBe('plan');
    expect(gerundToBase('running')).toBe('run');
  });

  it('restores a silent e using the action-verb list', () => {
    expect(gerundToBase('writing')).toBe('write');
    expect(gerundToBase('managing')).toBe('manage');
    expect(gerundToBase('creating')).toBe('create');
  });

  it('leaves a word alone when the stripped form is already a verb', () => {
    // The dangerous case: a spelling rule alone would give "edite".
    expect(gerundToBase('editing')).toBe('edit');
  });

  it('does not add an e to a word that doubled its consonant', () => {
    // "sitting" -> "sit", never "site".
    expect(gerundToBase('sitting')).toBe('sit');
  });

  it('rejects words that only look like gerunds', () => {
    expect(gerundToBase('thing')).toBeNull();
    expect(gerundToBase('king')).toBeNull();
    expect(gerundToBase('delivered')).toBeNull();
  });
});

describe('toPastTense', () => {
  it('uses the irregular form where there is one', () => {
    expect(toPastTense('lead')).toBe('led');
    expect(toPastTense('build')).toBe('built');
    expect(toPastTense('write')).toBe('wrote');
  });

  it('adds only a d to a verb ending in e', () => {
    expect(toPastTense('manage')).toBe('managed');
  });

  it('changes a consonant + y to ied', () => {
    expect(toPastTense('simplify')).toBe('simplified');
  });

  it('leaves a vowel + y alone', () => {
    expect(toPastTense('play')).toBe('played');
  });

  it('doubles the final consonant of a short CVC verb', () => {
    expect(toPastTense('plan')).toBe('planned');
  });
});

describe('tidy', () => {
  it('capitalises and collapses whitespace', () => {
    expect(tidy('  built   the   api ')).toBe('Built the api');
  });

  it('returns an empty string for nothing', () => {
    expect(tidy('   ')).toBe('');
    expect(tidy(undefined)).toBe('');
  });
});

describe('rewriteAsAction', () => {
  it('promotes the verb out of a weak opener', () => {
    const result = rewriteAsAction('Responsible for managing the release process');

    expect(result.changed).toBe(true);
    expect(result.text).toBe('Managed the release process');
  });

  it('writes the present tense for a role the user still holds', () => {
    const result = rewriteAsAction('Responsible for managing the release process', {
      present: true,
    });

    expect(result.text).toBe('Manage the release process');
  });

  it('refuses to rewrite when there is no verb to promote', () => {
    const line = 'Responsible for the stock room';
    const result = rewriteAsAction(line);

    // The line is returned untouched — inventing a verb here would be
    // writing the user's CV for them.
    expect(result.changed).toBe(false);
    expect(result.text).toBe(line);
    expect(result.reason).toContain('Rewrite it to open with what you actually did');
  });

  it('leaves a line that already starts with a verb alone', () => {
    const result = rewriteAsAction('Built a REST API in Node.js');

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('');
  });
});

describe('rewriteDescription', () => {
  it('rewrites each line independently and keeps the line breaks', () => {
    const result = rewriteDescription(
      'Responsible for building REST APIs.\nWorked on improving test coverage.',
    );

    expect(result.changed).toBe(true);
    expect(result.text).toBe('Built REST APIs.\nImproved test coverage.');
    expect(result.reasons).toHaveLength(2);
  });

  it('preserves a bullet character', () => {
    const result = rewriteDescription('- Responsible for managing the rota');

    expect(result.text).toBe('- Managed the rota');
  });

  it('returns an empty result for empty input', () => {
    expect(rewriteDescription('')).toEqual({ text: '', changed: false, reasons: [] });
  });
});
