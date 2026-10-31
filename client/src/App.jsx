import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AccountTypeRoute from './routes/AccountTypeRoute.jsx';
import WelcomePage from './pages/user/WelcomePage.jsx';
import AdminRoute from './routes/AdminRoute.jsx';
import HomeRoute from './routes/HomeRoute.jsx';

import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage.jsx';
import AdminCVsPage from './pages/admin/AdminCVsPage.jsx';
import AdminCVDetailPage from './pages/admin/AdminCVDetailPage.jsx';
import AdminActivityPage from './pages/admin/AdminActivityPage.jsx';
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx';
import AdminTemplatesPage from './pages/admin/AdminTemplatesPage.jsx';
import AdminInterviewPage from './pages/admin/AdminInterviewPage.jsx';
import InterviewSearchPage from './pages/interview/InterviewSearchPage.jsx';
import InterviewPositionPage from './pages/interview/InterviewPositionPage.jsx';
import InterviewExamPage from './pages/interview/InterviewExamPage.jsx';
import AdminInterviewPositionPage from './pages/admin/AdminInterviewPositionPage.jsx';
import AdminContentPage from './pages/admin/AdminContentPage.jsx';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage.jsx';

import HealthPage from './pages/HealthPage.jsx';
import BlogListPage from './pages/content/BlogListPage.jsx';
import ContentPage from './pages/content/ContentPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import SeekerDashboardPage from './pages/user/SeekerDashboardPage.jsx';
import DashboardPage from './pages/user/DashboardPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import SettingsPage from './pages/user/SettingsPage.jsx';
import CVEditorPage from './pages/user/CVEditorPage.jsx';
import TemplatesPage from './pages/user/TemplatesPage.jsx';
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
import CompanyOverviewPage from './pages/company/CompanyOverviewPage.jsx';
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
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/health" element={<HealthPage />} />

        {/* The job board is public: someone should be able to see what is
            on offer before deciding to create an account. */}
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

        {/* The blog and the admin's pages, public for the same reason
            the board is. Pages sit under /p/ so an admin's slug can
            never collide with a route the application already owns. */}
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<ContentPage kind="post" />} />
        <Route path="/p/:slug" element={<ContentPage kind="page" />} />

        {/* Requires a logged-in user */}
        <Route element={<ProtectedRoute />}>
          {/* The one-time "job seeker or employer" step after registering. */}
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Any account type */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Interview preparation. Open to any signed-in account: an
              employer preparing to *ask* these questions is as valid a
              use as a candidate preparing to answer them. */}
          <Route path="/interview" element={<InterviewSearchPage />} />
          <Route path="/interview/exam/:id" element={<InterviewExamPage />} />
          <Route path="/interview/:slug" element={<InterviewPositionPage />} />

          {/* Job seekers (and the admin) */}
          <Route element={<AccountTypeRoute allow={['jobseeker']} />}>
            {/* The landing page is a summary; the CV list is a page of
                its own, so neither has to be both. */}
            <Route path="/dashboard" element={<SeekerDashboardPage />} />
            <Route path="/cvs" element={<DashboardPage />} />
            <Route path="/cvs/:id" element={<CVEditorPage />} />
            {/* The gallery, to start a new CV from a template. */}
            <Route path="/templates" element={<TemplatesPage />} />
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
              {/* The dashboard is the landing page; the profile form is
                  a section beside the posts rather than the front door. */}
              <Route index element={<CompanyOverviewPage />} />
              <Route path="profile" element={<CompanyProfilePage />} />
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
            <Route path="templates" element={<AdminTemplatesPage />} />
            <Route path="interview" element={<AdminInterviewPage />} />
            <Route path="interview/:id" element={<AdminInterviewPositionPage />} />
            <Route path="blog" element={<AdminContentPage type="post" />} />
            <Route path="pages" element={<AdminContentPage type="page" />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
