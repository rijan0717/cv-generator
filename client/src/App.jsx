import { Routes, Route } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import HealthPage from './pages/HealthPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import DashboardPage from './pages/user/DashboardPage.jsx';
import ProfilePage from './pages/user/ProfilePage.jsx';
import CVEditorPage from './pages/user/CVEditorPage.jsx';
import PrintPage from './pages/print/PrintPage.jsx';

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

        {/* Requires a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cvs/:id" element={<CVEditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
