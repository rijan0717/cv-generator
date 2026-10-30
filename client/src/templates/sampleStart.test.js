import { describe, it, expect } from 'vitest';
import {
  sampleContent,
  sampleFor,
  untouchedSample,
  sampleSwapFor,
  sampleLeftovers,
  clearSampleContent,
} from './sampleCV.js';

/** A CV as it is right after createStarterCV, in the given template. */
function starter(templateKey) {
  return {
    templateKey,
    references: [],
    ...sampleContent(templateKey, { fullName: 'Rijan Pariyar', email: 'rijan@example.com' }),
  };
}

describe('starting a CV from the sample', () => {
  it("fills every section with the template's sample, keeping the user's name and email", () => {
    const cv = starter('rosewood');
    const sample = sampleFor('rosewood');

    expect(cv.personal.fullName).toBe('Rijan Pariyar');
    expect(cv.personal.email).toBe('rijan@example.com');
    expect(cv.personal.headline).toBe(sample.personal.headline);
    expect(cv.personal.photoUrl).toBe('');
    expect(cv.summary).toBe(sample.summary);
    expect(cv.experience).toHaveLength(sample.experience.length);
    expect(cv.experience[0]).not.toHaveProperty('_id');
  });

  it('swaps the sample along with the template while nothing has been typed', () => {
    const cv = starter('classic');
    expect(untouchedSample(cv)).not.toBeNull();

    const patch = sampleSwapFor(cv, 'atelier');
    expect(patch.summary).toBe(sampleFor('atelier').summary);
    expect(patch.personal.fullName).toBe('Rijan Pariyar');
  });

  it("leaves the user's own words alone once they have started", () => {
    const cv = { ...starter('classic'), summary: 'My own summary.' };
    expect(sampleSwapFor(cv, 'atelier')).toEqual({});
  });

  it('lists the sections still holding sample text, and none once cleared', () => {
    const cv = starter('basalt');
    expect(sampleLeftovers(cv).map((item) => item.key)).toEqual([
      'personal',
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'languages',
    ]);

    const cleared = { ...cv, ...clearSampleContent(cv) };
    expect(sampleLeftovers(cleared)).toEqual([]);
    expect(cleared.personal.fullName).toBe('Rijan Pariyar');
  });

  it('keeps a real entry added beside the sample one', () => {
    const cv = starter('classic');
    cv.experience = [...cv.experience, { company: 'My Real Company', position: 'Tester' }];

    const cleared = clearSampleContent(cv);
    expect(cleared.experience).toEqual([{ company: 'My Real Company', position: 'Tester' }]);
  });
});
