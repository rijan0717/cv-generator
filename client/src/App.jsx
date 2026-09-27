import { Routes, Route } from 'react-router-dom';
import HealthPage from './pages/HealthPage.jsx';

/**
 * Root component. For Phase 0 it only renders the health-check page; the real
 * route tree (auth, user and admin areas) is added in later phases.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
    </Routes>
  );
}
