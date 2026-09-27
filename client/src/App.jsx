import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminRoute from './routes/AdminRoute.jsx';

import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage.jsx';
import AdminCVsPage from './pages/admin/AdminCVsPage.jsx';
import AdminCVDetailPage from './pages/admin/AdminCVDetailPage.jsx';
import AdminActivityPage from './pages/admin/AdminActivityPage.jsx';

import HomePage from './pages/HomePage.jsx';
import HealthPage from './pages/HealthPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import DashboardPage from './pages/user/DashboardPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import SettingsPage from './pages/user/SettingsPage.jsx';
import CVEditorPage from './pages/user/CVEditorPage.jsx';
import PrintPage from './pages/print/PrintPage.jsx';
import JobsPage from './pages/jobs/JobsPage.jsx';
import JobDetailPage from './pages/jobs/JobDetailPage.jsx';
import SavedJobsPage from './pages/jobs/SavedJobsPage.jsx';
import ApplicationsPage from './pages/jobs/ApplicationsPage.jsx';
import CompanyPage from './pages/company/CompanyPage.jsx';
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cvs/:id" element={<CVEditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/saved-jobs" element={<SavedJobsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/company/jobs/:id/applicants" element={<JobApplicantsPage />} />
        </Route>

        {/* Admin area. AdminRoute sends a non-admin to their own dashboard;
            the server enforces the same rule on every /api/admin route. */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
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
