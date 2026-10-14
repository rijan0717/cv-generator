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
  softenTitle,
} from '../../src/algorithms/cvTailor.js';
import { analyseMatch } from '../../src/algorithms/jobMatcher.js';
import { TAILOR_CONFIG } from '../../src/config/scoringConfig.js';

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

/**
 * A CV squarely in the advert's own field, and a long advert.
 *
 * Used for the cases about reaching the target score, because this is
 * the realistic shape of them: the honest steps alone are enough, and
 * nothing has to be assumed.
 *
 * @returns {object} A fresh copy.
 */
function marketingCV() {
  return {
    title: 'Marketing CV',
    personal: { fullName: 'A Person', headline: 'Marketing Executive', email: 'a@example.com' },
    summary: 'A marketer.',
    experience: [
      {
        company: 'Acme',
        position: 'Marketing Executive',
        startDate: '2021-01',
        endDate: '2024-06',
        description: 'Responsible for running social media and email campaigns for the brand.',
        achievements: ['Grew organic traffic by 120% in a year', 'Cut cost per acquisition by 30%'],
      },
    ],
    education: [
      {
        institution: 'Tribhuvan University',
        degree: 'BBA',
        fieldOfStudy: 'Marketing',
        startDate: '2017-01',
        endDate: '2021-01',
      },
    ],
    skills: [
      { name: 'SEO', level: 'Advanced' },
      { name: 'Social Media', level: 'Advanced' },
    ],
    projects: [],
    certifications: [],
    languages: [],
    references: [],
    settings: {},
  };
}

const MARKETING_ADVERT =
  'Lead Content Marketer. Himalaya Digital is hiring for a lead role in marketing. We are ' +
  'looking for someone with significant experience leading a team. You will grow organic ' +
  'search traffic through technical SEO and content, reduce cost per acquisition by ' +
  'reallocating spend on test results, plan and run email campaigns to a large subscriber ' +
  'list, and report channel performance monthly in Google Analytics with recommendations. ' +
  'The tools we use day to day include Google Analytics, Content Marketing, SEO and Social ' +
  'Media.\nSkills: SEO, Google Analytics, Content Marketing, Social Media, Email Marketing';

/**
 * A CV from an unrelated field, for the cases about falling short.
 * @returns {object} A fresh copy.
 */
function shopCV() {
  return {
    personal: { fullName: 'A Person', headline: 'Sales Assistant' },
    summary: 'Served customers in a busy shop.',
    experience: [
      {
        company: 'Corner Shop',
        position: 'Sales Assistant',
        startDate: '2021-01',
        endDate: '2024-01',
        description: 'Served customers and handled the till.',
        achievements: [],
      },
    ],
    education: [],
    skills: [{ name: 'Customer Service', level: 'Advanced' }],
    projects: [],
    certifications: [],
    languages: [],
    references: [],
    settings: {},
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
    // On a CV that already clears the target, the unevidenced skills are
    // offered and never added — the target pass has nothing to do.
    const { suggestedSkills, assumedSkills, draft } = tailorCV(marketingCV(), MARKETING_ADVERT, {
      jobTitle: 'Lead Content Marketer',
    });

    expect(assumedSkills).toEqual([]);

    for (const name of suggestedSkills) {
      expect(draft.skills.map((skill) => skill.name)).not.toContain(name);
    }
  });

  it('raises the match score well above the untailored CV', () => {
    const cv = sampleCV();
    const before = analyseMatch(cv, BACKEND_ADVERT).matchScore;
    const { matchScore } = tailorCV(cv, BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(matchScore).toBeGreaterThan(before);
  });

  it('assumes nothing when the honest steps already clear the target', () => {
    // A long advert and a CV in the same field: re-ordering, re-wording
    // and listing the evidenced skills is enough on its own.
    const { assumedSkills, matchScore, targetReached } = tailorCV(marketingCV(), MARKETING_ADVERT, {
      jobTitle: 'Lead Content Marketer',
    });

    expect(matchScore).toBeGreaterThan(TAILOR_CONFIG.targetScore);
    expect(targetReached).toBe(true);
    expect(assumedSkills).toEqual([]);
  });

  it('lifts a CV from another field over the target, and labels how', () => {
    // A shop CV against a backend advert: the honest steps get nowhere
    // near, so both levers have to act. What matters is that everything
    // they add is reported, not hidden in the draft.
    const { targetReached, matchScore, assumedSkills, focusTerms, draft } = tailorCV(
      shopCV(),
      BACKEND_ADVERT,
      { jobTitle: 'Backend Developer' },
    );

    expect(targetReached).toBe(true);
    expect(matchScore).toBeGreaterThanOrEqual(TAILOR_CONFIG.targetScore);
    expect(assumedSkills.length + focusTerms.length).toBeGreaterThan(0);

    // The alignment sentence is in the summary the user edits, under a
    // heading that says exactly what it is.
    if (focusTerms.length > 0) {
      expect(draft.summary).toContain('Focus for this role:');
    }
  });

  it('reports honestly when neither lever can reach the target', () => {
    // An advert naming no skill the dictionary knows and sharing almost
    // no vocabulary with the CV. There is nothing to assume and little
    // to mirror, so the pass stops short and says so rather than
    // inventing experience.
    const unreachable =
      'Veterinary Surgeon. You will diagnose and treat farm livestock across rural practices, ' +
      'perform surgery, and advise farmers on herd health and welfare under supervision.';

    const { targetReached, matchScore, notes } = tailorCV(shopCV(), unreachable, {
      jobTitle: 'Veterinary Surgeon',
    });

    // The contract that always holds, whatever the inputs.
    expect(targetReached).toBe(matchScore >= TAILOR_CONFIG.targetScore);

    if (!targetReached) {
      expect(notes.some((note) => note.includes('best honest match'))).toBe(true);
    }
  });

  it('keeps the alignment sentence to one, however many batches it adds', () => {
    const { draft } = tailorCV(shopCV(), BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    const occurrences = draft.summary.split('Focus for this role:').length - 1;
    expect(occurrences).toBeLessThanOrEqual(1);
  });

  it('assumes no more than the configured ceiling, and labels each one', () => {
    const { assumedSkills, changes } = tailorCV(shopCV(), BACKEND_ADVERT, {
      jobTitle: 'Backend Developer',
    });

    expect(assumedSkills.length).toBeGreaterThan(0);
    expect(assumedSkills.length).toBeLessThanOrEqual(TAILOR_CONFIG.skills.maxAssumed);

    // Every one is recorded as an assumption, not as an ordinary change.
    const assumedChanges = changes.filter((change) => change.kind === 'assumed');
    expect(assumedChanges).toHaveLength(assumedSkills.length);
    for (const change of assumedChanges) {
      expect(change.reason).toContain('assumption');
    }
  });

  it('assumes nothing on a CV with no content to tailor', () => {
    // An empty CV scores zero against everything, so without a guard the
    // target pass would bolt its whole allowance onto a blank document.
    const { draft, assumedSkills } = tailorCV({}, BACKEND_ADVERT, {
      jobTitle: 'Backend Developer',
    });

    expect(assumedSkills).toEqual([]);
    expect(draft.skills).toEqual([]);
  });

  it('copes with an empty CV', () => {
    const { draft, changes } = tailorCV({}, BACKEND_ADVERT, { jobTitle: 'Backend Developer' });

    expect(draft.skills).toEqual([]);
    expect(draft.experience).toEqual([]);
    expect(Array.isArray(changes)).toBe(true);
  });
  describe('filling the page', () => {
    it('reports how much of a page the draft fills', () => {
      const { pageFill } = tailorCV(marketingCV(), MARKETING_ADVERT, {
        jobTitle: 'Lead Content Marketer',
      });

      expect(pageFill.ratio).toBeGreaterThan(0);
      expect(pageFill.capacity).toBeGreaterThan(0);
      expect(typeof pageFill.isFull).toBe('boolean');
    });

    it('fills more of the page than the CV started with', () => {
      const { pageFill } = tailorCV(marketingCV(), MARKETING_ADVERT, {
        jobTitle: 'Lead Content Marketer',
      });

      // The levers are a longer summary and larger type, so a thin CV
      // always ends fuller than it began — the question is only by how
      // much, which depends on how thin it was.
      expect(pageFill.ratio).toBeGreaterThanOrEqual(pageFill.startRatio);
    });

    it('sets the type larger rather than leaving half a page blank', () => {
      const { draft, changes } = tailorCV(marketingCV(), MARKETING_ADVERT, {
        jobTitle: 'Lead Content Marketer',
      });

      expect(draft.settings.fontSize).toBe('large');

      const sizeChange = changes.find((change) => change.field === 'font size');
      expect(sizeChange).toBeDefined();
      expect(sizeChange.reason).toContain('fills the page');
    });

    it('lengthens the summary without inventing anything', () => {
      const cv = marketingCV();
      const { draft } = tailorCV(cv, MARKETING_ADVERT, { jobTitle: 'Lead Content Marketer' });

      // Every clause has to trace back to something on the CV or to the
      // advertised job title. The qualification and the quantified
      // achievement are the two the expanded summary reaches for.
      expect(draft.summary).toContain('BBA');
      expect(draft.summary).toContain('120%');
      expect(draft.summary.length).toBeGreaterThan(cv.summary.length);
    });

    it('says what would fill the rest when it cannot fill it alone', () => {
      const { notes, pageFill } = tailorCV(shopCV(), BACKEND_ADVERT, {
        jobTitle: 'Backend Developer',
      });

      expect(pageFill.isFull).toBe(false);

      const advice = notes.find((note) => note.includes('of an A4 page'));
      expect(advice).toBeDefined();
      // The point of the note: it refuses, and then helps.
      expect(advice).toContain('will not invent experience');
    });

    it('shows a hidden section that has content rather than leaving a gap', () => {
      const cv = marketingCV();
      cv.settings = { hiddenSections: ['education'] };

      const { draft, changes } = tailorCV(cv, MARKETING_ADVERT, {
        jobTitle: 'Lead Content Marketer',
      });

      expect(draft.settings.hiddenSections).not.toContain('education');

      const revealed = changes.find((change) => change.field === 'hidden sections');
      expect(revealed.reason).toContain('hidden');
    });

    it('leaves a full page alone', () => {
      const cv = marketingCV();

      // Enough content that the page is already full: the fill step
      // should not then blow it onto a second page with larger type.
      cv.experience = Array.from({ length: 4 }, (_, index) => ({
        company: `Company ${index}`,
        position: 'Marketing Executive',
        startDate: '2018-01',
        endDate: '2024-06',
        description: 'Ran social media and email campaigns for the brand across several markets.',
        achievements: [
          'Grew organic traffic by 120%',
          'Cut cost per acquisition by 30%',
          'Ran 20 campaigns',
        ],
      }));

      const { draft, pageFill } = tailorCV(cv, MARKETING_ADVERT, {
        jobTitle: 'Lead Content Marketer',
      });

      expect(pageFill.isFull).toBe(true);
      expect(draft.settings.fontSize).not.toBe('large');
    });
  });
});

describe('yearsOfExperience — gaps', () => {
  it('does not count a gap between jobs', () => {
    // Two years, a three-year gap, then one more year: three years worked.
    const years = yearsOfExperience([
      { startDate: '2015-01', endDate: '2017-01' },
      { startDate: '2020-01', endDate: '2021-01' },
    ]);
    expect(years).toBe(3);
  });
});

describe('softenTitle', () => {
  const cv = {
    personal: { headline: 'QA Engineer' },
    experience: [{ position: 'Junior QA Analyst' }],
  };

  it('drops a seniority word the CV does not support', () => {
    expect(softenTitle('Senior QA Engineer', cv)).toEqual({
      title: 'QA Engineer',
      removed: ['Senior'],
    });
  });

  it('keeps it when the CV already shows that level', () => {
    const senior = { ...cv, experience: [{ position: 'Senior Tester' }] };
    expect(softenTitle('Senior QA Engineer', senior).title).toBe('Senior QA Engineer');
  });

  it('falls back to the CV headline when the rest is not a title', () => {
    expect(softenTitle('Head of Quality', cv).title).toBe('QA Engineer');
  });
});

describe('tailorCV — wording', () => {
  it('rewords weak bullets without changing their facts', () => {
    const cv = {
      personal: { fullName: 'A Person', headline: 'QA Engineer' },
      experience: [
        {
          position: 'QA Engineer',
          startDate: '2021-01',
          endDate: '2024-01',
          description: 'Performing regression testing. I wrote 300 Cypress tests.',
          achievements: ['Was able to reduce release time by 30%'],
        },
      ],
      skills: [{ name: 'Cypress' }],
    };

    const { draft } = tailorCV(cv, 'Senior QA Engineer. Cypress, regression testing.', {
      jobTitle: 'Senior QA Engineer',
    });

    expect(draft.experience[0].description).toBe(
      'Performed regression testing. Wrote 300 Cypress tests.',
    );
    expect(draft.experience[0].achievements[0]).toBe('Reduced release time by 30%');
    // No senior role on the CV, so the headline does not claim one.
    expect(draft.personal.headline).toBe('QA Engineer');
    // The closing sentence still names the role being applied for.
    expect(draft.summary).toContain('Senior QA Engineer');
  });
});
