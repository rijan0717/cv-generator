/**
 * Where each kind of account belongs.
 *
 *   - admin                 -> the admin overview
 *   - employer              -> their company
 *   - job seeker            -> My CVs
 *   - no account type yet   -> the one-time "who are you?" step
 *
 * Used after login and registration, by the logo link, and by the route
 * guards to send someone away from a page that is not for their type.
 *
 * @param {object|null} user - The signed-in user from AuthContext.
 * @returns {string} A path.
 */
export function homePathFor(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin';
  if (user.accountType === 'employer') return '/company';
  if (user.accountType === 'jobseeker') return '/dashboard';
  return '/welcome';
}

/**
 * Whether the user still has to choose their account type.
 * @param {object|null} user
 * @returns {boolean}
 */
export function needsAccountType(user) {
  return Boolean(user) && user.role !== 'admin' && !user.accountType;
}
