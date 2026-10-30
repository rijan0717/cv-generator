import { describe, it, expect } from 'vitest';
import {
  normaliseText,
  tokenise,
  stem,
  buildBigrams,
  processText,
  cvToText,
} from '../../src/algorithms/textProcessor.js';

/**
 * Tests for the text preprocessing stage of the CV–Job Match Analyser.
 *
 * The module is tested directly rather than only through `jobMatcher`,
 * because the behaviour that matters here is invisible from the outside: a
 * broken stemmer still produces a plausible-looking match score, just a
 * wrong one. These are the report's section 3.3 claims, checked.
 */

describe('normaliseText', () => {
  it('lowercases the text', () => {
    expect(normaliseText('Senior DEVELOPER')).toBe('senior developer');
  });

  /**
   * The ordering decision the module exists for: protected terms are
   * rewritten before punctuation is stripped. Were the order reversed,
   * "node.js" would become the two tokens "node" and "js" and would stop
   * matching a CV that says "Node.js".
   */
  it('protects technical terms whose punctuation carries meaning', () => {
    expect(normaliseText('Node.js and C++')).toBe('nodejs and cplusplus');
    expect(normaliseText('C# with .NET')).toBe('csharp with dotnet');
    expect(normaliseText('CI/CD and UI/UX')).toBe('cicd and uiux');
  });

  it('rewrites the longest term first, so asp.net does not become asp + dotnet', () => {
    expect(normaliseText('ASP.NET')).toBe('aspnet');
  });

  it('keeps multi-word technical phrases as one term', () => {
    expect(normaliseText('machine learning')).toBe('machinelearning');
    expect(normaliseText('Amazon Web Services')).toBe('aws');
  });

  it('treats missing text as empty rather than throwing', () => {
    expect(normaliseText(undefined)).toBe('');
    expect(normaliseText(null)).toBe('');
  });
});

describe('tokenise', () => {
  it('splits on anything that is not a letter or digit', () => {
    expect(tokenise('react, redux; typescript')).toEqual(['react', 'redux', 'typescript']);
  });

  it('keeps digits, so versions and quantities survive', () => {
    // Stop words are still present here: removing them is a later stage.
    expect(tokenise('python3 and es2015')).toEqual(['python3', 'and', 'es2015']);
  });

  it('produces no empty tokens from runs of punctuation', () => {
    expect(tokenise('a  --  b')).toEqual(['a', 'b']);
  });

  it('returns nothing for empty input', () => {
    expect(tokenise('')).toEqual([]);
    expect(tokenise(undefined)).toEqual([]);
  });
});

describe('stem', () => {
  it('reduces a word family to one shared form', () => {
    const stems = ['testing', 'tested', 'tests'].map(stem);
    expect(new Set(stems).size).toBe(1);
  });

  it('leaves short words alone', () => {
    // Stripping from these does more harm than good: "less" must not
    // become "les", and "apis" is only four characters.
    expect(stem('less')).toBe('less');
    expect(stem('apis')).toBe('apis');
  });

  it('turns -ies into -y', () => {
    expect(stem('libraries')).toBe('library');
  });

  it('does not strip the s from a word ending in ss or us', () => {
    expect(stem('process')).toBe('process');
    expect(stem('campus')).toBe('campus');
  });

  it('repairs a doubled consonant left by stripping -ing or -ed', () => {
    expect(stem('planning')).toBe('plan');
    expect(stem('planned')).toBe('plan');
  });

  it('puts back the silent e that -ing stripping removes', () => {
    expect(stem('creating')).toBe('create');
  });

  it('strips the common noun and adverb endings', () => {
    expect(stem('management')).toBe('manag');
    expect(stem('effectively')).toBe('effective');
  });

  /**
   * Two known limitations, recorded rather than hidden. Both are safe —
   * stemming is consistent, so a term still matches itself — but both
   * cost recall, and changing either would move every match score in the
   * system, so they are a deliberate decision rather than an oversight.
   *
   * See docs/algorithms.md; worth raising in the viva as something the
   * unit tests found.
   */
  describe('known limitations', () => {
    it('does not unify the whole "manage" family', () => {
      // "manage" and "manages" land on one stem, the rest on another, so
      // a CV saying "managed a team" does not match a job asking to
      // "manage a team".
      expect(stem('manage')).toBe('manage');
      expect(stem('manages')).toBe('manage');
      expect(stem('managed')).toBe('manag');
      expect(stem('managing')).toBe('manag');
      expect(stem('management')).toBe('manag');
    });

    it('over-strips some words ending in -ness', () => {
      // The -ness rule cannot tell a suffix from a word that merely ends
      // that way.
      expect(stem('business')).toBe('busi');
      expect(stem('witness')).toBe('wit');
    });
  });

  it('is idempotent: stemming a stem changes nothing', () => {
    for (const word of ['testing', 'libraries', 'management', 'planning', 'developers']) {
      const once = stem(word);
      expect(stem(once)).toBe(once);
    }
  });
});

describe('buildBigrams', () => {
  it('keeps a phrase that is on the list', () => {
    expect(buildBigrams(['strong', 'problem', 'solving', 'skills'])).toEqual(['problem_solving']);
  });

  it('ignores an adjacent pair that is not meaningful', () => {
    // Keeping every adjacent pair would swamp the vector with noise.
    expect(buildBigrams(['the', 'successful', 'candidate'])).toEqual([]);
  });

  it('finds more than one phrase in the same text', () => {
    const tokens = ['machine', 'learning', 'and', 'data', 'science'];
    expect(buildBigrams(tokens)).toEqual(['machine_learning', 'data_science']);
  });

  it('returns nothing for a single token', () => {
    expect(buildBigrams(['react'])).toEqual([]);
  });
});

describe('processText', () => {
  it('removes stop words by default', () => {
    const terms = processText('the candidate will be a developer');
    expect(terms).not.toContain('the');
    expect(terms).not.toContain('will');
  });

  it('keeps stop words when asked to', () => {
    expect(processText('the developer', { keepStopWords: true })).toContain('the');
  });

  it('can be run without stemming', () => {
    expect(processText('testing', { stemTokens: false })).toContain('testing');
  });

  /**
   * Bigrams are collected before stop words are removed, so a phrase that
   * spans one is not silently broken apart.
   */
  it('finds a phrase even though a stop word sits beside it', () => {
    expect(processText('experience in quality assurance')).toContain('quality_assurance');
  });

  /**
   * Some phrases are in both PROTECTED_TERMS and MEANINGFUL_BIGRAMS. The
   * protected rewrite runs first, so the phrase is already one token by
   * the time bigrams are collected and no bigram is produced. The term
   * still survives as a single unit, which is the point of both lists.
   */
  it('lets a protected phrase win over the bigram for the same words', () => {
    const terms = processText('experience in project management');
    expect(terms).toContain('projectmanag');
    expect(terms).not.toContain('project_management');
  });

  it('runs the whole pipeline in order', () => {
    // "Node.js" survives as one term, "the" is dropped, "developing" stems.
    const terms = processText('The developer is developing with Node.js');
    expect(terms).toContain('nodej');
    expect(terms).toContain('develop');
    expect(terms).not.toContain('the');
  });

  it('returns nothing for empty text', () => {
    expect(processText('')).toEqual([]);
  });
});

describe('cvToText', () => {
  /** A CV with one entry in each section that carries meaning. */
  const cv = {
    personal: { headline: 'Frontend Developer', email: 'someone@example.com', phone: '0123' },
    summary: 'Builds accessible interfaces.',
    experience: [
      {
        position: 'Developer',
        company: 'Acme',
        description: 'Rebuilt the checkout.',
        achievements: ['Cut load time by 40%'],
      },
    ],
    education: [{ degree: 'BCA', fieldOfStudy: 'Computing', institution: 'TU' }],
    skills: [{ name: 'React' }],
    projects: [{ name: 'Portfolio', role: 'Author', technologies: ['Vite'] }],
    certifications: [{ name: 'AWS Practitioner', issuer: 'Amazon' }],
  };

  it('includes everything that describes what the person can do', () => {
    const text = cvToText(cv);

    for (const expected of [
      'Frontend Developer',
      'Builds accessible interfaces.',
      'Rebuilt the checkout.',
      'Cut load time by 40%',
      'Computing',
      'React',
      'Portfolio',
      'Vite',
      'AWS Practitioner',
    ]) {
      expect(text).toContain(expected);
    }
  });

  /**
   * Contact details add no signal about ability. Including them would
   * dilute every term frequency and let an email address influence a
   * match score.
   */
  it('leaves out contact details', () => {
    const text = cvToText(cv);
    expect(text).not.toContain('someone@example.com');
    expect(text).not.toContain('0123');
  });

  it('survives a CV with nothing filled in', () => {
    expect(cvToText({})).toBe('');
  });
});
