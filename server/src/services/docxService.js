/**
 * Builds a Word (.docx) version of a CV.
 *
 * A Word file is not a rendering of the template: it is a re-expression of
 * the same content as a flowing, editable document. That is deliberate.
 * Someone who downloads .docx wants to keep editing it, and a pixel-faithful
 * copy of a two-column design would be painful to edit and would not reflow.
 * Anyone who wants the design exactly as previewed downloads the PDF.
 *
 * The `docx` library writes the OOXML; the structure and content below are
 * ours.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';
import { formatDateRange } from '../utils/dateFormat.js';

/** Section headings, matching those used in the templates. */
const SECTION_LABELS = {
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  references: 'References',
};

/**
 * Builds a section heading with a rule underneath it.
 * @param {string} text - The heading text.
 * @returns {Paragraph}
 */
function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 90 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
    },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22 })],
  });
}

/**
 * Builds a line with a bold left part and a grey right part, used for the
 * "Job title ............ Jan 2023 – Present" rows.
 * @param {string} left - The main text.
 * @param {string} right - The date range.
 * @returns {Paragraph}
 */
function entryHeading(left, right) {
  const children = [new TextRun({ text: left, bold: true })];

  if (right) {
    children.push(new TextRun({ text: `\t${right}`, color: '666666' }));
  }

  return new Paragraph({
    spacing: { before: 140, after: 20 },
    tabStops: [{ type: 'right', position: 9000 }],
    children,
  });
}

/**
 * A grey sub-line, e.g. the employer and location.
 * @param {string} text - The line.
 * @returns {Paragraph}
 */
function subLine(text) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, color: '555555', italics: true })],
  });
}

/**
 * An ordinary paragraph of body text.
 * @param {string} text - The text.
 * @returns {Paragraph}
 */
function body(text) {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun(text)] });
}

/**
 * A bulleted line.
 * @param {string} text - The text.
 * @returns {Paragraph}
 */
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 30 } });
}

/**
 * Builds the paragraphs for one section.
 * @param {object} cv - The CV document.
 * @param {string} key - The section key.
 * @returns {Paragraph[]}
 */
function buildSection(cv, key) {
  switch (key) {
    case 'summary':
      return [body(cv.summary)];

    case 'experience':
      return cv.experience.flatMap((entry) => [
        entryHeading(
          entry.position || entry.company,
          formatDateRange(entry.startDate, entry.endDate, entry.isCurrent),
        ),
        ...(entry.company || entry.location
          ? [subLine([entry.company, entry.location].filter(Boolean).join(' • '))]
          : []),
        ...(entry.description ? [body(entry.description)] : []),
        ...entry.achievements.filter(Boolean).map(bullet),
      ]);

    case 'education':
      return cv.education.flatMap((entry) => [
        entryHeading(
          [entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ') || entry.institution,
          formatDateRange(entry.startDate, entry.endDate),
        ),
        ...(entry.institution ? [subLine(entry.institution)] : []),
        ...(entry.grade ? [body(`Grade: ${entry.grade}`)] : []),
        ...(entry.description ? [body(entry.description)] : []),
      ]);

    case 'skills': {
      const names = cv.skills.filter((s) => s.name?.trim()).map((s) => s.name);
      return names.length > 0 ? [body(names.join(', '))] : [];
    }

    case 'projects':
      return cv.projects.flatMap((entry) => [
        entryHeading(entry.name, ''),
        ...(entry.role ? [subLine(entry.role)] : []),
        ...(entry.description ? [body(entry.description)] : []),
        ...(entry.technologies?.length ? [subLine(entry.technologies.join(', '))] : []),
        ...(entry.link ? [linkParagraph(entry.link)] : []),
      ]);

    case 'certifications':
      return cv.certifications.flatMap((entry) => [
        entryHeading(entry.name, entry.date ?? ''),
        ...(entry.issuer ? [subLine(entry.issuer)] : []),
        ...(entry.credentialLink ? [linkParagraph(entry.credentialLink)] : []),
      ]);

    case 'languages':
      return cv.languages
        .filter((l) => l.language?.trim())
        .map((l) => body(l.proficiency ? `${l.language} — ${l.proficiency}` : l.language));

    case 'references':
      return cv.referencesOnRequest
        ? [body('Available on request.')]
        : cv.references.flatMap((reference) => [
            entryHeading(reference.name, ''),
            ...(reference.position || reference.company
              ? [subLine([reference.position, reference.company].filter(Boolean).join(', '))]
              : []),
            ...(reference.email || reference.phone
              ? [body([reference.email, reference.phone].filter(Boolean).join(' • '))]
              : []),
          ]);

    default:
      return [];
  }
}

/**
 * A clickable link paragraph.
 * @param {string} url - The raw URL.
 * @returns {Paragraph}
 */
function linkParagraph(url) {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new ExternalHyperlink({
        link: href,
        children: [new TextRun({ text: url, style: 'Hyperlink' })],
      }),
    ],
  });
}

/**
 * Reports whether a section has anything to print, so an empty heading is
 * never written. This mirrors the same rule in the templates.
 * @param {object} cv - The CV document.
 * @param {string} key - The section key.
 * @returns {boolean}
 */
function hasContent(cv, key) {
  if (key === 'summary') return Boolean(cv.summary?.trim());
  if (key === 'references') return cv.referencesOnRequest || cv.references.length > 0;
  return (cv[key]?.length ?? 0) > 0;
}

/**
 * Generates the .docx file for a CV.
 *
 * @param {object} cv - The CV document.
 * @returns {Promise<Buffer>} The Word file.
 */
export async function generateDocx(cv) {
  const order = cv.settings?.sectionOrder?.length
    ? cv.settings.sectionOrder
    : Object.keys(SECTION_LABELS);

  const hidden = new Set(cv.settings?.hiddenSections ?? []);

  const contactLine = [
    cv.personal.email,
    cv.personal.phone,
    cv.personal.address,
    cv.personal.website,
    cv.personal.linkedin,
    cv.personal.github,
  ]
    .filter((value) => value?.trim())
    .join('  •  ');

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: cv.personal.fullName || 'Your Name', bold: true, size: 40 })],
    }),

    ...(cv.personal.headline
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: cv.personal.headline, size: 24, color: '555555' })],
          }),
        ]
      : []),

    ...(contactLine
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: contactLine, size: 18, color: '666666' })],
          }),
        ]
      : []),
  ];

  for (const key of order) {
    if (hidden.has(key) || !hasContent(cv, key)) continue;
    children.push(heading(SECTION_LABELS[key] ?? key), ...buildSection(cv, key));
  }

  const document = new Document({
    creator: 'Smart CV Generator',
    title: cv.title,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 21 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // A4 with 2 cm margins, expressed in twentieths of a point.
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
