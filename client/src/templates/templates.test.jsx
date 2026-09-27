import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TEMPLATES, getTemplate } from './index.js';
import { formatDateRange, visibleSections, toHref } from './templateUtils.js';

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
  it('provides the five templates from the requirements', () => {
    expect(TEMPLATES).toHaveLength(5);
    expect(TEMPLATES.map((t) => t.key)).toEqual([
      'classic',
      'modern',
      'minimal',
      'creative',
      'ats',
    ]);
  });

  it('falls back to Classic for an unknown key', () => {
    expect(getTemplate('does-not-exist').key).toBe('classic');
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
