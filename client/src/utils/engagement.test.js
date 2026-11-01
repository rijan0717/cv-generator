import { describe, it, expect } from 'vitest';
import { engagementFor, formatCount } from './engagement.js';

/**
 * The figures on the template cards are generated rather than measured,
 * which is exactly why they need testing: the one property that makes a
 * fabricated number acceptable on screen is that it never moves.
 */
describe('formatCount', () => {
  it('leaves anything under a thousand alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('abbreviates a thousand and above to one decimal place', () => {
    expect(formatCount(1200)).toBe('1.2k');
    expect(formatCount(28431)).toBe('28.4k');
  });

  it('drops a trailing .0 rather than printing "12.0k"', () => {
    expect(formatCount(12000)).toBe('12k');
  });
});

describe('engagementFor', () => {
  it('gives the same template the same figures every time', () => {
    // The whole point: a count that changed between renders would read as
    // a broken page rather than as a number.
    expect(engagementFor('classic')).toEqual(engagementFor('classic'));
  });

  it('gives different templates different figures', () => {
    const classic = engagementFor('classic');
    const modern = engagementFor('modern');
    expect(classic).not.toEqual(modern);
  });

  it('keeps both figures inside a believable range', () => {
    // A template showing 4 likes, or 900,000 views, would say more about
    // the generator than about the template.
    for (const key of ['classic', 'modern', 'minimal', 'creative', 'ats', 'executive']) {
      const { likes, views } = engagementFor(key);

      expect(Number.isInteger(likes)).toBe(true);
      expect(likes).toBeGreaterThanOrEqual(24);
      expect(likes).toBeLessThanOrEqual(320);

      expect(Number.isInteger(views)).toBe(true);
      expect(views).toBeGreaterThanOrEqual(1200);
      expect(views).toBeLessThanOrEqual(28000);
    }
  });

  it('does not derive the views from the likes', () => {
    // If views were likes times a constant, every card would show the
    // same ratio and the row would look generated.
    const ratios = ['classic', 'modern', 'minimal', 'creative'].map((key) => {
      const { likes, views } = engagementFor(key);
      return Math.round((views / likes) * 100);
    });

    expect(new Set(ratios).size).toBeGreaterThan(1);
  });
});
