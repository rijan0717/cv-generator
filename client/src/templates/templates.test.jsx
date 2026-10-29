import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TEMPLATES, CATEGORIES, getTemplate } from './index.js';
import {
  formatDateRange,
  visibleSections,
  toHref,
  buildTemplateVariables,
  FONT_STACKS,
} from './templateUtils.js';
import { SAMPLE_CV, sampleFor } from './sampleCV.js';
// The server's copy of the catalogue, which seeds the admin's template list.
// It has no imports of its own, so the client tests can read it directly.
import { TEMPLATE_CATALOGUE } from '../../../server/src/data/templateCatalogue.js';

/** A CV with something in every section, used to exercise all five templates. */
const sampleCV = {
  templateKey: 'classic',
  title: 'Sample',
  settings: {
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    fontSize: 'medium',
    spacing: 'normal',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages'],
    hiddenSections: [],
  },
  personal: {
    fullName: 'Ada Lovelace',
    headline: 'Software Developer',
    email: 'ada@example.com',
    phone: '01234 567890',
    address: 'Kathmandu',
    website: 'example.com',
    linkedin: '',
    github: '',
    photoUrl: '',
  },
  summary: 'Developer with an interest in analytical engines.',
  experience: [
    {
      _id: 'e1',
      company: 'Analytical Engines Ltd',
      position: 'Developer',
      location: 'London',
      startDate: '2023-01',
      endDate: '',
      isCurrent: true,
      description: 'Built things.',
      achievements: ['Reduced runtime by 40%'],
    },
  ],
  education: [
    {
      _id: 'ed1',
      institution: 'Tribhuvan University',
      degree: 'BCA',
      fieldOfStudy: 'Computer Application',
      startDate: '2021-09',
      endDate: '2025-06',
      grade: 'First',
      description: '',
    },
  ],
  skills: [{ _id: 's1', name: 'JavaScript', level: 'Advanced' }],
  projects: [
    {
      _id: 'p1',
      name: 'CV Generator',
      role: 'Developer',
      description: 'This project.',
      technologies: ['React'],
      link: 'example.com/cv',
    },
  ],
  certifications: [],
  languages: [{ _id: 'l1', language: 'English', proficiency: 'Fluent' }],
  references: [],
  referencesOnRequest: true,
};

describe('template registry', () => {
  it('still provides the five templates the requirements name', () => {
    // Later templates are appended, so this checks the required five are
    // present and in order rather than that they are the only ones.
    expect(TEMPLATES.map((t) => t.key).slice(0, 5)).toEqual([
      'classic',
      'modern',
      'minimal',
      'creative',
      'ats',
    ]);
  });

  it('gives every template a unique key', () => {
    // A duplicate key would make getTemplate() silently return the wrong
    // component for every CV that stored it.
    const keys = TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names and describes every template', () => {
    for (const template of TEMPLATES) {
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
    }
  });

  it('falls back to Classic for an unknown key', () => {
    expect(getTemplate('does-not-exist').key).toBe('classic');
  });

  it('puts every template in a known gallery category', () => {
    // A template with a misspelt category would appear under "All" and
    // under no chip, and nobody filtering would ever find it.
    const categories = new Set(CATEGORIES.map((c) => c.key));
    for (const template of TEMPLATES) {
      expect(categories.has(template.category), template.key).toBe(true);
      expect(typeof template.isTwoColumn).toBe('boolean');
    }
  });

  it('matches the server catalogue key for key', () => {
    // The two lists are kept by hand in two packages. A key on the client
    // only can never be switched off by the admin; a key on the server
    // only is an option that renders as Classic.
    expect(TEMPLATES.map((t) => t.key)).toEqual(TEMPLATE_CATALOGUE.map((t) => t.key));
  });
});

describe('heading font', () => {
  it('falls back to the body font when none is chosen', () => {
    const vars = buildTemplateVariables({ fontFamily: 'Lora', headingFont: '' });
    expect(vars['--cv-heading-font']).toBe(FONT_STACKS.Lora);
  });

  it('uses its own font when one is chosen', () => {
    const vars = buildTemplateVariables({ fontFamily: 'Inter', headingFont: 'Oswald' });
    expect(vars['--cv-heading-font']).toBe(FONT_STACKS.Oswald);
    expect(vars['--cv-font']).toBe(FONT_STACKS.Inter);
  });
});

describe('the gallery sample CV', () => {
  it('has content in every section, so no thumbnail looks empty', () => {
    expect(visibleSections(SAMPLE_CV)).toEqual(SAMPLE_CV.settings.sectionOrder);
  });

  it("borrows a CV's styling but never its hidden sections", () => {
    const cv = sampleFor('modern', {
      primaryColor: '#881337',
      hiddenSections: ['skills', 'projects'],
      sectionOrder: ['summary'],
    });

    expect(cv.templateKey).toBe('modern');
    expect(cv.settings.primaryColor).toBe('#881337');
    expect(visibleSections(cv)).toContain('skills');
    expect(visibleSections(cv)).toContain('projects');
  });
});

describe.each(TEMPLATES)('$name template', ({ Component }) => {
  it('renders the name and headline', () => {
    render(<Component cv={sampleCV} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada Lovelace');
    expect(screen.getByText('Software Developer')).toBeInTheDocument();
  });

  it('renders content from every populated section', () => {
    // The rendered text is checked as a whole, because the same words appear
    // in more than one place (the summary and the company name both mention
    // analytical engines) and each template arranges them differently.
    const { container } = render(<Component cv={sampleCV} />);
    const text = container.textContent;

    expect(text).toContain('Developer with an interest in analytical engines.');
    expect(text).toContain('Analytical Engines Ltd');
    expect(text).toContain('Reduced runtime by 40%');
    expect(text).toContain('Tribhuvan University');
    expect(text).toContain('JavaScript');
    expect(text).toContain('CV Generator');
    expect(text).toContain('English');
  });

  it('leaves out sections with no content', () => {
    render(<Component cv={sampleCV} />);

    // Certifications is empty, so its heading must not appear.
    expect(screen.queryByText('Certifications')).not.toBeInTheDocument();
  });

  it('respects a hidden section', () => {
    const hidden = {
      ...sampleCV,
      settings: { ...sampleCV.settings, hiddenSections: ['skills'] },
    };
    render(<Component cv={hidden} />);

    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });

  it('falls back to a placeholder when no name is set', () => {
    const blank = { ...sampleCV, personal: { ...sampleCV.personal, fullName: '' } };
    render(<Component cv={blank} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Name');
  });
});

describe('the ATS template is built for machines', () => {
  const atsTemplate = TEMPLATES.find((t) => t.key === 'ats');

  it('renders skills as plain text rather than pills', () => {
    const { container } = render(<atsTemplate.Component cv={sampleCV} />);
    expect(container.querySelector('.cv-pill')).toBeNull();
  });

  it('renders no images', () => {
    const withPhoto = {
      ...sampleCV,
      personal: { ...sampleCV.personal, photoUrl: '/uploads/photo.png' },
    };
    const { container } = render(<atsTemplate.Component cv={withPhoto} />);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('templateUtils', () => {
  it('formats an ongoing role as Present', () => {
    expect(formatDateRange('2023-01', '', true)).toMatch(/Present$/);
  });

  it('formats a closed date range', () => {
    expect(formatDateRange('2021-09', '2025-06')).toBe('Sept 2021 – Jun 2025');
  });

  it('returns nothing when there are no dates', () => {
    expect(formatDateRange('', '')).toBe('');
  });

  it('orders sections as the settings ask', () => {
    const reordered = {
      ...sampleCV,
      settings: { ...sampleCV.settings, sectionOrder: ['skills', 'summary'] },
    };
    expect(visibleSections(reordered)).toEqual(['skills', 'summary']);
  });

  // A pasted javascript: URL must never become a clickable link.
  it('rejects a non-http URL', () => {
    expect(toHref('javascript:alert(1)')).toBeNull();
  });

  it('adds https to a bare domain', () => {
    expect(toHref('example.com')).toBe('https://example.com/');
  });
});
