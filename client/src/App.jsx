import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AccountTypeRoute from './routes/AccountTypeRoute.jsx';
import WelcomePage from './pages/user/WelcomePage.jsx';
import AdminRoute from './routes/AdminRoute.jsx';

import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage.jsx';
import AdminCVsPage from './pages/admin/AdminCVsPage.jsx';
import AdminCVDetailPage from './pages/admin/AdminCVDetailPage.jsx';
import AdminActivityPage from './pages/admin/AdminActivityPage.jsx';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage.jsx';

import HomePage from './pages/HomePage.jsx';
import HealthPage from './pages/HealthPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import DashboardPage from './pages/user/DashboardPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import SettingsPage from './pages/user/SettingsPage.jsx';
import CVEditorPage from './pages/user/CVEditorPage.jsx';
import TailorCVPage from './pages/user/TailorCVPage.jsx';
import RewriteWithJDPage from './pages/user/RewriteWithJDPage.jsx';
import PrintPage from './pages/print/PrintPage.jsx';
import JobsPage from './pages/jobs/JobsPage.jsx';
import JobDetailPage from './pages/jobs/JobDetailPage.jsx';
import MatchMyCVPage from './pages/jobs/MatchMyCVPage.jsx';
import SavedJobsPage from './pages/jobs/SavedJobsPage.jsx';
import ApplicationsPage from './pages/jobs/ApplicationsPage.jsx';
import SubmittedCVPage from './pages/jobs/SubmittedCVPage.jsx';
import TalentPage from './pages/talent/TalentPage.jsx';
import TalentDetailPage from './pages/talent/TalentDetailPage.jsx';
import CompanyLayout from './pages/company/CompanyLayout.jsx';
import CompanyProfilePage from './pages/company/CompanyProfilePage.jsx';
import CompanyPostsPage from './pages/company/CompanyPostsPage.jsx';
import JobApplicantsPage from './pages/company/JobApplicantsPage.jsx';

/**
 * The application's route tree.
 *
 * `Layout` is a layout route: everything nested inside it renders into its
 * `<Outlet />`, so the navigation bar and footer are defined once. The admin
 * area is added in Phase 6, behind `AdminRoute`.
 */
export default function App() {
  return (
    <Routes>
      {/*
        The print route sits outside the layout on purpose: Puppeteer must see
        the CV alone, with no navigation bar or footer around it.
      */}
      <Route path="/print/:id" element={<PrintPage />} />

      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/health" element={<HealthPage />} />

        {/* The job board is public: someone should be able to see what is
            on offer before deciding to create an account. */}
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

        {/* Requires a logged-in user */}
        <Route element={<ProtectedRoute />}>
          {/* The one-time "job seeker or employer" step after registering. */}
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Any account type */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Job seekers (and the admin) */}
          <Route element={<AccountTypeRoute allow={['jobseeker']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cvs/:id" element={<CVEditorPage />} />
            {/* Tailoring reads one CV and one advert and writes a new CV;
                it never changes the CV it was started from. */}
            <Route path="/cvs/:id/tailor" element={<TailorCVPage />} />
            {/* The same rewrite, against the primary CV and a pasted advert. */}
            <Route path="/rewrite" element={<RewriteWithJDPage />} />
            {/* Dropping a CV reads a file and scores the whole board, so it
                is behind the session and the job-match rate limit rather
                than open to anyone passing. */}
            <Route path="/match-cv" element={<MatchMyCVPage />} />
            <Route path="/saved-jobs" element={<SavedJobsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            {/* "View CV" opens this in a new tab, so the list keeps its
                page and scroll position while the CV is read. */}
            <Route path="/applications/:id/cv" element={<SubmittedCVPage />} />
          </Route>

          {/* Employers (and the admin). My company is the module; the
              profile and the job posts are sections inside it, and a
              post's applicants hang off a post. */}
          <Route element={<AccountTypeRoute allow={['employer']} />}>
            <Route path="/company" element={<CompanyLayout />}>
              <Route index element={<CompanyProfilePage />} />
              <Route path="posts" element={<CompanyPostsPage />} />
            </Route>
            <Route path="/company/posts/:id/applicants" element={<JobApplicantsPage />} />

            {/* The candidate directory. The route lets every employer in;
                whether they may actually read it depends on their company
                being approved, which only the server can answer, so the
                page itself shows the reason when it cannot. */}
            <Route path="/talent" element={<TalentPage />} />
            <Route path="/talent/:id" element={<TalentDetailPage />} />
          </Route>
        </Route>

        {/* Admin area. AdminRoute sends a non-admin to their own dashboard;
            the server enforces the same rule on every /api/admin route. */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="cvs" element={<AdminCVsPage />} />
            <Route path="cvs/:id" element={<AdminCVDetailPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
