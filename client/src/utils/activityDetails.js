/**
 * Turns an activity log entry into one sentence an admin can read.
 *
 * The server stores ids in `meta` and resolves them into `entry.refs`
 * (`targetUser`, `company`, `job`) and `entry.cv` (`{ title }`). When the
 * record behind an id has since been deleted, the sentence says so instead
 * of showing the raw id.
 */

/** Template keys are stored in camel case, e.g. "atsFriendly" → "Ats Friendly". */
function templateName(key) {
  if (!key) return '';
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The CV title in quotes, or "" when the entry has no CV. CVs are only soft
 * deleted, so a populated CV is nearly always still there to name.
 */
function cvLabel(entry) {
  return entry.cv?.title ? `"${entry.cv.title}"` : '';
}

/** The job title, from the resolved job first, then the title saved at the time. */
function jobLabel(entry) {
  const title = entry.refs?.job?.title ?? entry.meta?.title ?? entry.meta?.jobTitle;
  return title ? `"${title}"` : 'a job that was later deleted';
}

/**
 * @param {object} entry - An activity log entry from the admin API.
 * @returns {string} A human-readable description, or "—" when there is nothing to say.
 */
export function describeActivity(entry) {
  const meta = entry.meta ?? {};
  const refs = entry.refs ?? {};
  const cv = cvLabel(entry);
  const template = templateName(meta.template);

  switch (entry.action) {
    case 'CV_CREATE':
      return (
        [cv && `Created ${cv}`, template && `${template} template`].filter(Boolean).join(' · ') ||
        '—'
      );

    case 'CV_UPDATE':
      return cv ? `Updated ${cv}` : '—';

    case 'CV_DELETE':
      return cv ? `Deleted ${cv}` : '—';

    case 'CV_IMPORT':
      return cv ? `Imported ${cv}` : '—';

    case 'CV_TAILOR':
      return `Tailored a CV for ${jobLabel(entry)}${cv ? ` → saved as ${cv}` : ''}`;

    case 'DOWNLOAD_PDF':
    case 'DOWNLOAD_DOCX':
    case 'DOWNLOAD_EXCEL':
      return [cv, template && `${template} template`].filter(Boolean).join(' · ') || '—';

    case 'JOB_MATCH':
      if (meta.source === 'upload') {
        return `Ranked an uploaded CV${meta.filename ? ` (${meta.filename})` : ''} against ${meta.jobsRanked ?? 0} jobs`;
      }
      return cv ? `Matched ${cv} against a job` : '—';

    case 'JOB_APPLY':
      return `Applied to ${jobLabel(entry)}${cv ? ` with ${cv}` : ''}`;

    case 'JOB_CREATE':
      return `Posted ${jobLabel(entry)}`;

    case 'JOB_DELETE':
      return `Deleted ${jobLabel(entry)}`;

    case 'COMPANY_CREATE':
      return refs.company
        ? `Created company "${refs.company.name}"`
        : 'Created a company that was later deleted';

    case 'TALENT_VIEW':
      // Names the candidate whose profile was opened. Without the name
      // the entry says only that somebody looked at somebody, which is
      // the one question this record exists to answer.
      return refs.targetUser
        ? `Viewed ${refs.targetUser.name}'s candidate profile`
        : 'Viewed a candidate profile that has since been deleted';

    case 'ADMIN_ACTION': {
      const target = refs.targetUser ? refs.targetUser.email : 'a deleted user';
      if (meta.action === 'USER_STATUS') {
        return `${meta.status === 'blocked' ? 'Blocked' : 'Unblocked'} ${target}`;
      }
      if (meta.action === 'USER_DELETE') return `Deleted user ${target}`;
      if (meta.action === 'CV_DELETE') return `Removed CV ${cv || '(deleted)'}`;
      if (meta.action === 'COMPANY_APPROVE' || meta.action === 'COMPANY_REJECT') {
        const company = refs.company ? `"${refs.company.name}"` : 'a deleted company';
        return meta.action === 'COMPANY_APPROVE'
          ? `Approved company ${company}`
          : `Rejected company ${company}${meta.reason ? `: ${meta.reason}` : ''}`;
      }
      return meta.action ?? '—';
    }

    default:
      return '—';
  }
}
