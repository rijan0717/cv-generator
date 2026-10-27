/**
 * The reason to show an employer whose company is not approved, worded
 * exactly as the server words it when it refuses a request.
 *
 * It lives here rather than beside `ApprovalNotice` so that file exports
 * only its component, which is what keeps fast refresh working.
 *
 * @param {object|null} company - The employer's company, if they have one.
 * @returns {string} The sentence for the notice.
 */
export function approvalMessageFor(company) {
  if (!company) return 'Set up your company before using this page.';

  if (company.status === 'rejected') {
    return company.rejectionReason
      ? `Your company was not approved: “${company.rejectionReason}”. Update it and resubmit.`
      : 'Your company was not approved. Update it and resubmit.';
  }

  return 'Your company is waiting for admin approval.';
}
