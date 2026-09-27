/**
 * Builds an Excel (.xlsx) version of a CV.
 *
 * One worksheet per section, as specified. Excel is the right format when
 * someone wants to sort, filter or copy the content — for example pasting a
 * list of roles into an application form — rather than read a laid-out
 * document.
 */
import ExcelJS from 'exceljs';
import { formatMonth, formatDateRange } from '../utils/dateFormat.js';

/** Fill used for every header row. */
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

/**
 * Adds a worksheet with a formatted header row and sensible column widths.
 *
 * @param {ExcelJS.Workbook} workbook - The workbook to add to.
 * @param {string} name - The sheet name.
 * @param {Array<{header: string, key: string, width: number}>} columns
 * @param {Array<object>} rows - The data rows.
 * @returns {ExcelJS.Worksheet}
 */
function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = HEADER_FILL;
  headerRow.height = 20;
  headerRow.alignment = { vertical: 'middle' };

  rows.forEach((row) => sheet.addRow(row));

  // Wrap the long free-text columns so a description does not run off the
  // page when the file is printed.
  sheet.columns.forEach((column) => {
    if (column.width >= 40) {
      column.alignment = { wrapText: true, vertical: 'top' };
    }
  });

  // Freeze the header so it stays visible when scrolling a long sheet.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return sheet;
}

/**
 * Generates the .xlsx file for a CV.
 *
 * @param {object} cv - The CV document.
 * @returns {Promise<Buffer>} The Excel file.
 */
export async function generateExcel(cv) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart CV Generator';
  workbook.created = new Date();

  // Personal: laid out as field/value pairs rather than as a wide table,
  // because it is a single record.
  addSheet(
    workbook,
    'Personal',
    [
      { header: 'Field', key: 'field', width: 22 },
      { header: 'Value', key: 'value', width: 50 },
    ],
    [
      { field: 'CV title', value: cv.title },
      { field: 'Full name', value: cv.personal.fullName },
      { field: 'Headline', value: cv.personal.headline },
      { field: 'Email', value: cv.personal.email },
      { field: 'Phone', value: cv.personal.phone },
      { field: 'Address', value: cv.personal.address },
      { field: 'Website', value: cv.personal.website },
      { field: 'LinkedIn', value: cv.personal.linkedin },
      { field: 'GitHub', value: cv.personal.github },
      { field: 'Summary', value: cv.summary },
    ].filter((row) => row.value),
  );

  addSheet(
    workbook,
    'Education',
    [
      { header: 'Institution', key: 'institution', width: 30 },
      { header: 'Degree', key: 'degree', width: 18 },
      { header: 'Field of study', key: 'fieldOfStudy', width: 25 },
      { header: 'Start', key: 'start', width: 12 },
      { header: 'End', key: 'end', width: 12 },
      { header: 'Grade', key: 'grade', width: 12 },
      { header: 'Description', key: 'description', width: 45 },
    ],
    cv.education.map((entry) => ({
      institution: entry.institution,
      degree: entry.degree,
      fieldOfStudy: entry.fieldOfStudy,
      start: formatMonth(entry.startDate),
      end: formatMonth(entry.endDate),
      grade: entry.grade,
      description: entry.description,
    })),
  );

  addSheet(
    workbook,
    'Experience',
    [
      { header: 'Position', key: 'position', width: 28 },
      { header: 'Company', key: 'company', width: 28 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Period', key: 'period', width: 24 },
      { header: 'Description', key: 'description', width: 45 },
      { header: 'Achievements', key: 'achievements', width: 45 },
    ],
    cv.experience.map((entry) => ({
      position: entry.position,
      company: entry.company,
      location: entry.location,
      period: formatDateRange(entry.startDate, entry.endDate, entry.isCurrent),
      description: entry.description,
      achievements: entry.achievements.filter(Boolean).join('\n'),
    })),
  );

  addSheet(
    workbook,
    'Skills',
    [
      { header: 'Skill', key: 'name', width: 30 },
      { header: 'Level', key: 'level', width: 18 },
    ],
    cv.skills.map((skill) => ({ name: skill.name, level: skill.level })),
  );

  addSheet(
    workbook,
    'Projects',
    [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Technologies', key: 'technologies', width: 30 },
      { header: 'Link', key: 'link', width: 32 },
      { header: 'Description', key: 'description', width: 45 },
    ],
    cv.projects.map((entry) => ({
      name: entry.name,
      role: entry.role,
      technologies: (entry.technologies ?? []).join(', '),
      link: entry.link,
      description: entry.description,
    })),
  );

  addSheet(
    workbook,
    'Certifications',
    [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Issuer', key: 'issuer', width: 28 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Credential link', key: 'credentialLink', width: 36 },
    ],
    cv.certifications.map((entry) => ({
      name: entry.name,
      issuer: entry.issuer,
      date: formatMonth(entry.date),
      credentialLink: entry.credentialLink,
    })),
  );

  addSheet(
    workbook,
    'Languages',
    [
      { header: 'Language', key: 'language', width: 24 },
      { header: 'Proficiency', key: 'proficiency', width: 24 },
    ],
    cv.languages.map((entry) => ({
      language: entry.language,
      proficiency: entry.proficiency,
    })),
  );

  // exceljs returns an ArrayBuffer-like value; Buffer.from normalises it for
  // res.send().
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
