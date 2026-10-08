/**
 * Unit tests for the Job-Tailored CV Rewrite.
 *
 * Two kinds of test here. The first kind checks that the rewrite does
 * what it claims — re-orders by relevance, promotes the right skills,
 * rebuilds the summary. The second kind checks the limits it imposes on
 * itself, which matter more: it must not invent a skill, must not
 * re-order roles out of chronological order, and must not modify the CV
 * it was given.
 */
import { describe, it, expect } from 'vitest';
import {
  tailorCV,
  tailorSkills,
  buildJobProfile,
  buildVocabularyMap,
  alignVocabulary,
  relevanceOf,
  buildSummary,
  yearsOfExperience,
} from '../../src/algorithms/cvTailor.js';

const BACKEND_ADVERT =
  'Backend Developer. We need someone to build REST APIs with Node.js, Express and MongoDB. ' +
  'Docker and AWS experience is essential. You will write unit tests and work in an agile team.';

/**
 * A CV with something to tailor: one role whose wording needs fixing, two
 * projects of very different relevance, and a skill the advert wants that
 * is described but not listed.
 *
 * @returns {object} A fresh copy, so a test that mutates cannot affect
 *   the next one.
 */
function sampleCV() {
  return {
    title: 'Developer CV',
    personal: {
      fullName: 'A Person',
      headline: 'Junior Developer',
      email: 'a@example.com',
      phone: '07700900000',
    },
    summary: 'A developer.',
    experience: [
      {
        company: 'Acme',
        position: 'Developer',
        startDate: '2021-01',
        endDate: '2024-06',
        description: 'Responsible for building REST APIs in Node.js with Express.',
        achievements: ['Mentored two interns', 'Cut API response time by 40% with caching'],
      },
      {
        company: 'Corner Shop',
        position: 'Sales Assistant',
        startDate: '2019-01',
        endDate: '2020-12',
        description: 'Served customers and handled the till.',
        achievements: [],
      },
    ],
    education: [
      {
        institution: 'Tribhuvan University',
        degree: 'BCA',
        fieldOfStudy: 'Computer Applications',
        startDate: '2018-01',
        endDate: '2022-01',
      },
    ],
    skills: [
      { name: 'PHP', level: 'Advanced' },
      { name: 'Node.js', level: 'Advanced' },
    ],
    projects: [
      { name: 'Recipe blog', description: 'A small PHP blog.', technologies: ['PHP'] },
      {
        name: 'API gateway',
        description: 'A routing layer built with Express and Docker.',
        technologies: ['Node.js', 'Docker'],
      },
    ],
    certifications: [],
    languages: [],
    references: [],
    settings: {
      sectionOrder: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references',
      ],
    },
  };
}

describe('relevanceOf', () => {
  it('scores text that uses the advert words above text that does not', () => {
    const profile = buildJobProfile(BACKEND_ADVERT);

    const onTopic = relevanceOf(
      'Built REST APIs with Node.js and Express, deployed with Docker',
      profile,
    );
    const offTopic = relevanceOf('Served customers and handled the till', profile);

    expect(onTopic).toBeGreaterThan(offTopic);
  });

  it('does not reward repeating the same word', () => {
    const profile = buildJobProfile(BACKEND_ADVERT);

    const once = relevanceOf('Docker', profile);
    const eightTimes = relevanceOf(
      'Docker Docker Docker Docker Docker Docker Docker Docker',
      profile,
    );

    // Keyword stuffing is exactly what the rest of the project exists to
    // detect, so it must not be what the tailor optimises for.
    expect(eightTimes).toBeCloseTo(once, 10);
  });
});

describe('yearsOfExperience', () => {
  it('measures the span rather than adding the roles up', () => {
    // Two overlapping three-year roles are three years of experience,
    // not six.
    const years = yearsOfExperience([
      { startDate: '2021-01', endDate: '2024-01' },
      { startDate: '2021-06', endDate: '2024-01' },
    ]);

    expect(years).toBe(3);
  });

  it('returns 0 when the dates say nothing', () => {
    expect(yearsOfExperience([])).toBe(0);
    expect(yearsOfExperience([{ startDate: '', endDate: '' }])).toBe(0);
  });
});

describe('alignVocabulary', () => {
  const ADVERT_WITH_JS =
    'Frontend Developer. You will write JavaScript and TypeScript, using React every day. ' +
    'We build REST APIs and deploy them with Docker.';

  it("swaps the CV's alias for the advert's spelling", () => {
    const swaps = buildVocabularyMap(ADVERT_WITH_JS);
    const result = alignVocabulary('Built the client in JS and TS', swaps);

    expect(result.text).toBe('Built the client in JavaScript and TypeScript');
    expect(result.swaps).toContain('js → JavaScript');
  });

  it('leaves text alone that already uses the advert wording', () => {
    const swaps = buildVocabularyMap(ADVERT_WITH_JS);
    const line = 'Built the client in JavaScript';

    expect(alignVocabulary(line, swaps)).toEqual({ text: line, swaps: [] });
  });

  it('does not match inside a longer word', () => {
    const swaps = buildVocabularyMap(ADVERT_WITH_JS);

    // "js" must not be found inside "jsonify".
    expect(alignVocabulary('Wrote a jsonify helper', swaps).text).toBe('Wrote a jsonify helper');
  });

  it('does not match part of a skill name that contains a dot', () => {
    const swaps = buildVocabularyMap(
      'Backend Developer working with Node.js, Vue.js and JavaScript.',
    );

    // "node" inside "Node.js" would give "Node.js.js"; "js" inside
    // "Vue.js" would give "Vue.JavaScript".
    expect(alignVocabulary('Built REST APIs in Node.js and Vue.js', swaps).text).toBe(
      'Built REST APIs in Node.js and Vue.js',
    );
  });

  it('never expands a one-word alias into a phrase', () => {
    const swaps = buildVocabularyMap(ADVERT_WITH_JS);
    const line = 'Cut API response time by 40%';

    // The dictionary lists "api" under "REST API". Swapping it would
    // rewrite a sentence the user wrote into one they did not.
    expect(alignVocabulary(line, swaps).text).toBe(line);
  });

  it('only swaps skills this advert actually asks for', () => {
    const swaps = buildVocabularyMap('We need a bookkeeper with payroll experience.');

    expect(alignVocabulary('Wrote JS for the intranet', swaps).text).toBe(
      'Wrote JS for the intranet',
    );
  });
});

describe('tailorSkills', () => {
  it('separates listed, evidenced and absent skills', () => {
    const result = tailorSkills(sampleCV(), BACKEND_ADVERT);

    // Listed and wanted.
    expect(result.promoted).toContain('Node.js');

    // Described in a role and a project, but missing from the list.
    expect(result.added).toContain('Express');
    expect(result.added).toContain('Docker');

    // Nowhere on the CV at all.
    expect(result.suggested).toContain('MongoDB');
    expect(result.suggested).toContain('AWS');
  });

  it('never adds a skill the CV cannot evidence', () => {
    const result = tailorSkills(sampleCV(), BACKEND_ADVERT);
    const names = result.skills.map((skill) => skill.name);

    expect(names).not.toContain('MongoDB');
    expect(names).not.toContain('AWS');
  });

  it('moves the skills the advert asks for to the front', () => {
    const result = tailorSkills(sampleCV(), BACKEND_ADVERT);

    expect(result.skills[0].name).toBe('Node.js');
  });
});

describe('buildSummary', () => {
  it('builds from the CV own facts', () => {
    const summary = buildSummary(sampleCV(), {
      targetTitle: 'Backend Developer',
      namedSkills: ['Node.js', 'Express'],
    });

    expect(summary.text).toContain('Backend Developer');
    expect(summary.text).toContain('Node.js');
    // The quantified achievement, quoted as the user wrote it.
    expect(summary.text).toContain('40%');
    expect(summary.text).toContain('BCA');
  });

  it('reports a short summary rather than padding it', () => {
    const summary = buildSummary(
      { personal: {}, experience: [], education: [], skills: [] },
      { targetTitle: '', namedSkills: [] },
    );

    expect(summary.short).toBe(true);
  });
});

describe('tailorCV', () => {
  it('points the headline at the advertised role', () => {
    const { draft } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.personal.headline).toBe('Backend Developer');
  });

  it('rewords a description to open with an action verb', () => {
    const { draft } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.experience[0].description).toBe('Built REST APIs in Node.js with Express.');
  });

  it('keeps experience in the order it was given', () => {
    // A reader judges a career by its chronology. Shuffling roles by
    // keyword would make a recent job look like an old one.
    const { draft } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.experience.map((role) => role.company)).toEqual(['Acme', 'Corner Shop']);
  });

  it('puts the most relevant project first', () => {
    const { draft } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.projects[0].name).toBe('API gateway');
  });

  it('puts the quantified achievement first when the advert cannot choose', () => {
    const { draft } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.experience[0].achievements[0]).toContain('40%');
  });

  it('advises on a role that quantifies nothing instead of inventing a figure', () => {
    const { draft, notes } = tailorCV(sampleCV(), BACKEND_ADVERT, {
      jobTitle: 'Backend Developer',
    });

    const shopNote = notes.find((note) => note.startsWith('Sales Assistant'));
    expect(shopNote).toContain('Add a number');

    // And no number appeared in the text itself.
    expect(draft.experience[1].description).not.toMatch(/\d/);
  });

  it('explains every change it made', () => {
    const { changes } = tailorCV(sampleCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      expect(change.section).toBeTruthy();
      expect(change.kind).toBeTruthy();
      expect(change.reason).toBeTruthy();
    }
  });

  it('does not modify the CV it was given', () => {
    const cv = sampleCV();
    const before = JSON.stringify(cv);

    tailorCV(cv, BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(JSON.stringify(cv)).toBe(before);
  });

  it('suggests the skills it refused to add', () => {
    const { suggestedSkills, draft } = tailorCV(sampleCV(), BACKEND_ADVERT, {
      jobTitle: 'Backend Developer',
    });

    expect(suggestedSkills).toContain('MongoDB');
    expect(draft.skills.map((skill) => skill.name)).not.toContain('MongoDB');
  });

  it('copes with an empty CV', () => {
    const { draft, changes } = tailorCV({}, BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.skills).toEqual([]);
    expect(draft.experience).toEqual([]);
    expect(Array.isArray(changes)).toBe(true);
  });
});
