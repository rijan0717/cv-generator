import { describe, it, expect } from 'vitest';
import {
  scoreCV,
  foundation,
  hasQuantifiedResult,
  startsWithActionVerb,
} from '../../src/algorithms/cvStrengthScorer.js';

/** A CV with nothing in it at all. */
const blank = {
  personal: {},
  summary: '',
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

/** What the builder creates: the account name and email, nothing else. */
const justCreated = {
  ...blank,
  personal: { fullName: 'Rijan Pariyar', email: 'rijan@example.com' },
};

/** A complete, well-written CV. */
const strong = {
  personal: {
    fullName: 'Rijan Pariyar',
    headline: 'Operations Manager',
    email: 'rijan@example.com',
    phone: '+977 9812345678',
    address: 'Lalitpur',
    linkedin: 'linkedin.com/in/example',
    photoUrl: '/uploads/photo.png',
  },
  summary:
    'Operations manager with six years running service teams of up to twenty people across ' +
    'three sites. Cut fulfilment time by 35% and introduced the weekly reporting the board ' +
    'now uses to plan capacity for the year ahead.',
  experience: [
    {
      company: 'Himalaya Logistics',
      position: 'Operations Manager',
      startDate: '2022-04',
      isCurrent: true,
      description: 'Led three depots, a team of 20 and an annual budget of 40 million rupees.',
      achievements: [
        'Reduced average fulfilment time from 52 to 34 hours across three sites',
        'Negotiated carrier terms saving 2.1 million rupees in the first year',
      ],
    },
    {
      company: 'Everest Retail',
      position: 'Assistant Manager',
      startDate: '2019-06',
      endDate: '2022-03',
      description: 'Managed scheduling and supplier coordination for the flagship store.',
      achievements: ['Rebuilt the rota, cutting overtime spend by 18%'],
    },
  ],
  education: [
    {
      institution: 'Tribhuvan University',
      degree: 'BBA',
      startDate: '2015-07',
      endDate: '2019-05',
    },
  ],
  projects: [],
  skills: [
    { name: 'Operations planning' },
    { name: 'Team leadership' },
    { name: 'Budget management' },
    { name: 'Supplier negotiation' },
    { name: 'KPI reporting' },
  ],
};

describe('the foundation gate', () => {
  it('counts nothing as present for an empty CV', () => {
    const base = foundation(blank);
    expect(base.present).toBe(0);
    expect(base.factor).toBeCloseTo(0.1, 5);
    expect(base.missing).toHaveLength(4);
  });

  it('rises as each component is added', () => {
    const withSkills = { ...blank, skills: [{ name: 'Excel' }] };
    const withSkillsAndEducation = { ...withSkills, education: [{ institution: 'TU' }] };

    expect(foundation(withSkills).factor).toBeLessThan(foundation(withSkillsAndEducation).factor);
  });

  it('reaches full weight once all four components exist', () => {
    const base = foundation(strong);
    expect(base.present).toBe(4);
    expect(base.factor).toBe(1);
    expect(base.missing).toEqual([]);
  });
});

describe('scoreCV', () => {
  it('scores an entirely empty CV as zero', () => {
    expect(scoreCV(blank).totalScore).toBe(0);
  });

  it('scores a newly created CV as 1, not double figures', () => {
    // The builder copies the account name and email in, which is not
    // progress the user made. Before the foundation gate this scored 13.
    const result = scoreCV(justCreated);

    expect(result.totalScore).toBe(1);
    expect(result.rawScore).toBeGreaterThan(1);
    expect(result.foundation.factor).toBeCloseTo(0.1, 5);
  });

  it('never rounds a CV that has earned something down to zero', () => {
    const result = scoreCV({ ...blank, personal: { fullName: 'A Name' } });

    expect(result.rawScore).toBeGreaterThan(0);
    expect(result.totalScore).toBe(1);
  });

  it('scores a complete, well-written CV highly', () => {
    const result = scoreCV(strong);

    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.foundation.factor).toBe(1);
  });

  it('rises as a CV is filled in', () => {
    const half = { ...justCreated, summary: strong.summary, skills: strong.skills };

    expect(scoreCV(justCreated).totalScore).toBeLessThan(scoreCV(half).totalScore);
    expect(scoreCV(half).totalScore).toBeLessThan(scoreCV(strong).totalScore);
  });

  it('gives no marks for consistent dates when there are no dates', () => {
    const criterion = scoreCV(justCreated).breakdown.find(
      (item) => item.criterion === 'Consistent dates',
    );

    expect(criterion.earned).toBe(0);
    expect(criterion.passed).toBe(false);
  });

  it('gives the date marks once entries carry sensible dates', () => {
    const criterion = scoreCV(strong).breakdown.find(
      (item) => item.criterion === 'Consistent dates',
    );

    expect(criterion.passed).toBe(true);
    expect(criterion.earned).toBeGreaterThan(0);
  });

  it('withholds the date marks when an end date precedes its start', () => {
    const muddled = {
      ...strong,
      experience: [{ ...strong.experience[1], startDate: '2022-03', endDate: '2019-06' }],
    };
    const criterion = scoreCV(muddled).breakdown.find(
      (item) => item.criterion === 'Consistent dates',
    );

    expect(criterion.passed).toBe(false);
  });

  it('explains what is holding an unfinished CV back', () => {
    const result = scoreCV(justCreated);

    expect(result.suggestions[0]).toMatch(/held back/i);
    expect(result.suggestions[0]).toContain('skills');
  });

  it('tolerates a missing CV object', () => {
    expect(scoreCV(undefined).totalScore).toBe(0);
  });
});

describe('the writing checks', () => {
  it('sees a quantified result', () => {
    expect(hasQuantifiedResult('Reduced load time by 40%')).toBe(true);
    expect(hasQuantifiedResult('Saved £5,000 a year')).toBe(true);
    expect(hasQuantifiedResult('Trained 14 supervisors')).toBe(true);
  });

  it('ignores a single digit, which is usually a team size rather than a result', () => {
    expect(hasQuantifiedResult('Worked in a team of 5')).toBe(false);
  });

  it('recognises an opening action verb', () => {
    expect(startsWithActionVerb('Built the reporting pipeline')).toBe(true);
    expect(startsWithActionVerb('Responsible for the reporting pipeline')).toBe(false);
  });
});
