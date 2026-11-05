import { describe, it, expect } from 'vitest';
import {
  composeCoverLetter,
  gatherFacts,
  matchedSkills,
  skillGaps,
  mostRecentExperience,
  toClause,
  fill,
} from '../../src/algorithms/coverLetterComposer.js';
import { COVER_LETTER_CONFIG as CONFIG } from '../../src/config/coverLetterConfig.js';

/** A full CV: dated roles, quantified achievements, skills and a project. */
const full = {
  personal: {
    fullName: 'Rijan Pariyar',
    headline: 'Operations Manager',
    email: 'rijan@example.com',
  },
  summary: 'Operations manager with six years running service teams.',
  experience: [
    {
      company: 'Himalaya Logistics',
      position: 'Operations Manager',
      startDate: '2022-04',
      isCurrent: true,
      description: 'Responsible for running the fulfilment desk across three sites.',
      achievements: [
        'Cut average fulfilment time by 35% across three regional sites',
        'Introduced the weekly reporting pack the board now uses for capacity planning',
      ],
    },
    {
      company: 'Everest Freight',
      position: 'Logistics Coordinator',
      startDate: '2019-01',
      endDate: '2022-03',
      description: 'Coordinated inbound shipments and supplier bookings.',
      achievements: [],
    },
  ],
  projects: [
    {
      name: 'Depot Dashboard',
      description: 'Built a reporting dashboard that replaced a manual spreadsheet process.',
      technologies: ['JavaScript'],
    },
  ],
  skills: [
    { name: 'Excel', level: 'Expert' },
    { name: 'SQL', level: 'Advanced' },
    { name: 'Logistics', level: 'Advanced' },
    { name: 'Power BI', level: 'Intermediate' },
  ],
};

/** A sparse CV: a name and one skill, nothing else to draw on. */
const sparse = {
  personal: { fullName: 'Sita Gurung' },
  experience: [],
  projects: [],
  skills: [{ name: 'Excel', level: 'Beginner' }],
};

/** Experience written without a single number in it. */
const unquantified = {
  ...full,
  experience: [
    {
      company: 'Himalaya Logistics',
      position: 'Operations Manager',
      startDate: '2022-04',
      isCurrent: true,
      description: 'Managed the fulfilment desk and supported the regional supervisors.',
      achievements: ['Rebuilt the supplier booking process from end to end'],
    },
  ],
};

const advert =
  'We are looking for an Operations Manager to run our fulfilment function. ' +
  'You will own supplier relationships and reporting. Strong Excel and SQL skills ' +
  'are essential, and experience with Python would be an advantage. ' +
  'You will report to the Head of Operations.';

describe('fill', () => {
  it('fills every placeholder it is given', () => {
    expect(fill('Hello {name}, welcome to {place}.', { name: 'Sita', place: 'Kathmandu' })).toBe(
      'Hello Sita, welcome to Kathmandu.',
    );
  });

  it('returns null when a value is missing, so the caller can fall back', () => {
    expect(fill('Apply for {jobTitle} at {company}.', { company: 'Acme' })).toBeNull();
    expect(fill('Apply for {jobTitle}.', { jobTitle: '   ' })).toBeNull();
  });
});

describe('toClause', () => {
  it('turns a CV line into something that can follow "I"', () => {
    expect(toClause('Cut average fulfilment time by 35%')).toBe(
      'cut average fulfilment time by 35%',
    );
  });

  it('leaves an opening acronym in capitals', () => {
    expect(toClause('SQL reporting rebuilt for the finance team')).toMatch(/^SQL/);
  });

  it('returns an empty string for an empty line', () => {
    expect(toClause('')).toBe('');
  });
});

describe('mostRecentExperience', () => {
  it('prefers the role the user still holds', () => {
    expect(mostRecentExperience(full.experience).company).toBe('Himalaya Logistics');
  });

  it('falls back to the latest start date when none is current', () => {
    const finished = full.experience.map((entry) => ({ ...entry, isCurrent: false }));
    expect(mostRecentExperience(finished).company).toBe('Himalaya Logistics');
  });

  it('returns null when there is no experience', () => {
    expect(mostRecentExperience([])).toBeNull();
  });
});

describe('gatherFacts', () => {
  it('orders skills by level, strongest first', () => {
    expect(gatherFacts(full).skills[0]).toBe('Excel');
  });

  it('counts years from the merged date ranges', () => {
    expect(gatherFacts(full).years).toBeGreaterThan(0);
  });

  it('survives a CV with nothing in it', () => {
    const facts = gatherFacts({});
    expect(facts.fullName).toBe('');
    expect(facts.skills).toEqual([]);
    expect(facts.latest).toBeNull();
  });
});

describe('matchedSkills', () => {
  it('returns only the skills the advert also mentions', () => {
    const shared = matchedSkills(['Excel', 'SQL', 'Power BI'], advert);
    expect(shared).toContain('Excel');
    expect(shared).toContain('SQL');
    expect(shared).not.toContain('Power BI');
  });

  it('returns nothing when there is no advert', () => {
    expect(matchedSkills(['Excel'], '')).toEqual([]);
  });
});

describe('skillGaps', () => {
  it('reports a skill the advert asks for but the CV does not list', () => {
    expect(skillGaps(['Excel', 'SQL'], advert)).toContain('Python');
  });

  it('does not report a skill the CV already lists', () => {
    expect(skillGaps(['Excel', 'SQL'], advert)).not.toContain('Excel');
  });
});

describe('composeCoverLetter — a full CV with an advert', () => {
  const letter = composeCoverLetter(full, {
    companyName: 'Sagarmatha Supply',
    jobTitle: 'Operations Manager',
    jobDescription: advert,
  });

  it('names the role and the company in the subject and the opening', () => {
    expect(letter.subject).toBe('Application for Operations Manager — Rijan Pariyar');
    expect(letter.body).toContain('Operations Manager position at Sagarmatha Supply');
  });

  it('greets a named reader when one is given, and a generic one otherwise', () => {
    expect(letter.body.startsWith('Dear Hiring Manager,')).toBe(true);

    const named = composeCoverLetter(full, {
      companyName: 'Sagarmatha Supply',
      recipientName: 'Ms Shrestha',
    });
    expect(named.body.startsWith('Dear Ms Shrestha,')).toBe(true);
  });

  it('leads the evidence with the quantified achievement', () => {
    expect(letter.body).toContain('35%');
    expect(letter.usedFacts.points[0]).toContain('35%');
  });

  it('names only the skills the CV and the advert share', () => {
    expect(letter.usedFacts.matchedSkills).toContain('Excel');
    expect(letter.usedFacts.matchedSkills).not.toContain('Power BI');
    expect(letter.body).not.toContain('Python');
  });

  it('reports the missing skill as advice rather than claiming it', () => {
    expect(letter.notes.join(' ')).toContain('Python');
  });

  it('signs off with the name from the CV', () => {
    expect(letter.body.trimEnd().endsWith('Rijan Pariyar')).toBe(true);
    expect(letter.body).toContain(CONFIG.signOff);
  });

  it('does not complain about a missing advert', () => {
    expect(letter.notes).not.toContain(CONFIG.notes.noJobDescription);
  });
});

describe('composeCoverLetter — no advert pasted', () => {
  const letter = composeCoverLetter(full, { companyName: 'Sagarmatha Supply' });

  it('still produces a letter', () => {
    expect(letter.body.length).toBeGreaterThan(0);
    expect(letter.subject).toBe('Application — Rijan Pariyar');
  });

  it('says why the letter is generic', () => {
    expect(letter.notes).toContain(CONFIG.notes.noJobDescription);
  });

  it('falls back to the strongest skills', () => {
    expect(letter.usedFacts.skills[0]).toBe('Excel');
  });
});

describe('composeCoverLetter — a sparse CV', () => {
  const letter = composeCoverLetter(sparse, { companyName: 'Sagarmatha Supply' });

  it('produces a letter rather than failing', () => {
    expect(letter.body).toContain('Sagarmatha Supply');
    expect(letter.body).toContain('Sita Gurung');
  });

  it('says it had nothing to cite', () => {
    expect(letter.notes).toContain(CONFIG.notes.noEvidence);
  });

  it('says it could not name any skills', () => {
    expect(letter.notes).toContain(CONFIG.notes.fewSkills);
    expect(letter.usedFacts.skills).toEqual([]);
  });

  it('says the opening could not describe what they do', () => {
    expect(letter.notes).toContain(CONFIG.notes.noHeadline);
  });

  it('warns that the letter is short', () => {
    expect(letter.notes).toContain(CONFIG.notes.tooShort);
  });
});

describe('composeCoverLetter — nothing quantified', () => {
  const letter = composeCoverLetter(unquantified, {
    companyName: 'Sagarmatha Supply',
    jobTitle: 'Operations Manager',
  });

  it('still cites what the user did', () => {
    expect(letter.usedFacts.points.length).toBeGreaterThan(0);
  });

  it('asks for a number instead of inventing one', () => {
    expect(letter.notes).toContain(CONFIG.notes.noQuantifiedAchievement);
    expect(letter.body).not.toMatch(/\d+%/);
  });
});

describe('composeCoverLetter — honesty', () => {
  it('never writes a company the caller did not name', () => {
    const letter = composeCoverLetter(full, { companyName: 'Sagarmatha Supply' });
    expect(letter.body).not.toContain('Acme');
  });

  it('falls back to a project when there is no employment history', () => {
    const projectOnly = { ...full, experience: [] };
    const letter = composeCoverLetter(projectOnly, { companyName: 'Sagarmatha Supply' });

    expect(letter.body).toContain('Depot Dashboard');
    expect(letter.notes).toContain(CONFIG.notes.noExperience);
  });

  it('keeps the subject within the length Gmail shows', () => {
    const letter = composeCoverLetter(full, {
      companyName: 'Sagarmatha Supply',
      jobTitle: 'O'.repeat(300),
    });
    expect(letter.subject.length).toBeLessThanOrEqual(CONFIG.subject.maxCharacters);
  });
});
