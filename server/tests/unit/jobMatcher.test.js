/**
 * Unit tests for the CV–Job Match Analyser.
 *
 * These run without a database: the analyser is a pure function, which is
 * the whole reason it was written as one.
 */
import { describe, it, expect } from 'vitest';
import {
  analyseMatch,
  scoreJobsAgainstCV,
  scaleSimilarity,
  matchBand,
  skillsFromSection,
  buildSurfaceForms,
} from '../../src/algorithms/jobMatcher.js';
import { MATCH_CONFIG } from '../../src/config/scoringConfig.js';

/** A CV that genuinely suits the backend advert below. */
const backendCV = {
  personal: { headline: 'Backend Developer' },
  summary:
    'Backend developer with three years building REST APIs in Node.js and Express, ' +
    'working with MongoDB and deploying with Docker.',
  experience: [
    {
      position: 'Backend Developer',
      company: 'Acme',
      description:
        'Built and maintained REST APIs with Node.js and Express. Designed MongoDB schemas ' +
        'and wrote unit tests. Deployed services with Docker and set up CI/CD pipelines.',
      achievements: ['Cut average response time by 40% by adding database indexes'],
    },
  ],
  education: [{ degree: 'BCA', fieldOfStudy: 'Computer Application', institution: 'TU' }],
  skills: [
    { name: 'Node.js', level: 'Advanced' },
    { name: 'Express', level: 'Advanced' },
    { name: 'MongoDB', level: 'Intermediate' },
    { name: 'Docker', level: 'Intermediate' },
    { name: 'Git', level: 'Advanced' },
  ],
  projects: [],
};

/** A CV in a completely different field. */
const nurseCV = {
  personal: { headline: 'Registered Nurse' },
  summary: 'Registered nurse with five years on a busy surgical ward.',
  experience: [
    {
      position: 'Staff Nurse',
      company: 'City Hospital',
      description:
        'Cared for post-operative patients, administered medication and kept clinical records.',
      achievements: [],
    },
  ],
  skills: [
    { name: 'Patient Care', level: 'Expert' },
    { name: 'Communication', level: 'Advanced' },
  ],
  projects: [],
};

const backendAdvert =
  'We are looking for a backend developer to design and build REST APIs using Node.js and ' +
  'Express. You will model data in MongoDB, write unit tests, containerise services with ' +
  'Docker and maintain our CI/CD pipeline on AWS. Experience with Redis and Kubernetes is ' +
  'an advantage. You will work in an agile team and take part in code reviews.';

describe('scaleSimilarity', () => {
  const { floor, ceiling } = MATCH_CONFIG.similarityScaling;

  it('reports nothing below the floor', () => {
    expect(scaleSimilarity(0)).toBe(0);
    expect(scaleSimilarity(floor)).toBe(0);
  });

  it('reports full marks at and above the ceiling', () => {
    expect(scaleSimilarity(ceiling)).toBe(1);
    expect(scaleSimilarity(0.9)).toBe(1);
  });

  it('is linear between the two', () => {
    const middle = (floor + ceiling) / 2;
    expect(scaleSimilarity(middle)).toBeCloseTo(0.5, 5);
  });
});

describe('matchBand', () => {
  it('names each band from its lower bound', () => {
    expect(matchBand(95)).toBe('Excellent match');
    expect(matchBand(70)).toBe('Strong match');
    expect(matchBand(55)).toBe('Moderate match');
    expect(matchBand(35)).toBe('Weak match');
    expect(matchBand(0)).toBe('Poor match');
  });
});

describe('skillsFromSection', () => {
  it('reads canonical names out of the skills section', () => {
    const skills = skillsFromSection(backendCV);
    expect(skills.has('Node.js')).toBe(true);
    expect(skills.has('MongoDB')).toBe(true);
  });

  it('ignores skills it does not recognise, without failing', () => {
    const skills = skillsFromSection({ skills: [{ name: 'Underwater basket weaving' }] });
    expect(skills.size).toBe(0);
  });

  it('copes with a CV that has no skills at all', () => {
    expect(skillsFromSection({}).size).toBe(0);
  });
});

describe('buildSurfaceForms', () => {
  it('prefers the base word when the stemmer leaves it unchanged', () => {
    const forms = buildSurfaceForms('We test what was tested during testing');
    expect(forms.get('test')).toBe('test');
  });

  it('falls back to the shortest word sharing the stem', () => {
    // Nothing here stems to "manag" except the inflected forms, so the
    // shortest of those is what the user is shown.
    const forms = buildSurfaceForms('Managing the management of managed teams');
    expect(forms.get('manag')).toBe('managed');
  });
});

describe('analyseMatch', () => {
  it('scores a well-suited CV far above an unrelated one', () => {
    const good = analyseMatch(backendCV, backendAdvert);
    const bad = analyseMatch(nurseCV, backendAdvert);

    expect(good.matchScore).toBeGreaterThan(bad.matchScore);
    expect(good.matchScore).toBeGreaterThan(50);
    expect(bad.matchScore).toBeLessThan(30);
  });

  it('keeps every reported figure inside its range', () => {
    const result = analyseMatch(backendCV, backendAdvert);

    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
    expect(result.cosineSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.cosineSimilarity).toBeLessThanOrEqual(1);
    expect(result.skillCoverage).toBeGreaterThanOrEqual(0);
    expect(result.skillCoverage).toBeLessThanOrEqual(1);
  });

  it('separates the skills the advert wants into matched and missing', () => {
    const { matchedSkills, missingSkills } = analyseMatch(backendCV, backendAdvert);

    expect(matchedSkills).toContain('Node.js');
    expect(matchedSkills).toContain('Docker');
    // In the advert, absent from the CV's skills section.
    expect(missingSkills).toContain('Kubernetes');
    expect(missingSkills).toContain('Redis');
    // Nothing may appear in both lists.
    expect(matchedSkills.filter((skill) => missingSkills.includes(skill))).toEqual([]);
  });

  it('spots a skill described in the experience but left out of the skills list', () => {
    const cv = {
      ...backendCV,
      skills: backendCV.skills.filter((skill) => skill.name !== 'Docker'),
    };

    const result = analyseMatch(cv, backendAdvert);

    expect(result.mentionedButNotListed).toContain('Docker');
    expect(result.suggestions.join(' ')).toMatch(/skills section/i);
  });

  it('reports readable keywords, not stems', () => {
    const { matchedKeywords, missingKeywords } = analyseMatch(backendCV, backendAdvert);
    const all = [...matchedKeywords, ...missingKeywords].map((entry) => entry.keyword);

    expect(all.length).toBeGreaterThan(0);
    // "kubernet" is what the stemmer produces; the user must never see it.
    expect(all).not.toContain('kubernet');
    expect(all.some((word) => word.includes('_'))).toBe(false);
  });

  it('never puts the same keyword in both the matched and missing lists', () => {
    const { matchedKeywords, missingKeywords } = analyseMatch(backendCV, backendAdvert);
    const matched = new Set(matchedKeywords.map((entry) => entry.keyword));

    expect(missingKeywords.filter((entry) => matched.has(entry.keyword))).toEqual([]);
  });

  it('honours the reporting limits in the config', () => {
    const result = analyseMatch(backendCV, backendAdvert);

    expect(result.matchedKeywords.length).toBeLessThanOrEqual(MATCH_CONFIG.maxMatchedKeywords);
    expect(result.missingKeywords.length).toBeLessThanOrEqual(MATCH_CONFIG.maxMissingKeywords);
  });

  it('scores an empty CV at zero rather than throwing', () => {
    const result = analyseMatch({}, backendAdvert);

    expect(result.matchScore).toBe(0);
    expect(result.cosineSimilarity).toBe(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('survives an empty advert', () => {
    const result = analyseMatch(backendCV, '');

    expect(result.matchScore).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it('falls back to similarity alone when the advert names no known skill', () => {
    const vagueAdvert =
      'We want a hardworking person to join our friendly team in a busy office. You will ' +
      'help colleagues, answer the telephone and keep our records tidy and up to date.';

    const result = analyseMatch(backendCV, vagueAdvert);

    expect(result.skillCoverage).toBeNull();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it('gives the same answer twice for the same input', () => {
    const first = analyseMatch(backendCV, backendAdvert);
    const second = analyseMatch(backendCV, backendAdvert);

    expect(second).toEqual(first);
  });

  it('grows the corpus when prior adverts are supplied', () => {
    const withHistory = analyseMatch(backendCV, backendAdvert, {
      priorJobDescriptions: [backendAdvert, 'A completely unrelated advert about catering.'],
    });

    expect(withHistory.corpusSize).toBe(analyseMatch(backendCV, backendAdvert).corpusSize + 2);
  });
});

describe('scoreJobsAgainstCV', () => {
  const nursingAdvert =
    'Staff nurse required for a busy surgical ward. You will care for post operative patients, ' +
    'administer medication and keep accurate clinical records.';

  it('returns one result per job, in the order given', () => {
    const results = scoreJobsAgainstCV(backendCV, [
      { id: 'a', text: backendAdvert },
      { id: 'b', text: nursingAdvert },
    ]);

    expect(results.map((result) => result.id)).toEqual(['a', 'b']);
  });

  it('ranks the relevant advert above the unrelated one', () => {
    const [backend, nursing] = scoreJobsAgainstCV(backendCV, [
      { id: 'a', text: backendAdvert },
      { id: 'b', text: nursingAdvert },
    ]);

    expect(backend.matchScore).toBeGreaterThan(nursing.matchScore);
    expect(backend.band).toBe(matchBand(backend.matchScore));
  });

  it('keeps every score inside 0 to 100', () => {
    for (const result of scoreJobsAgainstCV(backendCV, [
      { id: 'a', text: backendAdvert },
      { id: 'b', text: nursingAdvert },
    ])) {
      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    }
  });

  it('returns nothing for an empty list', () => {
    expect(scoreJobsAgainstCV(backendCV, [])).toEqual([]);
  });

  it('scores an empty CV at zero without throwing', () => {
    const [result] = scoreJobsAgainstCV({}, [{ id: 'a', text: backendAdvert }]);
    expect(result.matchScore).toBe(0);
  });

  // The badge on a job card and the score inside the full analysis are
  // produced by different code paths. A user who sees 85% on the board and
  // then opens the analysis must not be shown a different number, so the
  // two are checked against each other. They are not identical, because
  // the batch corpus contains every advert on the page rather than one —
  // but they must agree closely.
  it('agrees with the full analysis to within a few points', () => {
    const [batch] = scoreJobsAgainstCV(backendCV, [{ id: 'a', text: backendAdvert }]);
    const full = analyseMatch(backendCV, backendAdvert);

    expect(Math.abs(batch.matchScore - full.matchScore)).toBeLessThanOrEqual(3);
  });
});
