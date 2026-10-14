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
  removeFiller,
  normaliseTense,
  polishSentence,
  splitSentences,
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

describe('removeFiller', () => {
  it('drops a leading pronoun before a verb', () => {
    expect(removeFiller('I developed the billing API').text).toBe('Developed the billing API');
  });

  it('keeps a leading "I" that is not a pronoun', () => {
    expect(removeFiller('I/O testing for the firmware').text).toBe('I/O testing for the firmware');
  });

  it('turns "was able to" into the users own verb and removes filler', () => {
    const result = removeFiller('Was able to reduce costs by 20% by utilizing caching');
    expect(result.text).toBe('Reduced costs by 20% by using caching');
    expect(result.removed).toEqual(['"was able to"', '"utilise"']);
  });

  it('never touches a number', () => {
    expect(removeFiller('Successfully cut load time by 3.5s').text).toBe('Cut load time by 3.5s');
  });
});

describe('normaliseTense', () => {
  it('puts a finished role in the past tense', () => {
    expect(normaliseTense('Performing automation testing').text).toBe(
      'Performed automation testing',
    );
    expect(normaliseTense('Leads the QA team').text).toBe('Led the QA team');
  });

  it('puts a current role in the present tense', () => {
    expect(normaliseTense('Performing automation testing', { present: true }).text).toBe(
      'Perform automation testing',
    );
  });

  it('leaves a noun phrase alone', () => {
    expect(normaliseTense('Testing of payment flows').changed).toBe(false);
    expect(normaliseTense('Reports were sent weekly').changed).toBe(false);
  });
});

describe('polishSentence', () => {
  it('applies the opener, filler and tense steps together', () => {
    expect(polishSentence('I successfully conducted API testing').text).toBe(
      'Conducted API testing',
    );
  });
});

describe('splitSentences', () => {
  it('splits on a full stop followed by a capital', () => {
    expect(splitSentences('Built X. Tested Y. Used v2.1 tools.')).toEqual([
      'Built X.',
      'Tested Y.',
      'Used v2.1 tools.',
    ]);
  });
});
