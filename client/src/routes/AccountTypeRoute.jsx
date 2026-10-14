import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { homePathFor } from '../utils/homePath.js';

/**
 * Lets through only the account types a group of pages is for. Admins
 * always pass, because the admin can see everything. Anyone else is sent
 * to their own home page rather than shown a page they cannot use.
 *
 * Sits inside ProtectedRoute, so the user is known and signed in here.
 *
 * @param {{allow: Array<'jobseeker'|'employer'>}} props
 */
export default function AccountTypeRoute({ allow }) {
  const { user } = useAuth();

  if (user.role === 'admin' || allow.includes(user.accountType)) return <Outlet />;
  return <Navigate to={homePathFor(user)} replace />;
}
