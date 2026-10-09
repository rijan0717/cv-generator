/**
 * Unit tests for the page-fill model.
 *
 * The model decides whether the rewrite leaves a half-empty page alone or
 * works to fill it, so what matters is that it gets the *shape* right: a
 * thin CV reads as thin, a full one as full, a sidebar does not count as
 * if it were stacked under the main column, and a hidden section does not
 * fill a page it is not on.
 *
 * It is an estimate of a browser's layout, so none of these assert an
 * exact line count. Asserting one would be testing the constants rather
 * than the model, and would break every time a template was adjusted.
 */
import { describe, it, expect } from 'vitest';
import { estimateFill, pageCapacity, sectionHeights } from '../../src/algorithms/pageFill.js';

/**
 * A CV with one role, one qualification and a handful of skills — the
 * shape that produces the half-empty page this model exists to catch.
 * @param {object} [overrides] - Fields to replace.
 * @returns {object} A CV.
 */
function thinCV(overrides = {}) {
  return {
    templateKey: 'classic',
    settings: { fontSize: 'medium', spacing: 'normal', hiddenSections: [] },
    personal: {
      fullName: 'A Person',
      headline: 'QA Lead',
      email: 'a@example.com',
      phone: '+977 9800000000',
      address: 'Kathmandu',
    },
    summary: 'QA Lead with four years of experience.',
    skills: [{ name: 'Jira' }, { name: 'Selenium' }, { name: 'Agile' }],
    experience: [
      {
        position: 'Project Coordinator',
        company: 'Acme',
        description: 'Maintain project schedules and prepare weekly status reports.',
        achievements: ['Cut reporting time by 20%'],
      },
    ],
    education: [{ degree: 'BBA', fieldOfStudy: 'Management', institution: 'TU' }],
    languages: [{ language: 'Nepali', proficiency: 'Native' }],
    projects: [],
    certifications: [],
    references: [],
    referencesOnRequest: true,
    ...overrides,
  };
}

describe('pageCapacity', () => {
  it('fits roughly fifty lines of body text on an A4 page', () => {
    const lines = pageCapacity({ fontSize: 'medium' });

    // 257mm of usable height at 10.5pt and a 1.45 line height. The exact
    // figure is arithmetic; what is being checked is that it is a
    // plausible page rather than five lines or five hundred.
    expect(lines).toBeGreaterThan(40);
    expect(lines).toBeLessThan(55);
  });

  it('fits fewer lines as the type gets larger', () => {
    expect(pageCapacity({ fontSize: 'large' })).toBeLessThan(pageCapacity({ fontSize: 'small' }));
  });

  it('treats an unknown size as medium rather than failing', () => {
    expect(pageCapacity({ fontSize: 'enormous' })).toBe(pageCapacity({ fontSize: 'medium' }));
  });
});

describe('estimateFill', () => {
  it('reports a thin CV as filling well under a page', () => {
    const fill = estimateFill(thinCV());

    expect(fill.isFull).toBe(false);
    expect(fill.ratio).toBeLessThan(0.7);
    expect(fill.shortfallLines).toBeGreaterThan(0);
  });

  it('reports a CV with real content as full', () => {
    const full = thinCV({
      summary: 'A paragraph of about forty words. '.repeat(5),
      experience: Array.from({ length: 3 }, (_, index) => ({
        position: `Role ${index}`,
        company: 'Acme',
        description: 'A description of the work done in this role, of a realistic length.',
        achievements: ['One achievement', 'Another achievement', 'A third achievement'],
      })),
      projects: [
        {
          name: 'A project',
          description: 'What it did and how it was built.',
          technologies: 'Node',
        },
      ],
    });

    expect(estimateFill(full).isFull).toBe(true);
    expect(estimateFill(full).shortfallLines).toBe(0);
  });

  it('counts a two-column template as its taller column, not the sum', () => {
    // The same content, laid out one way and then the other. The sidebar
    // sits beside the experience rather than under it, so the modern
    // template's page ends sooner.
    const content = thinCV({
      skills: Array.from({ length: 12 }, (_, index) => ({ name: `Skill ${index}` })),
    });

    const single = estimateFill({ ...content, templateKey: 'classic' });
    const twoColumn = estimateFill({ ...content, templateKey: 'modern' });

    expect(twoColumn.lines).toBeLessThan(single.lines);
  });

  it('does not count a hidden section as filling the page', () => {
    const shown = estimateFill(thinCV());
    const hidden = estimateFill(
      thinCV({
        settings: { fontSize: 'medium', spacing: 'normal', hiddenSections: ['experience'] },
      }),
    );

    expect(hidden.lines).toBeLessThan(shown.lines);
    expect(hidden.sections.experience).toBe(0);
  });

  it('survives a completely empty CV', () => {
    const fill = estimateFill({});

    expect(fill.isFull).toBe(false);
    expect(Number.isFinite(fill.ratio)).toBe(true);
  });
});

describe('sectionHeights', () => {
  it('gives a section with nothing in it no height at all', () => {
    const heights = sectionHeights(thinCV());

    expect(heights.projects).toBe(0);
    expect(heights.certifications).toBe(0);
    expect(heights.experience).toBeGreaterThan(0);
  });

  it('grows a section as entries are added to it', () => {
    const one = sectionHeights(thinCV()).experience;
    const two = sectionHeights(
      thinCV({
        experience: [
          ...thinCV().experience,
          { position: 'Another role', company: 'Acme', description: 'More work.' },
        ],
      }),
    ).experience;

    expect(two).toBeGreaterThan(one);
  });
});
