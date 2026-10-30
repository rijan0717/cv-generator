import { describe, it, expect } from 'vitest';
import { DESIGNS } from './designs.js';
import { DESIGN_OPTIONS } from './DesignedTemplate.jsx';
import { FONT_STACKS } from '../templateUtils.js';
import { TEMPLATES, CATEGORIES } from '../index.js';

/**
 * Checks on the design data itself.
 *
 * A design is data, so the usual way to break one is a misspelt value
 * rather than a broken render: `heading: 'underlined'` would silently draw
 * no heading decoration at all, because no CSS rule matches it and nothing
 * else would complain. These tests are what makes that a failure.
 */
describe('designs', () => {
  const CATEGORY_KEYS = CATEGORIES.map((category) => category.key);

  it('gives every design a unique key', () => {
    const keys = DESIGNS.map((design) => design.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(DESIGNS)('$name uses only known option values', (design) => {
    for (const [option, allowed] of Object.entries(DESIGN_OPTIONS)) {
      // Every option is optional; the renderer fills in a default.
      if (design[option] === undefined) continue;
      expect(Object.keys(allowed)).toContain(design[option]);
    }
  });

  it.each(DESIGNS)('$name uses a category the gallery filters by', (design) => {
    expect(CATEGORY_KEYS).toContain(design.category);
  });

  it.each(DESIGNS)('$name defaults to fonts the page actually loads', (design) => {
    expect(Object.keys(FONT_STACKS)).toContain(design.defaults.fontFamily);
    expect(Object.keys(FONT_STACKS)).toContain(design.defaults.headingFont);
  });

  it.each(DESIGNS)('$name defaults to colours written as hex', (design) => {
    for (const key of ['primaryColor', 'backgroundColor', 'textColor']) {
      expect(design.defaults[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  /**
   * The ATS rules from PLAN.md §5. An ATS template that quietly grew a
   * sidebar or a row of pills would still look fine on screen while being
   * worse at the one job it exists to do.
   */
  it.each(DESIGNS.filter((design) => design.category === 'ats'))(
    '$name keeps the ATS rules',
    (design) => {
      expect(design.layout).toBe('single');
      expect(design.photo ?? 'none').toBe('none');
      expect(design.usesPhoto).toBe(false);
      expect(design.isTwoColumn).toBe(false);
      expect(design.skills).toBe('plain');
      expect(design.contact ?? 'inline').toBe('inline');
      expect(design.accent ?? 'none').toBe('none');
    },
  );

  it('describes a sidebar design as two columns, and the rest as one', () => {
    for (const design of DESIGNS) {
      const hasSidebar = design.layout?.startsWith('sidebar');
      expect(design.isTwoColumn).toBe(Boolean(hasSidebar));
    }
  });

  it('says it uses a photo exactly when it draws one', () => {
    for (const design of DESIGNS) {
      expect(design.usesPhoto).toBe((design.photo ?? 'none') !== 'none');
    }
  });

  it('adds every design to the registry the gallery reads', () => {
    const registered = new Set(TEMPLATES.map((template) => template.key));
    for (const design of DESIGNS) {
      expect(registered).toContain(design.key);
    }
  });
});
